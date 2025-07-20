/**
 * Atomic API Operations - Main Package Entry Point
 * 
 * A comprehensive npm package for ensuring atomic API operations in distributed Node.js applications
 * using Saga patterns, compensating transactions, and idempotent operations.
 * 
 * @example
 * ```typescript
 * import { AtomicApiOperations, SagaOrchestrator, IdempotencyMiddleware } from 'atomic-api-operations';
 * 
 * // Configure the package
 * const atomicApi = new AtomicApiOperations({
 *   idempotencyStore: new InMemoryIdempotencyStore(),
 *   sagaStore: new InMemorySagaStore(),
 *   logger: new WinstonLogger()
 * });
 * 
 * // Define a saga for payment processing
 * const paymentSaga = {
 *   id: 'payment-processing',
 *   name: 'Payment Processing Saga',
 *   steps: [
 *     {
 *       id: 'deduct-payment',
 *       name: 'Deduct Payment from Account',
 *       action: async (context) => {
 *         // Deduct payment logic
 *         return { transactionId: 'tx-123' };
 *       },
 *       compensation: async (context, output) => {
 *         // Refund logic
 *       }
 *     },
 *     {
 *       id: 'update-inventory',
 *       name: 'Update Inventory',
 *       action: async (context) => {
 *         // Update inventory logic
 *         return { inventoryUpdated: true };
 *       },
 *       compensation: async (context, output) => {
 *         // Restore inventory logic
 *       }
 *     }
 *   ]
 * };
 * 
 * // Execute the saga
 * const result = await atomicApi.executeSaga(paymentSaga, { amount: 100, userId: 'user-123' });
 * ```
 */

// Import core classes
import { SagaOrchestrator } from './core/SagaOrchestrator';
import { IdempotencyMiddleware } from './middleware/IdempotencyMiddleware';
import { TransactionalOutbox, OutboxTransaction } from './patterns/TransactionalOutbox';

// Import types
import type {
  SagaDefinition,
  SagaExecution,
  SagaStatus,
  RetryPolicy,
  Logger,
  AtomicApiConfig
} from './types';

// Core exports
export { SagaOrchestrator } from './core/SagaOrchestrator';
export { IdempotencyMiddleware } from './middleware/IdempotencyMiddleware';
export { TransactionalOutbox, OutboxTransaction } from './patterns/TransactionalOutbox';

// Type exports
export type {
  // Core types
  SagaDefinition,
  SagaExecution,
  SagaStatus,
  TransactionStep,
  StepResult,
  RetryPolicy,
  
  // Store interfaces
  IdempotencyStore,
  SagaStore,
  OutboxStore,
  MessageBroker,
  Logger,
  
  // Configuration
  AtomicApiConfig,
  
  // Request/Response types
  IdempotentRequest,
  IdempotentResponse,
  IdempotencyKey,
  OutboxEvent
} from './types';

// Main class that orchestrates all functionality
export class AtomicApiOperations {
  private readonly orchestrator: SagaOrchestrator;
  private readonly idempotencyMiddleware: IdempotencyMiddleware;
  private readonly outbox?: TransactionalOutbox;
  private readonly logger: Logger;

  constructor(config: AtomicApiConfig) {
    this.logger = config.logger || new ConsoleLogger();
    
    // Initialize saga orchestrator
    this.orchestrator = new SagaOrchestrator(
      config.sagaStore,
      this.logger,
      config.defaultRetryPolicy,
      config.defaultTimeout
    );

    // Initialize idempotency middleware
    this.idempotencyMiddleware = new IdempotencyMiddleware(
      config.idempotencyStore,
      this.logger
    );

    // Initialize outbox if configured
    if (config.outboxStore && config.messageBroker) {
      this.outbox = new TransactionalOutbox(
        config.outboxStore,
        config.messageBroker,
        this.logger
      );
    }
  }

  /**
   * Execute a saga with the given definition and context
   */
  async executeSaga<TContext = any>(
    definition: SagaDefinition<TContext>,
    context: TContext
  ): Promise<SagaExecution> {
    return this.orchestrator.executeSaga(definition, context);
  }

  /**
   * Get saga execution by ID
   */
  async getExecution(id: string): Promise<SagaExecution | null> {
    return this.orchestrator.getExecution(id);
  }

  /**
   * List saga executions with optional filters
   */
  async listExecutions(sagaId?: string, status?: SagaStatus): Promise<SagaExecution[]> {
    return this.orchestrator.listExecutions(sagaId, status);
  }

  /**
   * Get the idempotency middleware for Express
   */
  getIdempotencyMiddleware() {
    return this.idempotencyMiddleware.middleware();
  }

  /**
   * Generate a unique idempotency key
   */
  generateIdempotencyKey(): string {
    return this.idempotencyMiddleware.generateKey();
  }

  /**
   * Start the outbox processor (if configured)
   */
  startOutbox(): void {
    if (this.outbox) {
      this.outbox.start();
    } else {
      this.logger.warn('Outbox not configured, cannot start processor');
    }
  }

  /**
   * Stop the outbox processor
   */
  stopOutbox(): void {
    if (this.outbox) {
      this.outbox.stop();
    }
  }

  /**
   * Get outbox statistics
   */
  async getOutboxStats(): Promise<{ pending: number; published: number; failed: number } | null> {
    if (this.outbox) {
      return this.outbox.getStats();
    }
    return null;
  }

  /**
   * Create a transaction that includes outbox event storage
   */
  createOutboxTransaction(): OutboxTransaction | null {
    if (this.outbox) {
      return new OutboxTransaction(this.outbox, this.logger);
    }
    return null;
  }
}

// Simple console logger implementation
class ConsoleLogger implements Logger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(`[ERROR] ${message}`, error?.message || '', meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}

// Utility functions
export const utils = {
  /**
   * Generate a unique saga ID
   */
  generateSagaId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate a unique step ID
   */
  generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create a retry policy
   */
  createRetryPolicy(maxAttempts: number = 3, backoffMs: number = 1000, backoffMultiplier: number = 2): RetryPolicy {
    return { maxAttempts, backoffMs, backoffMultiplier };
  },

  /**
   * Validate saga definition
   */
  validateSagaDefinition(definition: SagaDefinition): boolean {
    if (!definition.id || !definition.name || !definition.steps || definition.steps.length === 0) {
      return false;
    }

    for (const step of definition.steps) {
      if (!step.id || !step.name || typeof step.action !== 'function') {
        return false;
      }
    }

    return true;
  }
};

// Default export
export default AtomicApiOperations; 