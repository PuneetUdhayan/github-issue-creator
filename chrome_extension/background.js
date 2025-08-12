// Background script to handle extension button clicks
chrome.action.onClicked.addListener((tab) => {
  // Inject the content script to show the modal
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: showIframeModal
  });
});

// Function to show the iframe modal (this will be injected into the page)
function showIframeModal() {
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

  // Assemble the modal
  modalContent.appendChild(iframe);
  modalContent.appendChild(closeButton);
  overlay.appendChild(modalContent);

  // Add the modal to the page
  document.body.appendChild(overlay);
}
