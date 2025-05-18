import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { RefreshProvider } from './context/RefreshContext';
import App from './screens/App';

// Wrap the App component with providers
const AppWithAuth: React.FC = () => (
  <AuthProvider>
    <RefreshProvider>
      <App />
    </RefreshProvider>
  </AuthProvider>
);

export default AppWithAuth; 