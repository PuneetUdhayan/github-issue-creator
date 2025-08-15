# GitHub OAuth Setup Guide

This guide will help you set up GitHub OAuth authentication to replace the Personal Access Token (PAT) approach.

## Prerequisites

- A GitHub account (Enterprise or public GitHub)
- Python 3.8+ installed
- Node.js 16+ installed

## Step 1: Create a GitHub OAuth App

For public GitHub, go to [GitHub Developer Settings](https://github.com/settings/developers)

For GitHub Enterprise, go to your Enterprise host, for example: `https://github.mycompany.com/settings/developers`

Click "New OAuth App" and fill in the following details:
- **Application name**: `GitHub Issue Creator` (or any name you prefer)
- **Homepage URL**: `http://localhost:5173`
- **Authorization callback URL**: `http://localhost:8000/auth/github/callback`
- **Application description**: `A tool to create GitHub issues using AI`

Note down your **Client ID** and **Client Secret**.

## Step 2: Configure Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# For GitHub Enterprise, set this to your hostname (e.g., github.mycompany.com).
# For public GitHub, omit or set to github.com
GITHUB_HOSTNAME=github.com

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-change-in-production

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# IBM COS Configuration (optional)
COS_ENDPOINT=your_cos_endpoint
COS_API_KEY_ID=your_cos_api_key_id
COS_AUTH_ENDPOINT=your_cos_auth_endpoint
COS_SERVICE_INSTANCE_ID=your_cos_service_instance_id
COS_BUCKET_NAME=your_cos_bucket_name
```

## Step 3: Install Dependencies

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Step 4: Run the Application

### Start the Backend
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Start the Frontend
```bash
cd frontend
npm run dev
```

## Step 5: Test the Authentication

1. Open your browser and go to `http://localhost:5173`
2. Click "Sign in with GitHub"
3. Authenticate on your GitHub provider (Enterprise or public)
4. After successful authentication, you'll be redirected back to the app
5. You should now see the main application interface with your GitHub username displayed

## How It Works

- The backend builds the OAuth URLs and API base URLs from `GITHUB_HOSTNAME`.
  - Public GitHub: `GITHUB_HOSTNAME=github.com`
  - Enterprise: `GITHUB_HOSTNAME=<your.enterprise.host>`
- Issue creation calls are routed to the correct API base automatically based on the repo URL (Enterprise vs github.com).

## Security Features
- **HTTP-only cookies**: JWT stored as httpOnly cookie
- **CSRF protection**: State stored in a short-lived cookie and validated on callback
- **Token expiration**: JWT tokens expire after 30 minutes

## API Protection
All API endpoints (except authentication endpoints) require authentication:
- `/drafts`, `/refine-draft`, `/repositories`, `/assignees`, `/issue`, `/upload-file`

## Troubleshooting

- "OAuth not configured": Ensure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and for Enterprise `GITHUB_HOSTNAME` are set.
- Invalid redirect URI: Make sure the callback URL matches `http://localhost:8000/auth/github/callback` in your OAuth app.
- Enterprise API errors: Verify your Enterprise host is reachable from your machine and that your account has repo/issue permissions.

## Production Deployment

- Update OAuth app URLs to use your production domain
- Set `secure=True` for cookies and serve over HTTPS
- Update CORS origins in `backend/main.py` accordingly

## Benefits of OAuth vs PAT
- No manual PAT handling
- User-scoped permissions
- Easy revocation
- Familiar login flow
