import React, { useState, useCallback, useEffect } from 'react';
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

interface EmailReceipt {
  id: number;
  emailTo: string;
  memberDisplayName: string;
  productLabel: string;
  cardSerial: string;
  status: 'Queued' | 'Sent' | 'Failed';
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  lastError: string | null;
  processedByStaff: string | null;
}

interface EmailStats {
  total: number;
  byStatus: {
    Queued: { count: number };
    Sent: { count: number };
    Failed: { count: number };
  };
}

type AdminTab = 'cards' | 'emails' | 'reports';

const AdminScreen: React.FC<AdminScreenProps> = ({ 
  apiClient, 
  user, 
  onLogout, 
  onNavigateToReception 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('cards');
  const [currentCard, setCurrentCard] = useState<CardSnapshot | null>(null);
  const [searchSerial, setSearchSerial] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [processing, setProcessing] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Email management state
  const [emailReceipts, setEmailReceipts] = useState<EmailReceipt[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [emailFilter, setEmailFilter] = useState<'all' | 'Queued' | 'Sent' | 'Failed'>('all');
  const [emailLoading, setEmailLoading] = useState(false);

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

  // Email management functions
  const loadEmailReceipts = useCallback(async () => {
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
    } catch (error) {
      console.error('Error loading email receipts:', error);
      addToast('error', 'Fehler beim Laden der E-Mail-Belege');
    } finally {
      setEmailLoading(false);
    }
  }, [emailFilter, user.username, addToast]);

  const loadEmailStats = useCallback(async () => {
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
    } catch (error) {
      console.error('Error loading email stats:', error);
      addToast('error', 'Fehler beim Laden der E-Mail-Statistiken');
    }
  }, [user.username, addToast]);

  const handleRetryEmail = async (receiptId: number) => {
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
    } catch (error) {
      console.error('Error retrying email:', error);
      addToast('error', 'Fehler beim Wiederholen der E-Mail');
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Sent': return 'badge-success';
      case 'Failed': return 'badge-danger';
      case 'Queued': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Sent': return 'Gesendet';
      case 'Failed': return 'Fehlgeschlagen';
      case 'Queued': return 'In Warteschlange';
      default: return status;
    }
  };

  // Load email data when switching to email tab
  useEffect(() => {
    if (activeTab === 'emails') {
      loadEmailReceipts();
      loadEmailStats();
    }
  }, [activeTab, loadEmailReceipts, loadEmailStats]);

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