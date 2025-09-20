import React, { useState } from 'react';
import { ApiClient, ApiError } from '../lib/api';
import { User } from '../App';

interface LoginScreenProps {
  apiClient: ApiClient;
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ apiClient, onLogin }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Benutzername ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set auth for the request
      apiClient.setAuth(username.trim());
      
      // Verify staff exists and get role
      const staff = await apiClient.getStaffByUsername(username.trim());
      
      if (!staff) {
        setError('Benutzername nicht gefunden');
        apiClient.clearAuth();
        return;
      }

      const user: User = {
        username: staff.username,
        role: staff.role,
        displayName: staff.displayName,
      };

      onLogin(user);
    } catch (error) {
      console.error('Login error:', error);
      apiClient.clearAuth();
      
      if (error instanceof ApiError) {
        setError(error.getGermanMessage());
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-content">
        <div style={{ 
          maxWidth: '400px', 
          margin: '0 auto', 
          paddingTop: '10%' 
        }}>
          <div className="card">
            <div className="card-header text-center">
              <h1 style={{ margin: 0, fontSize: '24px' }}>
                FTG Sportfabrik
              </h1>
              <p style={{ margin: '8px 0 0', color: '#666' }}>
                Digital Bonus Cards
              </p>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    Benutzername
                  </label>
                  <input
                    type="text"
                    id="username"
                    className={`form-control ${error ? 'error' : ''}`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ihren Benutzername eingeben"
                    disabled={loading}
                    autoFocus
                  />
                  {error && (
                    <div className="error-message">{error}</div>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={loading || !username.trim()}
                >
                  {loading ? 'Anmelden...' : 'Anmelden'}
                </button>
              </form>
              
              <div style={{ marginTop: '24px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                <p>Verwenden Sie Ihren Benutzernamen zur Anmeldung.</p>
                <p>Bei Problemen wenden Sie sich an den Administrator.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;