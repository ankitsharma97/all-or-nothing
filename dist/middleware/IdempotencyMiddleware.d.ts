import { Request, Response, NextFunction } from 'express';
import { IdempotencyStore, Logger } from '../types';
/**
 * Idempotency Middleware for Express
 * Ensures that API operations are idempotent using unique idempotency keys
 */
export declare class IdempotencyMiddleware {
    private readonly store;
    private readonly logger;
    private readonly keyHeader;
    private readonly keyExpiryHours;
    constructor(store: IdempotencyStore, logger: Logger, keyHeader?: string, keyExpiryHours?: number);
    /**
     * Express middleware function
     */
    middleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Generate a unique idempotency key
     */
    generateKey(): string;
    /**
     * Validate idempotency key format
     */
    validateKey(key: string): boolean;
    /**
     * Clean up expired idempotency keys
     */
    cleanupExpiredKeys(): Promise<void>;
}
/**
 * Decorator for marking methods as idempotent
 */
export declare function Idempotent(keyGenerator?: () => string): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=IdempotencyMiddleware.d.ts.map