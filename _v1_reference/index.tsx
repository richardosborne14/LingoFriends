/**
 * LingoFriends - Application Entry Point
 * 
 * Initializes React app with:
 * - Tailwind CSS via main.css import
 * - AuthProvider for authentication state
 * - StrictMode for development checks
 * 
 * @module index
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

// Import Tailwind CSS and global styles
import './src/styles/main.css';

// Auth context provider
import { AuthProvider } from './src/hooks/useAuth';

// Main app component
import App from './App';

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Create React root and render app
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
