import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import ContextProvider from './context/Context.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ContextProvider>
    <AuthProvider>
    <ThemeProvider>
    <App />
    </ThemeProvider>
    </AuthProvider>
  </ContextProvider>,
)
