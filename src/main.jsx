import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/bcc-coaches-app/sw.js', {
      scope: '/bcc-coaches-app/'
    }).then(registration => {
      console.log('SW registered:', registration);
    }).catch(error => {
      console.log('SW registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
