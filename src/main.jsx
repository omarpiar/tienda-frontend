import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { SyncProvider } from './offline/SyncContext';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SyncProvider>
        <App />
      </SyncProvider>
    </AuthProvider>
  </StrictMode>,
);
