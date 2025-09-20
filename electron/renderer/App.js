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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const Login_1 = __importDefault(require("./screens/Login"));
const Reception_1 = __importDefault(require("./screens/Reception"));
const Admin_1 = __importDefault(require("./screens/Admin"));
const api_1 = require("./lib/api");
require("./App.css");
const App = () => {
    const [currentScreen, setCurrentScreen] = (0, react_1.useState)('login');
    const [user, setUser] = (0, react_1.useState)(null);
    const [apiClient, setApiClient] = (0, react_1.useState)(null);
    // Initialize API client
    (0, react_1.useEffect)(() => {
        const initializeApi = async () => {
            try {
                const baseUrl = await window.electronAPI.getEnv('DESKTOP_API_BASE_URL') || 'http://localhost:3000';
                const client = new api_1.ApiClient(baseUrl);
                setApiClient(client);
            }
            catch (error) {
                console.error('Failed to initialize API client:', error);
                // Fallback to default
                const client = new api_1.ApiClient('http://localhost:3000');
                setApiClient(client);
            }
        };
        initializeApi();
    }, []);
    const handleLogin = (user) => {
        setUser(user);
        if (apiClient) {
            apiClient.setAuth(user.username);
        }
        // Navigate to appropriate screen based on role
        if (user.role === 'admin') {
            setCurrentScreen('admin');
        }
        else {
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
    const handleNavigate = (screen) => {
        setCurrentScreen(screen);
    };
    if (!apiClient) {
        return (<div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing application...</p>
        </div>
      </div>);
    }
    return (<div className="app">
      {currentScreen === 'login' && (<Login_1.default apiClient={apiClient} onLogin={handleLogin}/>)}
      
      {currentScreen === 'reception' && user && (<Reception_1.default apiClient={apiClient} user={user} onLogout={handleLogout} onNavigateToAdmin={() => user.role === 'admin' && handleNavigate('admin')}/>)}
      
      {currentScreen === 'admin' && user && (<Admin_1.default apiClient={apiClient} user={user} onLogout={handleLogout} onNavigateToReception={() => handleNavigate('reception')}/>)}
    </div>);
};
exports.default = App;
