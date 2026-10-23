// Punto de entrada de la pagina
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { FiltrosProvider } from './context/FiltrosContext.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FiltrosProvider>
          <App />
        </FiltrosProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
