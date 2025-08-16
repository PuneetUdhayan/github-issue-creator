const IFRAME_CONTENT_LINK = "http://localhost:5173";
const BACKEND_ENDPOINT = "http://localhost:8000";
const GITHUB_ENTERPRISE_URL = "https://github.ibm.com";
const CLIENT_ID = "4c5304c642424b9bccf7";

// Background script to handle extension button clicks
chrome.action.onClicked.addListener(async (tab) => {
  await handleModalOpen(
    tab,
    IFRAME_CONTENT_LINK,
    GITHUB_ENTERPRISE_URL,
    CLIENT_ID
  );
});

async function getAccessToken(code) {
  console.log({code})
  const BACKEND_ENDPOINT = "http://localhost:8000";
  const tokenUrl = new URL(`${BACKEND_ENDPOINT}/api/auth/github/callback`);
  tokenUrl.searchParams.append('code', code);
  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json();

    console.log({data})

    if (data.access_token) {
      // 5. Securely store the token
      await chrome.storage.local.set({ github_token: data.access_token });
    }
  } catch (error) {
    console.log("Network error fetching token: " + error.message);
  }
}

async function handleModalOpen(
  tab,
  iframeContentLink,
  githubEnterpriseUrl,
  clientId
) {
  const githubToken = await chrome.storage.local.get(["github_token"]);

  console.log({githubToken})

  if (Object.keys(githubToken??{}).length === 0) {
    console.log("Triggering oauth flow ");
    const redirectUri = chrome.identity.getRedirectURL();
    console.log({redirectUri});
    const scope = "repo user";
    const authUrl = `${githubEnterpriseUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}`;

    console.log({authUrl})

    await chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      async (redirectUrl) => {
        console.log({redirectUri});
        if (chrome.runtime.lastError || !redirectUrl) {
          console.log( "Authentication failed: " +
            (chrome.runtime.lastError
              ? chrome.runtime.lastError.message
              : "User canceled."))
          return;
        }

        // 3. Extract the authorization code from the callback URL
        const url = new URL(redirectUrl);
        const authCode = url.searchParams.get("code");

        if (authCode) {
          // 4. Exchange the code for an access token
          await getAccessToken(authCode);
        }
      }
    );
  }
  try {
    // Take a screenshot of the current tab
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
      quality: 90,
    });

    // Inject the content script to show the modal with screenshot data
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showIframeModal,
      args: [iframeContentLink, screenshot],
    });
  } catch (error) {
    console.log(error);
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: showIframeModal,
      args: [iframeContentLink, null],
    });
  }
}

// Function to show the iframe modal (this will be injected into the page)
function showIframeModal(iframeContentLink, screenshotData = null) {
  // Prevent creating multiple modals
  if (document.getElementById("my-extension-modal-overlay")) {
    return;
  }

  // 1. Create the modal overlay (the dark background)
  const overlay = document.createElement("div");
  overlay.id = "my-extension-modal-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: "9999",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  });

  // 2. Create the modal content box
  const modalContent = document.createElement("div");
  Object.assign(modalContent.style, {
    position: "relative",
    width: "80%",
    height: "85%",
    maxWidth: "1000px",
    backgroundColor: "#161b22", // Match GitHub's dark theme
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
    border: "1px solid #30363d",
  });

  // 3. Create the Close button
  const closeButton = document.createElement("button");
  closeButton.innerText = "×";
  Object.assign(closeButton.style, {
    position: "absolute",
    top: "10px",
    right: "15px",
    background: "transparent",
    border: "none",
    color: "#8b949e",
    fontSize: "28px",
    cursor: "pointer",
    lineHeight: "1",
    zIndex: "10001",
  });

  // 4. Create the iframe
  const iframe = document.createElement("iframe");
  iframe.src = iframeContentLink; // The website to load
  Object.assign(iframe.style, {
    width: "100%",
    height: "100%",
    border: "none",
    borderRadius: "8px",
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
      iframe.contentWindow.postMessage(
        {
          type: "SCREENSHOT_DATA",
          screenshot: screenshotData,
        },
        "*"
      );
    }
  };

  window.addEventListener("message", (event) => {
    // SECURITY 🔒: ALWAYS verify the origin of the message
    if (event.origin !== iframeContentLink) {
      return;
    }

    const message = event.data;

    // Check if it's the message type we want to relay
    if (message && message.type === "REQUEST_DATA_FROM_EXTENSION") {
      console.log(
        "Content Script: Relaying message to background.",
        message.payload
      );

      // Send the message to the background script and wait for a response
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          return;
        }

        console.log(
          "Content Script: Got response from background, relaying back to iframe."
        );

        // Relay the response back to the iframe
        iframe.contentWindow.postMessage(
          {
            type: "DATA_FROM_BACKGROUND",
            payload: response,
          },
          iframeContentLink
        );
      });
    }
  });

  // Assemble the modal
  modalContent.appendChild(iframe);
  modalContent.appendChild(closeButton);
  overlay.appendChild(modalContent);

  // Add the modal to the page
  document.body.appendChild(overlay);
}
