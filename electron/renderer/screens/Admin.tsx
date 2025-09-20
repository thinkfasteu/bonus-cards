import React, { useState, useCallback } from 'react';
import { ApiClient, ApiError, CardSnapshot, AppConfig } from '../lib/api';
import { User } from '../App';
import CardPanel from '../components/CardPanel';
import { Toast, ToastContainer } from '../components/Toast';
import { generateIdempotencyKey } from '../lib/idempotency';

interface AdminScreenProps {
  apiClient: ApiClient;
  user: User;
  onLogout: () => void;
  onNavigateToReception: () => void;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ 
  apiClient, 
  user, 
  onLogout, 
  onNavigateToReception 
}) => {
  const [currentCard, setCurrentCard] = useState<CardSnapshot | null>(null);
  const [searchSerial, setSearchSerial] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [processing, setProcessing] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const addToast = useCallback((type: Toast['type'], message: string, duration?: number) => {
    const toast: Toast = {
      id: generateIdempotencyKey(),
      type,
      message,
      duration,
    };
    setToasts(prev => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
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
      
    } catch (error) {
      console.error('Search error:', error);
      
      if (error instanceof ApiError) {
        const errorMsg = error.getGermanMessage();
        setError(errorMsg);
        addToast('error', errorMsg);
      } else {
        const errorMsg = 'Fehler beim Suchen der Karte';
        setError(errorMsg);
        addToast('error', errorMsg);
      }
      setCurrentCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!currentCard || processing) return;

    const reasonCode = prompt('Grund für Storno (z.B. TECH_ERROR, CUSTOMER_ERROR):');
    if (!reasonCode) return;

    const note = prompt('Zusätzliche Notiz (optional):') || undefined;

    setProcessing(true);
    
    try {
      const updatedCard = await apiClient.rollbackCard(currentCard.cardId, reasonCode, note);
      setCurrentCard(updatedCard);
      
      addToast('success', 'Besuch erfolgreich storniert', 4000);
      
    } catch (error) {
      console.error('Rollback error:', error);
      
      if (error instanceof ApiError) {
        addToast('error', error.getGermanMessage());
      } else {
        addToast('error', 'Fehler beim Stornieren');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!currentCard || processing) return;

    const confirm = window.confirm(
      `Sind Sie sicher, dass Sie die Karte "${currentCard.serial}" endgültig stornieren möchten?`
    );
    if (!confirm) return;

    const reasonCode = prompt('Grund für Kartenstorno (z.B. LOST, FRAUD, REFUND):');
    if (!reasonCode) return;

    const note = prompt('Zusätzliche Notiz (optional):') || undefined;

    setProcessing(true);
    
    try {
      const updatedCard = await apiClient.cancelCard(currentCard.cardId, reasonCode, note);
      setCurrentCard(updatedCard);
      
      addToast('success', 'Karte erfolgreich storniert', 4000);
      
    } catch (error) {
      console.error('Cancel error:', error);
      
      if (error instanceof ApiError) {
        addToast('error', error.getGermanMessage());
      } else {
        addToast('error', 'Fehler beim Stornieren der Karte');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleShowSettings = async () => {
    try {
      const config = await apiClient.getAppConfig();
      setAppConfig(config);
      setShowSettings(true);
    } catch (error) {
      console.error('Failed to load config:', error);
      addToast('error', 'Fehler beim Laden der Einstellungen');
    }
  };

  const getReportUrl = (type: 'deductions' | 'rollbacks' | 'cancellations' | 'expirations') => {
    const url = apiClient.getReportUrl(type);
    return url;
  };

  const handleExportReport = async (type: 'deductions' | 'rollbacks' | 'cancellations' | 'expirations') => {
    try {
      const url = await getReportUrl(type);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export error:', error);
      addToast('error', 'Fehler beim Export');
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Administration</h1>
        <div className="user-info">
          <span>Angemeldet als: {user.displayName} (Admin)</span>
          <button 
            className="btn btn-secondary mr-8" 
            onClick={onNavigateToReception}
          >
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
                    <input
                      type="text"
                      id="search-serial"
                      className={`form-control ${error ? 'error' : ''}`}
                      value={searchSerial}
                      onChange={(e) => setSearchSerial(e.target.value)}
                      placeholder="BC-2024-12345"
                      disabled={loading}
                    />
                    {error && (
                      <div className="error-message">{error}</div>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={loading || !searchSerial.trim()}
                  >
                    {loading ? 'Suchen...' : 'Suchen'}
                  </button>
                </form>
              </div>
            </div>
            
            {currentCard && (
              <div className="card mb-16">
                <div className="card-header">
                  Aktionen
                </div>
                <div className="card-body">
                  <div className="d-flex gap-8" style={{ flexDirection: 'column' }}>
                    <button
                      className="btn btn-danger"
                      onClick={handleRollback}
                      disabled={processing}
                    >
                      Besuch stornieren
                    </button>
                    
                    <button
                      className="btn btn-danger"
                      onClick={handleCancel}
                      disabled={processing || currentCard.state === 'Cancelled'}
                    >
                      Karte stornieren
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="card">
              <div className="card-header">
                Reports & Settings
              </div>
              <div className="card-body">
                <div className="d-flex gap-8" style={{ flexDirection: 'column' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleExportReport('deductions')}
                  >
                    Export Verbuchungen
                  </button>
                  
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleExportReport('rollbacks')}
                  >
                    Export Stornos
                  </button>
                  
                  <button
                    className="btn btn-secondary"
                    onClick={handleShowSettings}
                  >
                    Einstellungen
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Panel - Card Information */}
          <div>
            <CardPanel 
              card={currentCard} 
              loading={loading} 
              error={error} 
            />
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <div style={{
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
              <button
                className="btn"
                onClick={() => setShowSettings(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px' }}
              >
                ×
              </button>
            </div>
            <div className="card-body">
              {appConfig.length === 0 ? (
                <p>Keine Konfiguration verfügbar</p>
              ) : (
                <div>
                  {appConfig.map((config) => (
                    <div key={config.key} className="info-row">
                      <label>{config.key}:</label>
                      <span style={{ fontFamily: 'monospace' }}>{config.value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
                    Einstellungen sind schreibgeschützt.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default AdminScreen;