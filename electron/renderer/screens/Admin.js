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
const api_1 = require("../lib/api");
const CardPanel_1 = __importDefault(require("../components/CardPanel"));
const Toast_1 = require("../components/Toast");
const idempotency_1 = require("../lib/idempotency");
const AdminScreen = ({ apiClient, user, onLogout, onNavigateToReception }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('cards');
    const [currentCard, setCurrentCard] = (0, react_1.useState)(null);
    const [searchSerial, setSearchSerial] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const [processing, setProcessing] = (0, react_1.useState)(false);
    const [appConfig, setAppConfig] = (0, react_1.useState)([]);
    const [showSettings, setShowSettings] = (0, react_1.useState)(false);
    // Email management state
    const [emailReceipts, setEmailReceipts] = (0, react_1.useState)([]);
    const [emailStats, setEmailStats] = (0, react_1.useState)(null);
    const [emailFilter, setEmailFilter] = (0, react_1.useState)('all');
    const [emailLoading, setEmailLoading] = (0, react_1.useState)(false);
    const addToast = (0, react_1.useCallback)((type, message, duration) => {
        const toast = {
            id: (0, idempotency_1.generateIdempotencyKey)(),
            type,
            message,
            duration,
        };
        setToasts(prev => [...prev, toast]);
    }, []);
    const removeToast = (0, react_1.useCallback)((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchSerial.trim()) {
            setError('Seriennummer eingeben');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const card = await apiClient.searchCardBySerial(searchSerial.trim());
            if (!card) {
                setError(`Karte mit Seriennummer "${searchSerial}" nicht gefunden`);
                addToast('error', `Karte "${searchSerial}" nicht gefunden`);
                setCurrentCard(null);
                return;
            }
            setCurrentCard(card);
            setError(null);
            addToast('success', `Karte gefunden: ${card.memberDisplayName}`, 3000);
        }
        catch (error) {
            console.error('Search error:', error);
            if (error instanceof api_1.ApiError) {
                const errorMsg = error.getGermanMessage();
                setError(errorMsg);
                addToast('error', errorMsg);
            }
            else {
                const errorMsg = 'Fehler beim Suchen der Karte';
                setError(errorMsg);
                addToast('error', errorMsg);
            }
            setCurrentCard(null);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRollback = async () => {
        if (!currentCard || processing)
            return;
        const reasonCode = prompt('Grund für Storno (z.B. TECH_ERROR, CUSTOMER_ERROR):');
        if (!reasonCode)
            return;
        const note = prompt('Zusätzliche Notiz (optional):') || undefined;
        setProcessing(true);
        try {
            const updatedCard = await apiClient.rollbackCard(currentCard.cardId, reasonCode, note);
            setCurrentCard(updatedCard);
            addToast('success', 'Besuch erfolgreich storniert', 4000);
        }
        catch (error) {
            console.error('Rollback error:', error);
            if (error instanceof api_1.ApiError) {
                addToast('error', error.getGermanMessage());
            }
            else {
                addToast('error', 'Fehler beim Stornieren');
            }
        }
        finally {
            setProcessing(false);
        }
    };
    const handleCancel = async () => {
        if (!currentCard || processing)
            return;
        const confirm = window.confirm(`Sind Sie sicher, dass Sie die Karte "${currentCard.serial}" endgültig stornieren möchten?`);
        if (!confirm)
            return;
        const reasonCode = prompt('Grund für Kartenstorno (z.B. LOST, FRAUD, REFUND):');
        if (!reasonCode)
            return;
        const note = prompt('Zusätzliche Notiz (optional):') || undefined;
        setProcessing(true);
        try {
            const updatedCard = await apiClient.cancelCard(currentCard.cardId, reasonCode, note);
            setCurrentCard(updatedCard);
            addToast('success', 'Karte erfolgreich storniert', 4000);
        }
        catch (error) {
            console.error('Cancel error:', error);
            if (error instanceof api_1.ApiError) {
                addToast('error', error.getGermanMessage());
            }
            else {
                addToast('error', 'Fehler beim Stornieren der Karte');
            }
        }
        finally {
            setProcessing(false);
        }
    };
    const handleShowSettings = async () => {
        try {
            const config = await apiClient.getAppConfig();
            setAppConfig(config);
            setShowSettings(true);
        }
        catch (error) {
            console.error('Failed to load config:', error);
            addToast('error', 'Fehler beim Laden der Einstellungen');
        }
    };
    const getReportUrl = (type) => {
        const url = apiClient.getReportUrl(type);
        return url;
    };
    const handleExportReport = async (type) => {
        try {
            const url = await getReportUrl(type);
            window.open(url, '_blank');
        }
        catch (error) {
            console.error('Export error:', error);
            addToast('error', 'Fehler beim Export');
        }
    };
    // Email management functions
    const loadEmailReceipts = (0, react_1.useCallback)(async () => {
        setEmailLoading(true);
        try {
            const status = emailFilter === 'all' ? undefined : emailFilter;
            const response = await fetch(`/admin/email-receipts?limit=50&offset=0${status ? `&status=${status}` : ''}`, {
                headers: {
                    'x-staff-username': user.username
                }
            });
            if (!response.ok) {
                throw new Error('Failed to load email receipts');
            }
            const data = await response.json();
            setEmailReceipts(data.receipts || []);
        }
        catch (error) {
            console.error('Error loading email receipts:', error);
            addToast('error', 'Fehler beim Laden der E-Mail-Belege');
        }
        finally {
            setEmailLoading(false);
        }
    }, [emailFilter, user.username, addToast]);
    const loadEmailStats = (0, react_1.useCallback)(async () => {
        try {
            const response = await fetch('/admin/email-receipts/stats', {
                headers: {
                    'x-staff-username': user.username
                }
            });
            if (!response.ok) {
                throw new Error('Failed to load email stats');
            }
            const stats = await response.json();
            setEmailStats(stats);
        }
        catch (error) {
            console.error('Error loading email stats:', error);
            addToast('error', 'Fehler beim Laden der E-Mail-Statistiken');
        }
    }, [user.username, addToast]);
    const handleRetryEmail = async (receiptId) => {
        try {
            const response = await fetch(`/admin/email-receipts/retry/${receiptId}`, {
                method: 'POST',
                headers: {
                    'x-staff-username': user.username,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to retry email');
            }
            addToast('success', 'E-Mail erfolgreich zur Wiederholung markiert');
            await loadEmailReceipts();
            await loadEmailStats();
        }
        catch (error) {
            console.error('Error retrying email:', error);
            addToast('error', 'Fehler beim Wiederholen der E-Mail');
        }
    };
    const formatDateTime = (dateStr) => {
        if (!dateStr)
            return '-';
        return new Intl.DateTimeFormat('de-DE', {
            timeZone: 'Europe/Berlin',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr));
    };
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Sent': return 'badge-success';
            case 'Failed': return 'badge-danger';
            case 'Queued': return 'badge-warning';
            default: return 'badge-secondary';
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'Sent': return 'Gesendet';
            case 'Failed': return 'Fehlgeschlagen';
            case 'Queued': return 'In Warteschlange';
            default: return status;
        }
    };
    // Load email data when switching to email tab
    (0, react_1.useEffect)(() => {
        if (activeTab === 'emails') {
            loadEmailReceipts();
            loadEmailStats();
        }
    }, [activeTab, loadEmailReceipts, loadEmailStats]);
    return (<div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Administration</h1>
        <div className="user-info">
          <span>Angemeldet als: {user.displayName} (Admin)</span>
          <button className="btn btn-secondary mr-8" onClick={onNavigateToReception}>
            Empfang
          </button>
          <button className="btn btn-secondary" onClick={onLogout}>
            Abmelden
          </button>
        </div>
      </div>
      
      <div className="screen-content">
        <div style={{
            display: 'grid',
            gridTemplateColumns: '400px 1fr',
            gap: '24px',
            height: '100%'
        }}>
          {/* Left Panel - Search and Actions */}
          <div>
            <div className="card mb-16">
              <div className="card-header">
                Karte suchen
              </div>
              <div className="card-body">
                <form onSubmit={handleSearch}>
                  <div className="form-group">
                    <label htmlFor="search-serial" className="form-label">
                      Seriennummer
                    </label>
                    <input type="text" id="search-serial" className={`form-control ${error ? 'error' : ''}`} value={searchSerial} onChange={(e) => setSearchSerial(e.target.value)} placeholder="BC-2024-12345" disabled={loading}/>
                    {error && (<div className="error-message">{error}</div>)}
                  </div>
                  
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !searchSerial.trim()}>
                    {loading ? 'Suchen...' : 'Suchen'}
                  </button>
                </form>
              </div>
            </div>
            
            {currentCard && (<div className="card mb-16">
                <div className="card-header">
                  Aktionen
                </div>
                <div className="card-body">
                  <div className="d-flex gap-8" style={{ flexDirection: 'column' }}>
                    <button className="btn btn-danger" onClick={handleRollback} disabled={processing}>
                      Besuch stornieren
                    </button>
                    
                    <button className="btn btn-danger" onClick={handleCancel} disabled={processing || currentCard.state === 'Cancelled'}>
                      Karte stornieren
                    </button>
                  </div>
                </div>
              </div>)}
            
            <div className="card">
              <div className="card-header">
                Reports & Settings
              </div>
              <div className="card-body">
                <div className="d-flex gap-8" style={{ flexDirection: 'column' }}>
                  <button className="btn btn-secondary" onClick={() => handleExportReport('deductions')}>
                    Export Verbuchungen
                  </button>
                  
                  <button className="btn btn-secondary" onClick={() => handleExportReport('rollbacks')}>
                    Export Stornos
                  </button>
                  
                  <button className="btn btn-secondary" onClick={handleShowSettings}>
                    Einstellungen
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Panel - Card Information */}
          <div>
            <CardPanel_1.default card={currentCard} loading={loading} error={error}/>
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (<div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}>
          <div className="card" style={{ minWidth: '500px', maxWidth: '80%' }}>
            <div className="card-header d-flex justify-between align-center">
              <span>Anwendungseinstellungen</span>
              <button className="btn" onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: '18px' }}>
                ×
              </button>
            </div>
            <div className="card-body">
              {appConfig.length === 0 ? (<p>Keine Konfiguration verfügbar</p>) : (<div>
                  {appConfig.map((config) => (<div key={config.key} className="info-row">
                      <label>{config.key}:</label>
                      <span style={{ fontFamily: 'monospace' }}>{config.value}</span>
                    </div>))}
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
                    Einstellungen sind schreibgeschützt.
                  </div>
                </div>)}
            </div>
          </div>
        </div>)}
      
      <Toast_1.ToastContainer toasts={toasts} onRemove={removeToast}/>
    </div>);
};
exports.default = AdminScreen;
