# GitHub Issue Creator with Screenshot Support

A Chrome extension that allows you to create GitHub issues with screenshots directly from any webpage.

## Features

- **Screenshot Capture**: Automatically captures a screenshot of the current tab when opening the issue creator
- **Visual Issue Creation**: Interactive chat interface to describe and create GitHub issues
- **Screenshot Integration**: Option to include the captured screenshot in your GitHub issue
- **GitHub Integration**: Direct integration with GitHub repositories and assignees

## How to Use

1. **Install the Chrome Extension**:
   - Load the `chrome_extension` folder as an unpacked extension in Chrome
   - The extension will appear in your browser toolbar

2. **Capture Screenshots**:
   - Navigate to any webpage you want to report an issue about
   - Click the extension icon in the toolbar
   - A screenshot will be automatically captured and the issue creator will open

3. **Create Issues**:
   - Use the chat interface to describe your issue
   - The AI will help you draft the issue title and body
   - Choose a repository and assignee
   - Toggle whether to include the screenshot in the issue
   - Click "Create Issue" to submit

## Technical Details

### Screenshot Flow
1. Extension button click triggers `chrome.tabs.captureVisibleTab()`
2. Screenshot data is passed to the iframe via `postMessage`
3. Frontend receives and displays the screenshot
4. User can choose to include the screenshot in the issue body as a markdown image

### Files Modified
- `chrome_extension/background.js`: Added screenshot capture and message handling
- `chrome_extension/manifest.json`: Added `tabs` permission for screenshot access
- `chrome_extension/content.js`: Removed duplicate modal function, added message passing
- `frontend/src/App.jsx`: Added screenshot display and integration with issue creation

### Permissions Required
- `activeTab`: To access the current tab
- `scripting`: To inject content scripts
- `tabs`: To capture screenshots

## Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Extension
Load the `chrome_extension` folder as an unpacked extension in Chrome's developer mode.

## Screenshot Integration

The screenshot is automatically captured when you open the issue creator and can be:
- Viewed in the chat interface
- Toggled on/off for inclusion in the issue
- Removed if not needed
- Added to the issue body as a markdown image link
