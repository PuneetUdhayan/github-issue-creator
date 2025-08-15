import React from 'react';
import root from 'react-shadow';

// This component creates the Shadow DOM "box"
const ShadowDom = ({ children }) => {
  return (
    <root.div>
      {/* Basic styles for the overlay */}
      <style>{`
        /* Reset styles to prevent conflicts with the host page */
        * {
          box-sizing: border-box;
        }
        
        /* Ensure our overlay is always on top */
        div {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
        }
        
        /* Prevent any inherited styles from affecting our overlay */
        button, input, textarea, select {
          font-family: inherit;
          margin: 0;
        }
        
        /* Smooth transitions for all interactive elements */
        button, input, textarea, select {
          transition: all 0.2s ease;
        }
        
        /* Focus styles */
        input:focus, textarea:focus, select:focus {
          outline: none;
        }
        
        /* Button reset */
        button {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        
        /* Form element resets */
        input, textarea, select {
          border: none;
          background: none;
          padding: 0;
        }
        
        /* Ensure proper stacking context */
        [style*="position: fixed"] {
          isolation: isolate;
        }
      `}</style>
      
      {/* Your actual components are rendered here, inside the protection of the shadow boundary */}
      {children}
    </root.div>
  );
};

export default ShadowDom;