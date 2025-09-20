"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.debounce = debounce;
const uuid_1 = require("uuid");
/**
 * Generates a unique idempotency key for API requests
 * This ensures that repeated operations (like scanner double-reads) don't cause duplicate actions
 */
function generateIdempotencyKey() {
    return (0, uuid_1.v4)();
}
/**
 * Creates a debounced function that delays execution until after wait milliseconds
 * have elapsed since the last time it was invoked
 */
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
