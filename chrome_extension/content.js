// This function adds the button to the GitHub header (only on GitHub pages)
function addGitHubButton() {
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

    // When the button is clicked, trigger the extension action
    newButton.onclick = () => {
      // Trigger the extension action which will handle screenshot and modal
      chrome.runtime.sendMessage({ action: 'openModal' });
    };

    globalBarEnd.prepend(newButton);
    console.log("Extension: Button added to GitHub header!");
  }
}

// Check if we're on GitHub and add the button if so
if (window.location.hostname === 'github.com' || window.location.hostname === 'github.ibm.com') {
  // Use a timeout to ensure the page elements are loaded before adding the button
  setTimeout(addGitHubButton, 2000);
}

