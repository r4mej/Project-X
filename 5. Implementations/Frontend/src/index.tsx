import React from 'react';
import { AuthProvider } from './context/AuthContext';
import App from './screens/App';

// Wrap the App component with AuthProvider
const AppWithAuth: React.FC = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default AppWithAuth; 