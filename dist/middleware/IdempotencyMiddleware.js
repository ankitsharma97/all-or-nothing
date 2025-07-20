"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyMiddleware = void 0;
exports.Idempotent = Idempotent;
/**
 * Idempotency Middleware for Express
 * Ensures that API operations are idempotent using unique idempotency keys
 */
class IdempotencyMiddleware {
    constructor(store, logger, keyHeader = 'X-Idempotency-Key', keyExpiryHours = 24) {
        this.store = store;
        this.logger = logger;
        this.keyHeader = keyHeader;
        this.keyExpiryHours = keyExpiryHours;
    }
    /**
     * Express middleware function
     */
    middleware() {
        return async (req, res, next) => {
            const idempotencyKey = req.headers[this.keyHeader.toLowerCase()];
            // Skip idempotency check if no key provided
            if (!idempotencyKey) {
                this.logger.debug('No idempotency key provided, skipping idempotency check');
                return next();
            }
            try {
                // Check if this request has been processed before
                const existingKey = await this.store.get(idempotencyKey);
                if (existingKey) {
                    this.logger.info('Idempotency key found, returning cached response', {
                        key: idempotencyKey,
                        method: req.method,
                        path: req.path
                    });
                    // Return 409 Conflict to indicate duplicate request
                    res.status(409).json({
                        error: 'Idempotency key already used',
                        message: 'This request has already been processed',
                        idempotencyKey
                    });
                    return;
                }
                // Store the idempotency key with expiry
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + this.keyExpiryHours);
                await this.store.set(idempotencyKey, expiresAt);
                this.logger.info('Idempotency key stored for new request', {
                    key: idempotencyKey,
                    method: req.method,
                    path: req.path,
                    expiresAt
                });
                // Continue with the request
                next();
            }
            catch (error) {
                this.logger.error('Error in idempotency middleware', error, {
                    key: idempotencyKey,
                    method: req.method,
                    path: req.path
                });
                // On error, continue with the request but log the issue
                next();
            }
        };
    }
    /**
     * Generate a unique idempotency key
     */
    generateKey() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Validate idempotency key format
     */
    validateKey(key) {
        // Basic validation - can be customized based on requirements
        return key.length > 0 && key.length <= 255;
    }
    /**
     * Clean up expired idempotency keys
     */
    async cleanupExpiredKeys() {
        // This would be implemented based on the specific store implementation
        // For now, we'll leave it as a placeholder
        this.logger.debug('Cleanup of expired idempotency keys not implemented for this store');
    }
}
exports.IdempotencyMiddleware = IdempotencyMiddleware;
/**
 * Decorator for marking methods as idempotent
 */
function Idempotent(keyGenerator) {
    return function (_target, _propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const key = keyGenerator ? keyGenerator() : `method_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // This is a simplified implementation
            // In a real scenario, you'd need access to the idempotency store
            console.log(`Idempotent method called with key: ${key}`);
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
//# sourceMappingURL=IdempotencyMiddleware.js.map