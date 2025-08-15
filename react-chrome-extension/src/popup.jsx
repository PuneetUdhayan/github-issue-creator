import React from "react";
import ReactDOM from "react-dom/client";
import Popup from "./pages/Popup";
import ShadowDom from "./components/ShadowDom";

function AppContainer() {
  const [isVisible, setIsVisible] = useState(false);

  // Listen for messages from the background script
  // chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  //   if (request.type === 'TOGGLE_OVERLAY') {
  //     setIsVisible(!isVisible);
  //   }
  // });

  if (!isVisible) {
    return null; // Don't render anything if it's not visible
  }

  // Pass a function to the Modal to allow it to close itself
  return (
    <ShadowDom>
      <Modal onClose={() => setIsVisible(false)} />
    </ShadowDom>
  );
}

ReactDOM.createRoot(document.body).render(
  <React.StrictMode>
    {/* <ShadowDom> */}
      <AppContainer />
    {/* </ShadowDom> */}
  </React.StrictMode>
);
