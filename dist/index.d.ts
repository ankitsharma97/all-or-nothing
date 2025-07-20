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
import { OutboxTransaction } from './patterns/TransactionalOutbox';
import type { SagaDefinition, SagaExecution, SagaStatus, RetryPolicy, AtomicApiConfig } from './types';
export { SagaOrchestrator } from './core/SagaOrchestrator';
export { IdempotencyMiddleware } from './middleware/IdempotencyMiddleware';
export { TransactionalOutbox, OutboxTransaction } from './patterns/TransactionalOutbox';
export type { SagaDefinition, SagaExecution, SagaStatus, TransactionStep, StepResult, RetryPolicy, IdempotencyStore, SagaStore, OutboxStore, MessageBroker, Logger, AtomicApiConfig, IdempotentRequest, IdempotentResponse, IdempotencyKey, OutboxEvent } from './types';
export declare class AtomicApiOperations {
    private readonly orchestrator;
    private readonly idempotencyMiddleware;
    private readonly outbox?;
    private readonly logger;
    constructor(config: AtomicApiConfig);
    /**
     * Execute a saga with the given definition and context
     */
    executeSaga<TContext = any>(definition: SagaDefinition<TContext>, context: TContext): Promise<SagaExecution>;
    /**
     * Get saga execution by ID
     */
    getExecution(id: string): Promise<SagaExecution | null>;
    /**
     * List saga executions with optional filters
     */
    listExecutions(sagaId?: string, status?: SagaStatus): Promise<SagaExecution[]>;
    /**
     * Get the idempotency middleware for Express
     */
    getIdempotencyMiddleware(): (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
    /**
     * Generate a unique idempotency key
     */
    generateIdempotencyKey(): string;
    /**
     * Start the outbox processor (if configured)
     */
    startOutbox(): void;
    /**
     * Stop the outbox processor
     */
    stopOutbox(): void;
    /**
     * Get outbox statistics
     */
    getOutboxStats(): Promise<{
        pending: number;
        published: number;
        failed: number;
    } | null>;
    /**
     * Create a transaction that includes outbox event storage
     */
    createOutboxTransaction(): OutboxTransaction | null;
}
export declare const utils: {
    /**
     * Generate a unique saga ID
     */
    generateSagaId(): string;
    /**
     * Generate a unique step ID
     */
    generateStepId(): string;
    /**
     * Create a retry policy
     */
    createRetryPolicy(maxAttempts?: number, backoffMs?: number, backoffMultiplier?: number): RetryPolicy;
    /**
     * Validate saga definition
     */
    validateSagaDefinition(definition: SagaDefinition): boolean;
};
export default AtomicApiOperations;
//# sourceMappingURL=index.d.ts.map