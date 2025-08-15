// import browser from "webextension-polyfill";

// console.log("Hello from the background!");

// browser.runtime.onInstalled.addListener((details) => {
//   console.log("Extension installed:", details);
// });

chrome.action.onClicked.addListener(async (tab) => {
  console.log("Extension button clicked on tab:", tab.id);
  console.log("Tab URL:", tab.url);
  
  // Send message to content script to toggle the overlay
  try {
    console.log("Sending message to content script...");
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
    console.log("Message sent to content script successfully");
  } catch (error) {
    console.error("Error sending message to content script:", error);
    console.error("Error details:", error.message);
  }
});

console.log("Background script loaded successfully");