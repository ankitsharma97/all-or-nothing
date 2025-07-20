import { OutboxStore, MessageBroker, Logger } from '../types';
/**
 * Transactional Outbox Pattern Implementation
 * Ensures atomic database updates and event publishing by storing events in the same transaction
 */
export declare class TransactionalOutbox {
    private readonly store;
    private readonly messageBroker;
    private readonly logger;
    private readonly pollingInterval;
    private readonly maxRetries;
    private isRunning;
    private poller?;
    constructor(store: OutboxStore, messageBroker: MessageBroker, logger: Logger, pollingInterval?: number, maxRetries?: number);
    /**
     * Store an event in the outbox (should be called within a database transaction)
     */
    storeEvent(sagaId: string, stepId: string, eventType: string, payload: any): Promise<string>;
    /**
     * Start the outbox processor (polls for pending events and publishes them)
     */
    start(): void;
    /**
     * Stop the outbox processor
     */
    stop(): void;
    /**
     * Process all pending events in the outbox
     */
    private processPendingEvents;
    /**
     * Process a single event
     */
    private processEvent;
    /**
     * Get the topic name for an event type
     * This can be customized based on your event naming conventions
     */
    private getTopicForEvent;
    /**
     * Manually trigger processing of pending events
     */
    processNow(): Promise<void>;
    /**
     * Get statistics about the outbox
     */
    getStats(): Promise<{
        pending: number;
        published: number;
        failed: number;
    }>;
}
/**
 * Database transaction wrapper for outbox operations
 * This ensures that both the business data and the outbox event are saved atomically
 */
export declare class OutboxTransaction {
    private readonly outbox;
    private readonly logger;
    constructor(outbox: TransactionalOutbox, logger: Logger);
    /**
     * Execute a transaction that includes both business logic and outbox event storage
     */
    execute<T>(businessLogic: () => Promise<T>, eventData: {
        sagaId: string;
        stepId: string;
        eventType: string;
        payload: any;
    }): Promise<T>;
}
//# sourceMappingURL=TransactionalOutbox.d.ts.map