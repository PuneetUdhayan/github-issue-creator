import React from 'react';
import { createRoot } from 'react-dom/client';
import Overlay from './components/Overlay.jsx';
import './index.css';

let overlayRoot = null;
let isOverlayVisible = false;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  if (message.action === 'toggleOverlay') {
    console.log('Toggling overlay...');
    toggleOverlay();
    sendResponse({ success: true });
  }
});

function createOverlayContainer() {
  console.log('Creating overlay container...');
  // Create container for the React overlay
  const container = document.createElement('div');
  container.id = 'github-issue-creator-overlay-container';
  document.body.appendChild(container);
  
  // Create React root
  overlayRoot = createRoot(container);
  console.log('Overlay container created and React root initialized');
  return container;
}

function toggleOverlay() {
  console.log('Toggle overlay called, isOverlayVisible:', isOverlayVisible);
  
  if (!overlayRoot) {
    console.log('No overlay root, creating container...');
    createOverlayContainer();
  }

  if (isOverlayVisible) {
    console.log('Hiding overlay...');
    // Hide overlay
    overlayRoot.render(null);
    isOverlayVisible = false;
  } else {
    console.log('Showing overlay...');
    // Show overlay
    overlayRoot.render(
      React.createElement(Overlay, {
        onClose: () => {
          console.log('Overlay close called');
          overlayRoot.render(null);
          isOverlayVisible = false;
        }
      })
    );
    isOverlayVisible = true;
  }
}

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  if (overlayRoot) {
    overlayRoot.unmount();
  }
});

console.log('Content script loaded successfully');
