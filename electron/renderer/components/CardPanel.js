"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const CardPanel = ({ card, loading = false, error = null }) => {
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        }
        catch {
            return 'Ungültig';
        }
    };
    const getDaysUntilExpiry = (expiresAt) => {
        try {
            const expiry = new Date(expiresAt);
            const now = new Date();
            const diffTime = expiry.getTime() - now.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        catch {
            return 0;
        }
    };
    const getProductDisplayName = (product) => {
        switch (product) {
            case 'cycling_bonus':
                return 'Cycling Bonus (11 Besuche)';
            case 'cycling_unlimited':
                return 'Cycling Unlimited (Monatsabo)';
            default:
                return product;
        }
    };
    const getStateDisplayName = (state) => {
        switch (state) {
            case 'Active':
                return 'Aktiv';
            case 'Expired':
                return 'Abgelaufen';
            case 'UsedUp':
                return 'Aufgebraucht';
            case 'Cancelled':
                return 'Storniert';
            default:
                return state;
        }
    };
    const isExpired = card && new Date(card.expiresAt) < new Date();
    const isActionable = card && card.state === 'Active' && !isExpired;
    if (loading) {
        return (<div className="card">
        <div className="card-header">
          Karte wird geladen...
        </div>
        <div className="card-body">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Kartendaten werden abgerufen...</p>
          </div>
        </div>
      </div>);
    }
    if (error) {
        return (<div className="card">
        <div className="card-header">
          Fehler
        </div>
        <div className="card-body">
          <div className="alert alert-danger">
            {error}
          </div>
        </div>
      </div>);
    }
    if (!card) {
        return (<div className="card">
        <div className="card-header">
          Bonuskarte
        </div>
        <div className="card-body text-center text-muted">
          <p style={{ fontSize: '48px', margin: '20px 0' }}>📱</p>
          <p>Bitte scannen Sie eine Bonuskarte</p>
        </div>
      </div>);
    }
    const daysLeft = getDaysUntilExpiry(card.expiresAt);
    return (<div className="card">
      <div className="card-header d-flex justify-between align-center">
        <span>Bonuskarte</span>
        <span className={`status ${card.state.toLowerCase()}`}>
          {getStateDisplayName(card.state)}
        </span>
      </div>
      
      <div className="card-body">
        <div className="card-info-grid">
          <div className="info-row">
            <label>Kunde:</label>
            <span>{card.memberDisplayName}</span>
          </div>
          
          <div className="info-row">
            <label>Produkt:</label>
            <span>{getProductDisplayName(card.product)}</span>
          </div>
          
          <div className="info-row">
            <label>Seriennummer:</label>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {card.serial}
            </span>
          </div>
          
          <div className="info-row">
            <label>Restguthaben:</label>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {card.product === 'cycling_bonus'
            ? `${card.remainingUses || 0} Besuche`
            : 'Unlimited'}
            </span>
          </div>
          
          <div className="info-row">
            <label>Ablaufdatum:</label>
            <span>
              {formatDate(card.expiresAt)}
              {daysLeft > 0 && (<small className="text-muted ml-8">
                  (in {daysLeft} Tagen)
                </small>)}
              {daysLeft <= 0 && (<small className="text-danger ml-8">
                  (Abgelaufen)
                </small>)}
            </span>
          </div>
          
          <div className="info-row">
            <label>Zustand:</label>
            <div>
              <span className={`status ${card.state.toLowerCase()}`}>
                {getStateDisplayName(card.state)}
              </span>
              {!isActionable && (<div style={{ marginTop: '4px' }}>
                  <small className="text-danger">
                    {card.state === 'Expired' || isExpired
                ? 'Karte ist abgelaufen'
                : card.state === 'UsedUp'
                    ? 'Alle Besuche aufgebraucht'
                    : card.state === 'Cancelled'
                        ? 'Karte wurde storniert'
                        : 'Aktion nicht möglich'}
                  </small>
                </div>)}
            </div>
          </div>
        </div>
        
        {isActionable && (<div className="card-action-hint" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
            <small className="text-success">
              ✓ Karte bereit für Besuchsverrechnung
            </small>
          </div>)}
      </div>
    </div>);
};
exports.default = CardPanel;
