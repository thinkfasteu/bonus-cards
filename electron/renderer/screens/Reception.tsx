import React, { useState, useCallback } from 'react';
import { ApiClient, ApiError, CardSnapshot } from '../lib/api';
import { User } from '../App';
import ScanInput from '../components/ScanInput';
import CardPanel from '../components/CardPanel';
import { Toast, ToastContainer } from '../components/Toast';
import { generateIdempotencyKey } from '../lib/idempotency';

interface ReceptionScreenProps {
  apiClient: ApiClient;
  user: User;
  onLogout: () => void;
  onNavigateToAdmin: () => void;
}

const ReceptionScreen: React.FC<ReceptionScreenProps> = ({ 
  apiClient, 
  user, 
  onLogout, 
  onNavigateToAdmin 
}) => {
  const [currentCard, setCurrentCard] = useState<CardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [processing, setProcessing] = useState(false);

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

  const handleScan = async (scanData: string) => {
    if (processing) {
      return; // Prevent concurrent scans
    }

    setLoading(true);
    setError(null);
    
    try {
      // Try to find card by serial first
      const card = await apiClient.searchCardBySerial(scanData);
      
      if (!card) {
        setError(`Karte mit Seriennummer "${scanData}" nicht gefunden`);
        addToast('error', `Karte "${scanData}" nicht gefunden`);
        setCurrentCard(null);
        return;
      }

      setCurrentCard(card);
      setError(null);
      
      // Show success message
      addToast('success', `Karte geladen: ${card.memberDisplayName}`, 3000);
      
    } catch (error) {
      console.error('Scan error:', error);
      
      if (error instanceof ApiError) {
        const errorMsg = error.getGermanMessage();
        setError(errorMsg);
        addToast('error', errorMsg);
      } else {
        const errorMsg = 'Fehler beim Laden der Karte';
        setError(errorMsg);
        addToast('error', errorMsg);
      }
      setCurrentCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!currentCard || processing) {
      return;
    }

    // Check if card is actionable
    const isExpired = new Date(currentCard.expiresAt) < new Date();
    const isActionable = currentCard.state === 'Active' && !isExpired;
    
    if (!isActionable) {
      const reason = currentCard.state === 'Expired' || isExpired
        ? 'Karte ist abgelaufen'
        : currentCard.state === 'UsedUp'
        ? 'Alle Besuche aufgebraucht'
        : currentCard.state === 'Cancelled'
        ? 'Karte wurde storniert'
        : 'Aktion nicht möglich';
      
      addToast('error', reason);
      return;
    }

    setProcessing(true);
    
    try {
      const updatedCard = await apiClient.deductCard(currentCard.cardId);
      setCurrentCard(updatedCard);
      
      // Show success message
      const remaining = updatedCard.remainingUses;
      const message = currentCard.product === 'cycling_bonus'
        ? `Erfolg: 1 Besuch verbucht. Rest: ${remaining} Besuche`
        : 'Erfolg: Besuch verbucht';
      
      addToast('success', message, 4000);
      
    } catch (error) {
      console.error('Deduct error:', error);
      
      if (error instanceof ApiError) {
        const errorMsg = error.getGermanMessage();
        addToast('error', errorMsg);
        
        // If it's an expired card error, refresh the card data
        if (error.message.includes('expired')) {
          try {
            const refreshedCard = await apiClient.searchCardBySerial(currentCard.serial);
            if (refreshedCard) {
              setCurrentCard(refreshedCard);
            }
          } catch (refreshError) {
            console.error('Failed to refresh card:', refreshError);
          }
        }
      } else {
        addToast('error', 'Fehler beim Verbuchen des Besuchs');
      }
    } finally {
      setProcessing(false);
    }
  };

  const isCardActionable = currentCard 
    && currentCard.state === 'Active' 
    && new Date(currentCard.expiresAt) >= new Date();

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Empfang - Besuchsverrechnung</h1>
        <div className="user-info">
          <span>Angemeldet als: {user.displayName}</span>
          {user.role === 'admin' && (
            <button 
              className="btn btn-secondary mr-8" 
              onClick={onNavigateToAdmin}
            >
              Admin
            </button>
          )}
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
          {/* Left Panel - Scanner and Actions */}
          <div>
            <div className="card mb-16">
              <div className="card-header">
                Scanner
              </div>
              <div className="card-body">
                <ScanInput
                  onScan={handleScan}
                  disabled={loading || processing}
                  placeholder="Bonuskarte scannen..."
                />
              </div>
            </div>
            
            {currentCard && (
              <div className="card">
                <div className="card-header">
                  Aktion
                </div>
                <div className="card-body">
                  <button
                    className="btn btn-success btn-lg"
                    style={{ width: '100%' }}
                    onClick={handleConfirm}
                    disabled={!isCardActionable || processing}
                  >
                    {processing ? 'Verarbeitung...' : 'Bestätigen'}
                  </button>
                  
                  {!isCardActionable && currentCard && (
                    <div style={{ marginTop: '12px' }}>
                      <small className="text-danger">
                        {currentCard.state === 'Expired' || new Date(currentCard.expiresAt) < new Date()
                          ? `Abgelaufen am ${new Date(currentCard.expiresAt).toLocaleDateString('de-DE')}`
                          : currentCard.state === 'UsedUp'
                          ? 'Alle Besuche aufgebraucht'
                          : currentCard.state === 'Cancelled'
                          ? 'Karte wurde storniert'
                          : 'Aktion nicht möglich'
                        }
                      </small>
                    </div>
                  )}
                </div>
              </div>
            )}
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
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default ReceptionScreen;