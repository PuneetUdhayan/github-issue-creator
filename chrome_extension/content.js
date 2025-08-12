// This function creates and displays the modal on the page.
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

// This function adds the button to the GitHub header.
function addButton() {
  const globalBarEnd = document.querySelector('.AppHeader-globalBar-end');

  if (globalBarEnd && !document.getElementById('my-modal-button')) {
    const newButton = document.createElement('button');
    newButton.id = 'my-modal-button';
    newButton.className = 'AppHeader-button btn-octicon';
    newButton.innerHTML = `
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-link-external">
        <path d="M4.25 10.75a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Zm3-3a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM8.5 1H6.75A2.75 2.75 0 0 0 4 3.75v6.5A2.75 2.75 0 0 0 6.75 13h6.5A2.75 2.75 0 0 0 16 10.25V8.5a.75.75 0 0 0-1.5 0v1.75a1.25 1.25 0 0 1-1.25 1.25h-6.5a1.25 1.25 0 0 1-1.25-1.25v-6.5A1.25 1.25 0 0 1 6.75 2.5H8.5a.75.75 0 0 0 0-1.5Z"></path><path d="M14.25 0a.75.75 0 0 0 0 1.5h1.25v1.25a.75.75 0 0 0 1.5 0V.75A.75.75 0 0 0 16.25 0H15a.75.75 0 0 0-.75.75Z"></path>
      </svg>`;
    newButton.style.marginRight = "8px";

    // When the button is clicked, call the function to show the modal
    newButton.onclick = showIframeModal;

    globalBarEnd.prepend(newButton);
    console.log("Extension: Button added to global header!");
  }
}

// Use a timeout to ensure the page elements are loaded before adding the button.
setTimeout(addButton, 3000);
