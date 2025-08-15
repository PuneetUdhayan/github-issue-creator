// Background script to handle extension button clicks
chrome.action.onClicked.addListener(async (tab) => {
  await handleModalOpen(tab);
});

// Simple in-memory token store
let jwtToken = null;
let userInfo = null;

// Handle messages from content script or iframe
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openModal') {
    handleModalOpen(sender.tab);
  }
  if (message.action === 'startOAuth') {
    startOAuthFlow().then((ok) => sendResponse({ ok, user: userInfo, token: jwtToken }));
    return true; // async response
  }
  if (message.action === 'getAuthToken') {
    sendResponse({ token: jwtToken, user: userInfo });
  }
});

async function startOAuthFlow() {
  try {
    // Prepare extension redirect URI (must be allowed by GitHub OAuth app config if using external redirect,
    // but we will use backend callback for code exchange instead)
    const state = crypto.randomUUID();
    const backendBase = 'http://localhost:8000';
    const redirectUri = chrome.identity.getRedirectURL('oauth2');

    // Ask backend for the authorize URL pointing to GitHub with our redirectUri
    const authUrlRes = await fetch(`${backendBase}/auth/extension/authorize?` + new URLSearchParams({
      redirect_uri: redirectUri,
      state,
    }));
    if (!authUrlRes.ok) throw new Error('Failed to get authorize URL');
    const { authorization_url } = await authUrlRes.json();

    // Launch the web auth flow
    const callbackUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authorization_url,
          interactive: true,
        },
        (redirectedTo) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(redirectedTo);
        }
      );
    });

    // Extract ?code= from callbackUrl
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    if (!code || state !== returnedState) throw new Error('Invalid OAuth response');

    // Exchange code for JWT with backend
    const tokenRes = await fetch(`${backendBase}/auth/extension/exchange-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });
    if (!tokenRes.ok) throw new Error('Failed to exchange code');
    const data = await tokenRes.json();

    jwtToken = data.jwt_token;
    userInfo = data.user;
    return true;
  } catch (e) {
    console.error('OAuth failed:', e);
    return false;
  }
}

async function handleModalOpen(tab) {
  try {
    // Take a screenshot of the current tab
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90
    });
    
    // Inject the content script to show the modal with screenshot data
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showIframeModal,
      args: [screenshot]
    });
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    // Fallback: show modal without screenshot
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showIframeModal,
      args: [null]
    });
  }
}

// Function to show the iframe modal (this will be injected into the page)
function showIframeModal(screenshotData) {
  // Prevent creating multiple modals
  if (document.getElementById('my-extension-modal-overlay')) {
    return;
  }

  // 1. Create the modal overlay (the dark background)
  const overlay = document.createElement('div');
  overlay.id = 'my-extension-modal-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: '9999',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  });

  // 2. Create the modal content box
  const modalContent = document.createElement('div');
  Object.assign(modalContent.style, {
    position: 'relative',
    width: '80%',
    height: '85%',
    maxWidth: '1000px',
    backgroundColor: '#161b22', // Match GitHub's dark theme
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
    border: '1px solid #30363d'
  });

  // 3. Create the Close button
  const closeButton = document.createElement('button');
  closeButton.innerText = '×';
  Object.assign(closeButton.style, {
    position: 'absolute',
    top: '10px',
    right: '15px',
    background: 'transparent',
    border: 'none',
    color: '#8b949e',
    fontSize: '28px',
    cursor: 'pointer',
    lineHeight: '1',
    zIndex: '10001'
  });

  // 4. Create the iframe
  const iframe = document.createElement('iframe');
  iframe.src = "http://localhost:5173/"; // The website to load
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '8px'
  });

  // Function to close the modal
  const closeModal = () => overlay.remove();

  // Add close functionality
  closeButton.onclick = closeModal;
  overlay.onclick = (event) => {
    // Only close if the dark background itself is clicked
    if (event.target === overlay) {
      closeModal();
    }
  };

  // Wait for iframe to load, then send screenshot data
  iframe.onload = () => {
    if (screenshotData) {
      iframe.contentWindow.postMessage({
        type: 'SCREENSHOT_DATA',
        screenshot: screenshotData
      }, '*');
    }
  };

  // Assemble the modal
  modalContent.appendChild(iframe);
  modalContent.appendChild(closeButton);
  overlay.appendChild(modalContent);

  // Add the modal to the page
  document.body.appendChild(overlay);
}
