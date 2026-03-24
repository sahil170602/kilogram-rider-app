import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🎯 GLOBAL ERROR CATCHER: 
// If your JS crashes on Android, this will help us see why.
window.onerror = function(message, source, lineno, colno, error) {
  console.error("🔴 GLOBAL ERROR:", message, "at", source, ":", lineno);
  // Optional: You could alert(message) here temporarily to see errors on the phone
};

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log("✅ React mounted successfully");
  } catch (renderError) {
    console.error("FATAL RENDER ERROR:", renderError);
  }
} else {
  // This triggers if index.html is missing <div id="root">
  const errorMsg = "CRITICAL: #root element missing in index.html";
  console.error(errorMsg);
  document.body.innerHTML = `<div style="color:white; background:red; padding:20px;">${errorMsg}</div>`;
}