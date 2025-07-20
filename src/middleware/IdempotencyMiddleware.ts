import { Request, Response, NextFunction } from 'express';
import { IdempotencyStore, Logger } from '../types';

/**
 * Idempotency Middleware for Express
 * Ensures that API operations are idempotent using unique idempotency keys
 */
export class IdempotencyMiddleware {
  private readonly store: IdempotencyStore;
  private readonly logger: Logger;
  private readonly keyHeader: string;
  private readonly keyExpiryHours: number;

  constructor(
    store: IdempotencyStore,
    logger: Logger,
    keyHeader: string = 'X-Idempotency-Key',
    keyExpiryHours: number = 24
  ) {
    this.store = store;
    this.logger = logger;
    this.keyHeader = keyHeader;
    this.keyExpiryHours = keyExpiryHours;
  }

  /**
   * Express middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const idempotencyKey = req.headers[this.keyHeader.toLowerCase()] as string;

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

      } catch (error) {
        this.logger.error('Error in idempotency middleware', error as Error, {
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
  generateKey(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate idempotency key format
   */
  validateKey(key: string): boolean {
    // Basic validation - can be customized based on requirements
    return key.length > 0 && key.length <= 255;
  }

  /**
   * Clean up expired idempotency keys
   */
  async cleanupExpiredKeys(): Promise<void> {
    // This would be implemented based on the specific store implementation
    // For now, we'll leave it as a placeholder
    this.logger.debug('Cleanup of expired idempotency keys not implemented for this store');
  }
}

/**
 * Decorator for marking methods as idempotent
 */
export function Idempotent(keyGenerator?: () => string) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator() : `method_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // This is a simplified implementation
      // In a real scenario, you'd need access to the idempotency store
      console.log(`Idempotent method called with key: ${key}`);
      
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
} 