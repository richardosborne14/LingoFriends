/**
 * LingoFriends - Application Entry Point
 * 
 * Initializes React app with:
 * - AuthProvider for authentication state
 * - StrictMode for development checks
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './src/hooks/useAuth';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
