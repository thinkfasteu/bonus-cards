import React, { useState, useEffect } from 'react';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

interface StatusIndicatorProps {
  apiBaseUrl: string;
  checkInterval?: number; // in milliseconds
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  apiBaseUrl, 
  checkInterval = 30000, // 30 seconds default
  className = '' 
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async (): Promise<boolean> => {
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('API connection check failed:', error);
      return false;
    }
  };

  const performCheck = async () => {
    setStatus('checking');
    const isConnected = await checkConnection();
    setStatus(isConnected ? 'connected' : 'disconnected');
    setLastCheck(new Date());
  };

  useEffect(() => {
    // Initial check
    performCheck();

    // Set up periodic checks
    const interval = setInterval(performCheck, checkInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [apiBaseUrl, checkInterval]);

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return '#28a745'; // Green
      case 'disconnected':
        return '#dc3545'; // Red
      case 'checking':
        return '#ffc107'; // Yellow
      default:
        return '#6c757d'; // Gray
    }
  };

  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'Verbunden';
      case 'disconnected':
        return 'Getrennt';
      case 'checking':
        return 'Prüfen...';
      default:
        return 'Unbekannt';
    }
  };

  const getStatusTitle = (status: ConnectionStatus): string => {
    const baseText = getStatusText(status);
    const lastCheckText = lastCheck 
      ? `Letzte Prüfung: ${lastCheck.toLocaleTimeString('de-DE')}`
      : '';
    
    return `API Status: ${baseText}\n${lastCheckText}\nServer: ${apiBaseUrl}`;
  };

  return (
    <div 
      className={`status-indicator ${className}`}
      title={getStatusTitle(status)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        fontSize: '14px',
        cursor: 'help'
      }}
    >
      <div
        className="status-dot"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(status),
          boxShadow: status === 'checking' 
            ? '0 0 4px rgba(255, 193, 7, 0.6)' 
            : 'none',
          animation: status === 'checking' 
            ? 'pulse 1.5s ease-in-out infinite' 
            : 'none'
        }}
      />
      <span className="status-text">
        {getStatusText(status)}
      </span>
      
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 4px rgba(255, 193, 7, 0.6);
          }
          50% {
            box-shadow: 0 0 12px rgba(255, 193, 7, 0.8);
          }
          100% {
            box-shadow: 0 0 4px rgba(255, 193, 7, 0.6);
          }
        }
        
        .status-indicator:hover {
          background-color: #e9ecef;
        }
      `}</style>
    </div>
  );
};

export default StatusIndicator;