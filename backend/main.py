from dotenv import load_dotenv
load_dotenv()

import os
import json
import uuid
from typing import Optional, List
from urllib.parse import urlparse, urlencode
from datetime import datetime, timedelta

import requests
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
import ibm_boto3
from ibm_botocore.client import Config
from jose import JWTError, jwt

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

# --- Environment Variables ---
GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET')
# The hostname of your GitHub provider. Use "github.com" for public GitHub or your Enterprise hostname
GITHUB_HOSTNAME = os.getenv('GITHUB_HOSTNAME', 'github.com').strip()

# Derived bases for OAuth and API depending on GitHub.com vs Enterprise
GITHUB_OAUTH_BASE_URL = f"https://{GITHUB_HOSTNAME}"
GITHUB_API_BASE_URL = (
    f"https://{GITHUB_HOSTNAME}/api/v3" if GITHUB_HOSTNAME != "github.com" else "https://api.github.com"
)

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- IBM COS Configuration ---
COS_ENDPOINT = os.getenv('COS_ENDPOINT')
COS_API_KEY_ID = os.getenv('COS_API_KEY_ID')
COS_AUTH_ENDPOINT = os.getenv('COS_AUTH_ENDPOINT')
COS_SERVICE_INSTANCE_ID = os.getenv('COS_SERVICE_INSTANCE_ID')
COS_BUCKET_NAME = os.getenv('COS_BUCKET_NAME')

# Initialize IBM COS client
cos_client = None
if all([COS_ENDPOINT, COS_API_KEY_ID, COS_AUTH_ENDPOINT, COS_SERVICE_INSTANCE_ID, COS_BUCKET_NAME]):
    cos_client = ibm_boto3.client(
        "s3",
        ibm_api_key_id=COS_API_KEY_ID,
        ibm_service_instance_id=COS_SERVICE_INSTANCE_ID,
        config=Config(signature_version="oauth"),
        endpoint_url=COS_ENDPOINT
    )

# --- 1. Pydantic Models for API Requests & Responses ---

class FullIssueDraft(BaseModel):
    """The structured draft of a Git issue. This is our main data object."""
    repo_url: str = Field(..., description="The URL of the single best repository for the issue.")
    assignee_username: Optional[str] = Field(default=None, description="The official GitHub username of the person mentioned.")
    title: str = Field(..., description="A concise, descriptive title for the issue.")
    body: str = Field(..., description="A detailed, Markdown-formatted body for the issue.")

class InitialRequest(BaseModel):
    """The request body for creating the first draft."""
    user_request: str

class RefineRequest(BaseModel):
    """The request body for refining an existing draft."""
    original_request: str
    current_draft: FullIssueDraft  # The client sends the current draft back
    modification_request: str

class Repository(BaseModel):
    url : str
    description: str

class Assignee(BaseModel):
    displayName: str
    githubUsername: str

class IssueCreationResponse(BaseModel):
    status: bool
    issue_url: Optional[str]
    error_message: Optional[str]

class FileUploadResponse(BaseModel):
    success: bool
    file_url: Optional[str]
    error_message: Optional[str]

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class UserInfo(BaseModel):
    id: int
    login: str
    name: Optional[str]
    email: Optional[str]
    avatar_url: str

# --- 2. Authentication Functions ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(request: Request):
    """Authenticate via httpOnly cookie or Authorization: Bearer header."""
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to Authorization header for extension flows
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload

# --- 3. The Stateless Issue Drafting Service ---

with open("./repos.json", "r", encoding="utf-8") as f:
    repo_list = json.load(f)

with open("./assignees.json", "r", encoding="utf-8") as g:
    valid_assignees = json.load(g)

class IssueService:
    def __init__(self):
        # This setup runs once when the FastAPI app starts
        llm = ChatOpenAI(model="gpt-4o", temperature=0)
        self.structured_llm = llm.with_structured_output(FullIssueDraft)

        # Prompt for the initial draft
        self.initial_prompt = PromptTemplate.from_template(
            """You are an expert engineering assistant. Your task is to convert a user's raw text into a complete, structured Git issue draft. Please do not add information that is not provided by the user, it is okay of the git issue is not very descriptive. 
            Analyze the user's request and fill in all fields.

            **Context - Repositories:** {valid_repos}
            **Context - Valid Assignees:** {valid_assignees}
            **User's Raw Request:** "{user_issue}"
            """
        )

        # Prompt for refining an existing draft
        self.refinement_prompt = PromptTemplate.from_template(
            """You are an AI assistant helping a user refine a Git issue draft.
            Your task is to modify the 'Current Draft' based on the 'User's Modification Request'.
            You must return a complete, updated draft in the exact same structured format. Please do not add any information that has not been explicitly provided by the user

            **Original User Request (for context):** {original_user_request}
            **Current Draft (in JSON format):** {current_draft_json}
            **User's Modification Request:** "{user_modification_request}"
            """
        )

        # Static context data
        self.valid_repos_str = "\n".join([f"- {repo['url']}: {repo['description']}" for repo in repo_list])
        self.valid_assignees_str = "\n".join([f"- {user['displayName']} ({user['githubUsername']})" for user in valid_assignees])

    def generate_initial_draft(self, user_request: str) -> FullIssueDraft:
        """Generates the first draft from a user request."""
        chain = self.initial_prompt | self.structured_llm
        return chain.invoke({
            "user_issue": user_request,
            "valid_repos": self.valid_repos_str,
            "valid_assignees": self.valid_assignees_str
        })

    def refine_existing_draft(self, original_request: str, current_draft: FullIssueDraft, modification_request: str) -> FullIssueDraft:
        """Refines a draft based on a modification request."""
        chain = self.refinement_prompt | self.structured_llm
        return chain.invoke({
            "original_user_request": original_request,
            "current_draft_json": current_draft.json(),
            "user_modification_request": modification_request
        })

# --- 4. The FastAPI Application ---

app = FastAPI(
    title="Git Issue Drafting API",
    description="An API to generate and refine Git issues using an LLM with GitHub OAuth authentication.",
)

origins = [
    "http://localhost",
    "http://localhost:5173",
    # Add your frontend's production domain here
    # "https://your-frontend-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allows cookies to be included in cross-origin requests
    allow_methods=["*"],    # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],    # Allows all headers
)

# Instantiate our service once at startup
issue_service = IssueService()

@app.get("/", tags=["Status"])
def read_root():
    """A simple endpoint to check if the API is running."""
    return {"status": "ok", "message": "Welcome to the Git Issue Drafting API!"}

# --- OAuth Endpoints ---

@app.get("/auth/github", tags=["Authentication"])
def github_login(response: Response):
    """Return GitHub OAuth authorization URL; frontend will handle redirect."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    state = str(uuid.uuid4())
    # Store state in a short-lived cookie for CSRF protection
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=False,  # True in production with HTTPS
        samesite="lax",
        max_age=10 * 60,
    )

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": "http://localhost:8000/auth/github/callback",
        "scope": "repo issues",
        "state": state
    }
    
    github_auth_url = f"{GITHUB_OAUTH_BASE_URL}/login/oauth/authorize?{urlencode(params)}"
    return {"authorization_url": github_auth_url}

@app.get("/auth/extension/authorize", tags=["Authentication"])
def extension_authorize(redirect_uri: str, state: str):
    """Return authorization URL for Chrome extension flow (no cookies)."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "repo issues",
        "state": state,
    }
    github_auth_url = f"{GITHUB_OAUTH_BASE_URL}/login/oauth/authorize?{urlencode(params)}"
    return {"authorization_url": github_auth_url}

class ExchangeCodeRequest(BaseModel):
    code: str

class ExchangeCodeResponse(BaseModel):
    jwt_token: str
    user: UserInfo

@app.post("/auth/extension/exchange-code", response_model=ExchangeCodeResponse, tags=["Authentication"])
def extension_exchange_code(payload: ExchangeCodeRequest):
    """Exchange OAuth code for access token for extension; return JWT to be used as Bearer."""
    if not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

    token_url = f"{GITHUB_OAUTH_BASE_URL}/login/oauth/access_token"
    token_data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": payload.code,
        "redirect_uri": payload.redirect_uri,
    }
    headers = {"Accept": "application/json"}

    try:
        resp = requests.post(token_url, data=token_data, headers=headers)
        resp.raise_for_status()
        token_response = resp.json()
        if "error" in token_response:
            raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {token_response['error']}")

        access_token = token_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received from GitHub")

        user_resp = requests.get(
            f"{GITHUB_API_BASE_URL}/user",
            headers={"Authorization": f"token {access_token}"}
        )
        user_resp.raise_for_status()
        user_data = user_resp.json()

        token_payload = {
            "sub": str(user_data["id"]),
            "username": user_data["login"],
            "github_token": access_token,
            "github_hostname": GITHUB_HOSTNAME,
        }
        jwt_token = create_access_token(token_payload, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

        return ExchangeCodeResponse(
            jwt_token=jwt_token,
            user=UserInfo(
                id=user_data["id"], login=user_data["login"], name=user_data.get("name"),
                email=user_data.get("email"), avatar_url=user_data["avatar_url"]
            ),
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error exchanging code for token: {str(e)}")

@app.get("/auth/github/callback", tags=["Authentication"])
async def github_callback(request: Request, code: str, state: str):
    """Handle GitHub OAuth callback and exchange code for access token."""
    if not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

    # Validate state
    expected_state = request.cookies.get("oauth_state")
    if not expected_state or expected_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    
    # Exchange code for access token
    token_url = f"{GITHUB_OAUTH_BASE_URL}/login/oauth/access_token"
    token_data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code
    }
    
    headers = {"Accept": "application/json"}
    
    try:
        response = requests.post(token_url, data=token_data, headers=headers)
        response.raise_for_status()
        token_response = response.json()
        
        if "error" in token_response:
            raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {token_response['error']}")
        
        access_token = token_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received from GitHub")
        
        # Get user info from GitHub
        user_response = requests.get(
            f"{GITHUB_API_BASE_URL}/user",
            headers={"Authorization": f"token {access_token}"}
        )
        user_response.raise_for_status()
        user_data = user_response.json()
        
        # Create JWT token
        token_data = {
            "sub": str(user_data["id"]),
            "username": user_data["login"],
            "github_token": access_token,
            "github_hostname": GITHUB_HOSTNAME,
        }
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(token_data, expires_delta=access_token_expires)
        
        # Redirect to frontend with token in cookie
        redirect = RedirectResponse(url="http://localhost:5173")
        redirect.set_cookie(
            key="access_token",
            value=jwt_token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        # Clear oauth_state cookie
        redirect.delete_cookie("oauth_state")
        
        return redirect
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error exchanging code for token: {str(e)}")

@app.get("/auth/logout", tags=["Authentication"])
async def logout():
    """Logout by clearing the access token cookie."""
    response = RedirectResponse(url="http://localhost:5173")
    response.delete_cookie("access_token")
    response.delete_cookie("oauth_state")
    return response

@app.get("/auth/me", response_model=UserInfo, tags=["Authentication"])
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    # Get fresh user info from GitHub using the stored token
    github_token = current_user.get("github_token")
    if not github_token:
        raise HTTPException(status_code=401, detail="No GitHub token found")
    
    try:
        response = requests.get(
            f"{GITHUB_API_BASE_URL}/user",
            headers={"Authorization": f"token {github_token}"}
        )
        response.raise_for_status()
        user_data = response.json()
        
        return UserInfo(
            id=user_data["id"],
            login=user_data["login"],
            name=user_data.get("name"),
            email=user_data.get("email"),
            avatar_url=user_data["avatar_url"]
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user info: {str(e)}")

# --- Protected API Endpoints ---

@app.post("/drafts", response_model=FullIssueDraft, tags=["Drafting"])
def create_draft(request: InitialRequest, current_user: dict = Depends(get_current_user)):
    """
    Creates the first draft of an issue from a user's raw text description.
    """
    return issue_service.generate_initial_draft(request.user_request)

@app.post("/refine-draft", response_model=FullIssueDraft, tags=["Drafting"])
def refine_draft(request: RefineRequest, current_user: dict = Depends(get_current_user)):
    """
    Refines an existing draft based on a modification instruction.
    The client must send the original request and the full current draft back.
    """
    return issue_service.refine_existing_draft(
        original_request=request.original_request,
        current_draft=request.current_draft,
        modification_request=request.modification_request
    )

@app.get("/repositories", response_model=List[Repository], tags=["Repositories"])
def get_repositories(current_user: dict = Depends(get_current_user)):
    return repo_list

@app.get("/assignees", response_model=List[Assignee], tags=["Assignee"])
def get_assignees(current_user: dict = Depends(get_current_user)):
    return valid_assignees

@app.post("/issue", tags=["Git issue"])
def create_issue(issue: FullIssueDraft, current_user: dict = Depends(get_current_user)):
    # Use the GitHub token from the authenticated user instead of PAT
    github_token = current_user.get("github_token")
    if not github_token:
        raise HTTPException(status_code=401, detail="No GitHub token available")
    
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }
    data = {
        "title": issue.title,
        "body": issue.body,
        "assignees": [issue.assignee_username] if issue.assignee_username else [],
        "labels":[]
    }

    parsed_url = urlparse(issue.repo_url)
    GITHUB_HOSTNAME_FROM_URL = parsed_url.netloc
    path_parts = parsed_url.path.strip('/').split('/')
    if len(path_parts) >= 2:
        REPO_OWNER = path_parts[0]
        REPO_NAME = path_parts[1]
    else:
        raise ValueError("URL path is not in the expected 'owner/repo' format.")

    # Build the API URL using the extracted info
    if GITHUB_HOSTNAME_FROM_URL and GITHUB_HOSTNAME_FROM_URL != "github.com":
        # URL for GitHub Enterprise
        api_url = f"https://{GITHUB_HOSTNAME_FROM_URL}/api/v3/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    else:
        # URL for public GitHub (api.github.com)
        api_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues"

    try:
        # Make the POST request to the GitHub API
        response = requests.post(api_url, data=json.dumps(data), headers=headers)
        response.raise_for_status()
        # If the request was successful (status code 201 Created)
        response_data = response.json()
        return IssueCreationResponse(status=True, issue_url=response_data['html_url'] ,error_message=None)

    except requests.exceptions.RequestException as e:
        # Handle potential errors like network issues or invalid API responses
        print(f"❌ Error creating issue: {e}")
        # Print the response content for more detailed error info if available
        return IssueCreationResponse(status=False, issue_url=None, error_message=response.text)

@app.post("/upload-file", response_model=FileUploadResponse, tags=["File Upload"])
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Upload a file to IBM COS and return a public URL.
    """
    if not cos_client:
        raise HTTPException(status_code=500, detail="IBM COS not configured")
    
    # Validate file size (10MB limit)
    if file.size and file.size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    try:
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Upload file to IBM COS
        cos_client.upload_fileobj(
            file.file,
            COS_BUCKET_NAME,
            unique_filename,
            ExtraArgs={
                "ACL": "public-read",
                "ContentType": file.content_type or "application/octet-stream"
            }
        )
        
        # Generate public URL
        file_url = f"{COS_ENDPOINT}/{COS_BUCKET_NAME}/{unique_filename}"
        
        return FileUploadResponse(
            success=True,
            file_url=file_url,
            error_message=None
        )
        
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        return FileUploadResponse(
            success=False,
            file_url=None,
            error_message=str(e)
        )