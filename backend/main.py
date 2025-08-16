from dotenv import load_dotenv
load_dotenv()

import os
import json
from typing import Optional, List
from urllib.parse import urlparse

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

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


# --- 2. The Stateless Issue Drafting Service ---

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

# --- 3. The FastAPI Application ---

# Ensure your API key is available in the environment
# os.environ["OPENAI_API_KEY"] = "sk-..."

app = FastAPI(
    title="Git Issue Drafting API",
    description="An API to generate and refine Git issues using an LLM.",
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


@app.post("/drafts", response_model=FullIssueDraft, tags=["Drafting"])
def create_draft(request: InitialRequest):
    """
    Creates the first draft of an issue from a user's raw text description.
    """
    return issue_service.generate_initial_draft(request.user_request)


@app.post("/refine-draft", response_model=FullIssueDraft, tags=["Drafting"])
def refine_draft(request: RefineRequest):
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
def get_repositories():
    return repo_list

@app.get("/assignees", response_model=List[Assignee], tags=["Assignee"])
def get_repositories():
    return valid_assignees

@app.post("/issue", tags=["Git issue"])
def get_repositories(issue: FullIssueDraft):
    headers = {
        "Authorization": f"token {os.environ['GITHUB_TOKEN']}",
        "Accept": "application/vnd.github.v3+json",
    }
    data = {
        "title": issue.title,
        "body": issue.body,
        "assignees": [issue.assignee_username],
        "labels":[]
    }

    parsed_url = urlparse(issue.repo_url)
    GITHUB_HOSTNAME = parsed_url.netloc
    path_parts = parsed_url.path.strip('/').split('/')
    if len(path_parts) >= 2:
        REPO_OWNER = path_parts[0]
        REPO_NAME = path_parts[1]
    else:
        raise ValueError("URL path is not in the expected 'owner/repo' format.")

    # --- Step 3: Build the API URL using the extracted info ---
    if GITHUB_HOSTNAME and GITHUB_HOSTNAME != "github.com":
        # URL for GitHub Enterprise
        api_url = f"https://{GITHUB_HOSTNAME}/api/v3/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    else:
        # URL for public GitHub (api.github.com)
        api_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues"

    try:
        # Make the POST request to the GitHub API
        response = requests.post(api_url, data=json.dumps(data), headers=headers)
        # Raise an exception for bad status codes (4xx or 5xx)
        response.raise_for_status()
        # If the request was successful (status code 201 Created)
        response_data = response.json()
        return IssueCreationResponse(status=True, issue_url=response_data['html_url'] ,error_message=None)

    except requests.exceptions.RequestException as e:
        # Handle potential errors like network issues or invalid API responses
        print(f"❌ Error creating issue: {e}")
        # Print the response content for more detailed error info if available
        return IssueCreationResponse(status=False, issue_url=None, error_message=response.text)

class TokenResponse(BaseModel):
    """Defines the structure for a successful token response."""
    access_token: str
    token_type: str
    scope: str

@app.post(
    "/api/auth/github/callback",
    response_model=TokenResponse,
    summary="GitHub OAuth Callback",
    tags=["Authentication"]
)
def github_oauth_callback(code: str = Query(..., description="The authorization code provided by GitHub.")):
    """
    This endpoint receives the authorization code from GitHub after a user
    approves the OAuth application. It then exchanges this code for an
    access token by making a server-to-server request to GitHub.

    - **code**: The temporary authorization code from the query parameter.
    """

    # Prepare the parameters for the POST request to GitHub's token URL
    params = {
        "client_id": os.environ['GITHUB_CLIENT_ID'],
        "client_secret": os.environ['GITHUB_CLIENT_SECRET'],
        "code": code,
    }

    # Set the header to accept the response in JSON format
    headers = {
        "Accept": "application/json"
    }

    # Use the requests library for making the synchronous HTTP request
    try:
        # Make the POST request to exchange the code for an access token
        response = requests.post(os.environ['GITHUB_TOKEN_URL'], params=params, headers=headers)

        # Raise an exception for non-2xx (error) status codes
        response.raise_for_status()

    except requests.exceptions.RequestException as exc:
        # Handle potential network errors or issues with the request itself
        raise HTTPException(
            status_code=503,
            detail=f"An error occurred while requesting the access token from GitHub: {exc}"
        )
    except requests.exceptions.HTTPError as exc:
        # Handle non-2xx responses from GitHub
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"GitHub API returned an error: {exc.response.text}"
        )

    # Parse the JSON response from GitHub
    response_data = response.json()

    # Check if the response contains an error from GitHub
    if "error" in response_data:
        error_description = response_data.get("error_description", "No description provided.")
        raise HTTPException(
            status_code=400,
            detail=f"GitHub returned an error: {response_data['error']} - {error_description}"
        )

    # Check if the access_token is in the response
    if "access_token" not in response_data:
        raise HTTPException(
            status_code=500,
            detail="The access token was not found in the response from GitHub."
        )

    return TokenResponse(
        access_token=response_data.get("access_token"),
        token_type=response_data.get("token_type"),
        scope=response_data.get("scope"),
    )
  