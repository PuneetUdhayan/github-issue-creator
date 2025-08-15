# File Upload Setup Guide

This guide explains how to set up the file upload functionality that stores files in IBM Cloud Object Storage (COS) and adds markdown links to textareas.

## Backend Setup

### 1. Install Dependencies

The backend dependencies have been updated in `backend/requirements.txt`. Install them:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

You need to set up IBM COS and GitHub OAuth. Create a `.env` file in the `backend` directory with:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-change-in-production

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# IBM Cloud Object Storage Configuration (optional)
COS_ENDPOINT=https://your-cos-endpoint.cos.region.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=your-api-key-id
COS_AUTH_ENDPOINT=https://iam.cloud.ibm.com/identity/token
COS_SERVICE_INSTANCE_ID=your-service-instance-id
COS_BUCKET_NAME=your-bucket-name
```

### 3. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `GitHub Issue Creator`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:8000/auth/github/callback`
4. Note down your **Client ID** and **Client Secret**

### 4. IBM COS Setup Steps

1. **Create an IBM Cloud account** (if you don't have one)
2. **Create a Cloud Object Storage instance**:
   - Go to IBM Cloud Console
   - Search for "Cloud Object Storage"
   - Create a new instance
3. **Create a bucket**:
   - In your COS instance, create a new bucket
   - Note down the bucket name
4. **Get your credentials**:
   - Go to Service Credentials
   - Create a new credential
   - Note down the API key and service instance ID
5. **Get your endpoint**:
   - In your bucket settings, find the endpoint URL

## Frontend Setup

The frontend has been updated with:

1. **FileUpload Component** (`frontend/src/FileUpload.jsx`):
   - Drag and drop functionality
   - File picker button
   - Upload progress indication
   - Automatic markdown link insertion

2. **Integration with App.jsx**:
   - File upload areas below both textareas (chat input and issue body)
   - Automatic insertion of markdown links at cursor position
   - Disabled state during operations

## Features

### Drag and Drop
- Users can drag files directly onto the upload areas
- Visual feedback when dragging over the drop zone
- Supports all file types

### File Picker
- Click the "Choose File" button to browse and select files
- Alternative to drag and drop

### Markdown Integration
- Uploaded files are automatically converted to markdown links
- Links are inserted at the current cursor position in textareas
- Format: `[filename](file-url)`

### Error Handling
- Network error handling
- Upload failure notifications
- Disabled state during uploads

## Usage

1. **In Chat Input**:
   - Drag a file onto the upload area below the message textarea
   - Or click "Choose File" to browse
   - The markdown link will be inserted at your cursor position

2. **In Issue Body**:
   - Same functionality as chat input
   - Files are uploaded and links are inserted into the issue description

3. **File Storage**:
   - Files are stored in your IBM COS bucket
   - Public URLs are generated for markdown links
   - Files are accessible via the generated URLs

## Security Notes

- Files are stored with public read access for markdown linking
- Consider implementing file type restrictions if needed
- Monitor your COS usage and costs
- Consider implementing file size limits

## Troubleshooting

1. **Upload fails**: Check your IBM COS configuration in `.env`
2. **Files not accessible**: Ensure your bucket has public read access
3. **CORS issues**: Make sure your COS bucket allows cross-origin requests
4. **Backend not starting**: Verify all environment variables are set correctly
