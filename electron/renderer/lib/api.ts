import { generateIdempotencyKey } from './idempotency';

export interface CardSnapshot {
  cardId: string;
  serial: string;
  memberDisplayName: string;
  product: 'cycling_bonus' | 'cycling_unlimited';
  state: 'Active' | 'Expired' | 'UsedUp' | 'Cancelled';
  remainingUses: number | null;
  expiresAt: string; // ISO date string
}

export interface Staff {
  staffId: string;
  username: string;
  displayName: string;
  email: string;
  role: 'reception' | 'admin';
}

export interface AppConfig {
  key: string;
  value: string;
  description?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export class ApiClient {
  private baseUrl: string;
  private authUsername: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  setAuth(username: string): void {
    this.authUsername = username;
  }

  clearAuth(): void {
    this.authUsername = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.authUsername) {
      headers['x-staff-username'] = this.authUsername;
    }

    if (idempotencyKey) {
      headers['x-idempotency-key'] = idempotencyKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      
      throw new ApiError(response.status, errorData.error, errorData.details);
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ ok: boolean; dbTime: string }> {
    return this.request('/health');
  }

  // Authentication & Staff
  async getStaffByUsername(username: string): Promise<Staff | null> {
    try {
      return await this.request(`/staff/${encodeURIComponent(username)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Card Operations
  async getCard(cardId: string): Promise<CardSnapshot | null> {
    try {
      return await this.request(`/cards/${cardId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async searchCardBySerial(serial: string): Promise<CardSnapshot | null> {
    try {
      const response = await this.request<{ cards: CardSnapshot[] }>(`/admin/search?serial=${encodeURIComponent(serial)}`);
      return response.cards.length > 0 ? response.cards[0] : null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async deductCard(cardId: string): Promise<CardSnapshot> {
    const idempotencyKey = generateIdempotencyKey();
    return this.request(`/cards/${cardId}/deduct`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, idempotencyKey);
  }

  async rollbackCard(cardId: string, reasonCode: string, note?: string): Promise<CardSnapshot> {
    const idempotencyKey = generateIdempotencyKey();
    return this.request(`/admin/${cardId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, note }),
    }, idempotencyKey);
  }

  async cancelCard(cardId: string, reasonCode?: string, note?: string): Promise<CardSnapshot> {
    return this.request(`/admin/${cardId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, note }),
    });
  }

  // Reports
  async getReportUrl(
    reportType: 'deductions' | 'rollbacks' | 'cancellations' | 'expirations',
    startDate?: string,
    endDate?: string
  ): Promise<string> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    return `${this.baseUrl}/admin/reports/${reportType}${queryString ? `?${queryString}` : ''}`;
  }

  // App Configuration
  async getAppConfig(): Promise<AppConfig[]> {
    return this.request('/admin/config');
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isConflict(): boolean {
    return this.status === 409;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Get user-friendly German error message
   */
  getGermanMessage(): string {
    if (this.isUnauthorized()) {
      return 'Anmeldung erforderlich. Bitte melden Sie sich erneut an.';
    }
    
    if (this.isForbidden()) {
      return 'Fehlende Berechtigung für diese Aktion.';
    }
    
    if (this.isNotFound()) {
      return 'Ressource nicht gefunden.';
    }

    if (this.isConflict()) {
      // Parse specific conflict messages
      if (this.message.includes('expired')) {
        return 'Karte ist abgelaufen.';
      }
      if (this.message.includes('Cannot deduct from card in state')) {
        return 'Aktion nicht möglich. Karte ist nicht aktiv.';
      }
      if (this.message.includes('No remaining uses')) {
        return 'Keine Besuche mehr verfügbar.';
      }
      return 'Aktion nicht möglich. Bitte versuchen Sie es erneut.';
    }

    // Generic server error
    return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  }
}