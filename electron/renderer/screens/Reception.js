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
const ScanInput_1 = __importDefault(require("../components/ScanInput"));
const CardPanel_1 = __importDefault(require("../components/CardPanel"));
const Toast_1 = require("../components/Toast");
const idempotency_1 = require("../lib/idempotency");
const ReceptionScreen = ({ apiClient, user, onLogout, onNavigateToAdmin }) => {
    const [currentCard, setCurrentCard] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const [processing, setProcessing] = (0, react_1.useState)(false);
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
    const handleScan = async (scanData) => {
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
        }
        catch (error) {
            console.error('Scan error:', error);
            if (error instanceof api_1.ApiError) {
                const errorMsg = error.getGermanMessage();
                setError(errorMsg);
                addToast('error', errorMsg);
            }
            else {
                const errorMsg = 'Fehler beim Laden der Karte';
                setError(errorMsg);
                addToast('error', errorMsg);
            }
            setCurrentCard(null);
        }
        finally {
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
        }
        catch (error) {
            console.error('Deduct error:', error);
            if (error instanceof api_1.ApiError) {
                const errorMsg = error.getGermanMessage();
                addToast('error', errorMsg);
                // If it's an expired card error, refresh the card data
                if (error.message.includes('expired')) {
                    try {
                        const refreshedCard = await apiClient.searchCardBySerial(currentCard.serial);
                        if (refreshedCard) {
                            setCurrentCard(refreshedCard);
                        }
                    }
                    catch (refreshError) {
                        console.error('Failed to refresh card:', refreshError);
                    }
                }
            }
            else {
                addToast('error', 'Fehler beim Verbuchen des Besuchs');
            }
        }
        finally {
            setProcessing(false);
        }
    };
    const isCardActionable = currentCard
        && currentCard.state === 'Active'
        && new Date(currentCard.expiresAt) >= new Date();
    return (<div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Empfang - Besuchsverrechnung</h1>
        <div className="user-info">
          <span>Angemeldet als: {user.displayName}</span>
          {user.role === 'admin' && (<button className="btn btn-secondary mr-8" onClick={onNavigateToAdmin}>
              Admin
            </button>)}
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
                <ScanInput_1.default onScan={handleScan} disabled={loading || processing} placeholder="Bonuskarte scannen..."/>
              </div>
            </div>
            
            {currentCard && (<div className="card">
                <div className="card-header">
                  Aktion
                </div>
                <div className="card-body">
                  <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={handleConfirm} disabled={!isCardActionable || processing}>
                    {processing ? 'Verarbeitung...' : 'Bestätigen'}
                  </button>
                  
                  {!isCardActionable && currentCard && (<div style={{ marginTop: '12px' }}>
                      <small className="text-danger">
                        {currentCard.state === 'Expired' || new Date(currentCard.expiresAt) < new Date()
                    ? `Abgelaufen am ${new Date(currentCard.expiresAt).toLocaleDateString('de-DE')}`
                    : currentCard.state === 'UsedUp'
                        ? 'Alle Besuche aufgebraucht'
                        : currentCard.state === 'Cancelled'
                            ? 'Karte wurde storniert'
                            : 'Aktion nicht möglich'}
                      </small>
                    </div>)}
                </div>
              </div>)}
          </div>
          
          {/* Right Panel - Card Information */}
          <div>
            <CardPanel_1.default card={currentCard} loading={loading} error={error}/>
          </div>
        </div>
      </div>
      
      <Toast_1.ToastContainer toasts={toasts} onRemove={removeToast}/>
    </div>);
};
exports.default = ReceptionScreen;
