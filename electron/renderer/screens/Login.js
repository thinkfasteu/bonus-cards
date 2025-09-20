"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const api_1 = require("../lib/api");
const LoginScreen = ({ apiClient, onLogin }) => {
    const [username, setUsername] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const handleSubmit = async (e) => {
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
            const user = {
                username: staff.username,
                role: staff.role,
                displayName: staff.displayName,
            };
            onLogin(user);
        }
        catch (error) {
            console.error('Login error:', error);
            apiClient.clearAuth();
            if (error instanceof api_1.ApiError) {
                setError(error.getGermanMessage());
            }
            else {
                setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="screen">
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
                  <input type="text" id="username" className={`form-control ${error ? 'error' : ''}`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ihren Benutzername eingeben" disabled={loading} autoFocus/>
                  {error && (<div className="error-message">{error}</div>)}
                </div>
                
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading || !username.trim()}>
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
    </div>);
};
exports.default = LoginScreen;
