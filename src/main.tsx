import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (e) {
    // 🎯 If it crashes, show the error on the screen
    document.body.innerHTML = `<div style="background:black;color:white;padding:20px;">Mount Error: ${e}</div>`;
  }
} else {
  document.body.style.background = "blue"; // 🎯 Blue screen = index.html loaded but no #root
}