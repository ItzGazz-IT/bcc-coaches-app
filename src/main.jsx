import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error("Root render error:", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-red-50 text-red-900 p-6">
          <div className="max-w-3xl mx-auto bg-white border border-red-200 rounded-xl p-6 shadow-sm">
            <h1 className="text-2xl font-bold mb-3">App failed to render</h1>
            <p className="mb-4">A runtime error occurred. Copy the message below and share it.</p>
            <pre className="text-sm whitespace-pre-wrap bg-red-100 border border-red-200 rounded-lg p-3 overflow-auto">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/bcc-coaches-app/sw.js', {
        scope: '/bcc-coaches-app/'
      }).then(registration => {
        console.log('SW registered:', registration);
      }).catch(error => {
        console.log('SW registration failed:', error);
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
)
