"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.ApiClient = void 0;
const idempotency_1 = require("./idempotency");
class ApiClient {
    constructor(baseUrl) {
        this.authUsername = null;
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    setAuth(username) {
        this.authUsername = username;
    }
    clearAuth() {
        this.authUsername = null;
    }
    async request(endpoint, options = {}, idempotencyKey) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
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
            const errorData = await response.json().catch(() => ({
                error: `HTTP ${response.status}: ${response.statusText}`,
            }));
            throw new ApiError(response.status, errorData.error, errorData.details);
        }
        return response.json();
    }
    // Health check
    async healthCheck() {
        return this.request('/health');
    }
    // Authentication & Staff
    async getStaffByUsername(username) {
        try {
            return await this.request(`/staff/${encodeURIComponent(username)}`);
        }
        catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }
    // Card Operations
    async getCard(cardId) {
        try {
            return await this.request(`/cards/${cardId}`);
        }
        catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }
    async searchCardBySerial(serial) {
        try {
            const response = await this.request(`/admin/search?serial=${encodeURIComponent(serial)}`);
            return response.cards.length > 0 ? response.cards[0] : null;
        }
        catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }
    async deductCard(cardId) {
        const idempotencyKey = (0, idempotency_1.generateIdempotencyKey)();
        return this.request(`/cards/${cardId}/deduct`, {
            method: 'POST',
            body: JSON.stringify({}),
        }, idempotencyKey);
    }
    async rollbackCard(cardId, reasonCode, note) {
        const idempotencyKey = (0, idempotency_1.generateIdempotencyKey)();
        return this.request(`/admin/${cardId}/rollback`, {
            method: 'POST',
            body: JSON.stringify({ reasonCode, note }),
        }, idempotencyKey);
    }
    async cancelCard(cardId, reasonCode, note) {
        return this.request(`/admin/${cardId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reasonCode, note }),
        });
    }
    // Reports
    async getReportUrl(reportType, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate)
            params.append('startDate', startDate);
        if (endDate)
            params.append('endDate', endDate);
        const queryString = params.toString();
        return `${this.baseUrl}/admin/reports/${reportType}${queryString ? `?${queryString}` : ''}`;
    }
    // App Configuration
    async getAppConfig() {
        return this.request('/admin/config');
    }
}
exports.ApiClient = ApiClient;
class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'ApiError';
    }
    isUnauthorized() {
        return this.status === 401;
    }
    isForbidden() {
        return this.status === 403;
    }
    isConflict() {
        return this.status === 409;
    }
    isNotFound() {
        return this.status === 404;
    }
    /**
     * Get user-friendly German error message
     */
    getGermanMessage() {
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
exports.ApiError = ApiError;
