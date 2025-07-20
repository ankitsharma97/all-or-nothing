"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.AtomicApiOperations = exports.OutboxTransaction = exports.TransactionalOutbox = exports.IdempotencyMiddleware = exports.SagaOrchestrator = void 0;
// Import core classes
const SagaOrchestrator_1 = require("./core/SagaOrchestrator");
const IdempotencyMiddleware_1 = require("./middleware/IdempotencyMiddleware");
const TransactionalOutbox_1 = require("./patterns/TransactionalOutbox");
// Core exports
var SagaOrchestrator_2 = require("./core/SagaOrchestrator");
Object.defineProperty(exports, "SagaOrchestrator", { enumerable: true, get: function () { return SagaOrchestrator_2.SagaOrchestrator; } });
var IdempotencyMiddleware_2 = require("./middleware/IdempotencyMiddleware");
Object.defineProperty(exports, "IdempotencyMiddleware", { enumerable: true, get: function () { return IdempotencyMiddleware_2.IdempotencyMiddleware; } });
var TransactionalOutbox_2 = require("./patterns/TransactionalOutbox");
Object.defineProperty(exports, "TransactionalOutbox", { enumerable: true, get: function () { return TransactionalOutbox_2.TransactionalOutbox; } });
Object.defineProperty(exports, "OutboxTransaction", { enumerable: true, get: function () { return TransactionalOutbox_2.OutboxTransaction; } });
// Main class that orchestrates all functionality
class AtomicApiOperations {
    constructor(config) {
        this.logger = config.logger || new ConsoleLogger();
        // Initialize saga orchestrator
        this.orchestrator = new SagaOrchestrator_1.SagaOrchestrator(config.sagaStore, this.logger, config.defaultRetryPolicy, config.defaultTimeout);
        // Initialize idempotency middleware
        this.idempotencyMiddleware = new IdempotencyMiddleware_1.IdempotencyMiddleware(config.idempotencyStore, this.logger);
        // Initialize outbox if configured
        if (config.outboxStore && config.messageBroker) {
            this.outbox = new TransactionalOutbox_1.TransactionalOutbox(config.outboxStore, config.messageBroker, this.logger);
        }
    }
    /**
     * Execute a saga with the given definition and context
     */
    async executeSaga(definition, context) {
        return this.orchestrator.executeSaga(definition, context);
    }
    /**
     * Get saga execution by ID
     */
    async getExecution(id) {
        return this.orchestrator.getExecution(id);
    }
    /**
     * List saga executions with optional filters
     */
    async listExecutions(sagaId, status) {
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
    generateIdempotencyKey() {
        return this.idempotencyMiddleware.generateKey();
    }
    /**
     * Start the outbox processor (if configured)
     */
    startOutbox() {
        if (this.outbox) {
            this.outbox.start();
        }
        else {
            this.logger.warn('Outbox not configured, cannot start processor');
        }
    }
    /**
     * Stop the outbox processor
     */
    stopOutbox() {
        if (this.outbox) {
            this.outbox.stop();
        }
    }
    /**
     * Get outbox statistics
     */
    async getOutboxStats() {
        if (this.outbox) {
            return this.outbox.getStats();
        }
        return null;
    }
    /**
     * Create a transaction that includes outbox event storage
     */
    createOutboxTransaction() {
        if (this.outbox) {
            return new TransactionalOutbox_1.OutboxTransaction(this.outbox, this.logger);
        }
        return null;
    }
}
exports.AtomicApiOperations = AtomicApiOperations;
// Simple console logger implementation
class ConsoleLogger {
    info(message, meta) {
        console.log(`[INFO] ${message}`, meta || '');
    }
    error(message, error, meta) {
        console.error(`[ERROR] ${message}`, error?.message || '', meta || '');
    }
    warn(message, meta) {
        console.warn(`[WARN] ${message}`, meta || '');
    }
    debug(message, meta) {
        console.debug(`[DEBUG] ${message}`, meta || '');
    }
}
// Utility functions
exports.utils = {
    /**
     * Generate a unique saga ID
     */
    generateSagaId() {
        return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    /**
     * Generate a unique step ID
     */
    generateStepId() {
        return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    /**
     * Create a retry policy
     */
    createRetryPolicy(maxAttempts = 3, backoffMs = 1000, backoffMultiplier = 2) {
        return { maxAttempts, backoffMs, backoffMultiplier };
    },
    /**
     * Validate saga definition
     */
    validateSagaDefinition(definition) {
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
exports.default = AtomicApiOperations;
//# sourceMappingURL=index.js.map