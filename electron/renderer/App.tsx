import React, { useState, useEffect } from 'react';
import LoginScreen from './screens/Login';
import ReceptionScreen from './screens/Reception';
import AdminScreen from './screens/Admin';
import { ApiClient } from './lib/api';
import './App.css';

export type Screen = 'login' | 'reception' | 'admin';
export type UserRole = 'reception' | 'admin';

export interface User {
  username: string;
  role: UserRole;
  displayName: string;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [apiClient, setApiClient] = useState<ApiClient | null>(null);

  // Initialize API client
  useEffect(() => {
    const initializeApi = async () => {
      try {
        const baseUrl = await window.electronAPI.getEnv('DESKTOP_API_BASE_URL') || 'http://localhost:3000';
        const client = new ApiClient(baseUrl);
        setApiClient(client);
      } catch (error) {
        console.error('Failed to initialize API client:', error);
        // Fallback to default
        const client = new ApiClient('http://localhost:3000');
        setApiClient(client);
      }
    };

    initializeApi();
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
    if (apiClient) {
      apiClient.setAuth(user.username);
    }
    
    // Navigate to appropriate screen based on role
    if (user.role === 'admin') {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('reception');
    }
  };

  const handleLogout = () => {
    setUser(null);
    if (apiClient) {
      apiClient.clearAuth();
    }
    setCurrentScreen('login');
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  if (!apiClient) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {currentScreen === 'login' && (
        <LoginScreen 
          apiClient={apiClient} 
          onLogin={handleLogin} 
        />
      )}
      
      {currentScreen === 'reception' && user && (
        <ReceptionScreen 
          apiClient={apiClient} 
          user={user} 
          onLogout={handleLogout}
          onNavigateToAdmin={() => user.role === 'admin' && handleNavigate('admin')}
        />
      )}
      
      {currentScreen === 'admin' && user && (
        <AdminScreen 
          apiClient={apiClient} 
          user={user} 
          onLogout={handleLogout}
          onNavigateToReception={() => handleNavigate('reception')}
        />
      )}
    </div>
  );
};

export default App;