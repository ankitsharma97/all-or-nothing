"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxTransaction = exports.TransactionalOutbox = void 0;
const uuid_1 = require("uuid");
/**
 * Transactional Outbox Pattern Implementation
 * Ensures atomic database updates and event publishing by storing events in the same transaction
 */
class TransactionalOutbox {
    constructor(store, messageBroker, logger, pollingInterval = 5000, maxRetries = 3) {
        this.isRunning = false;
        this.store = store;
        this.messageBroker = messageBroker;
        this.logger = logger;
        this.pollingInterval = pollingInterval;
        this.maxRetries = maxRetries;
    }
    /**
     * Store an event in the outbox (should be called within a database transaction)
     */
    async storeEvent(sagaId, stepId, eventType, payload) {
        const eventId = (0, uuid_1.v4)();
        const event = {
            id: eventId,
            sagaId,
            stepId,
            eventType,
            payload,
            status: 'PENDING',
            createdAt: new Date(),
            retryCount: 0
        };
        await this.store.saveEvent(event);
        this.logger.info('Event stored in outbox', {
            eventId,
            sagaId,
            stepId,
            eventType
        });
        return eventId;
    }
    /**
     * Start the outbox processor (polls for pending events and publishes them)
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('Outbox processor is already running');
            return;
        }
        this.isRunning = true;
        this.logger.info('Starting outbox processor', {
            pollingInterval: this.pollingInterval
        });
        this.poller = setInterval(() => {
            this.processPendingEvents().catch(error => {
                this.logger.error('Error processing pending events', error);
            });
        }, this.pollingInterval);
    }
    /**
     * Stop the outbox processor
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.poller) {
            clearInterval(this.poller);
            this.poller = undefined;
        }
        this.logger.info('Outbox processor stopped');
    }
    /**
     * Process all pending events in the outbox
     */
    async processPendingEvents() {
        try {
            const pendingEvents = await this.store.getPendingEvents();
            if (pendingEvents.length === 0) {
                return;
            }
            this.logger.debug(`Processing ${pendingEvents.length} pending events`);
            for (const event of pendingEvents) {
                await this.processEvent(event);
            }
        }
        catch (error) {
            this.logger.error('Error fetching pending events', error);
        }
    }
    /**
     * Process a single event
     */
    async processEvent(event) {
        try {
            this.logger.debug('Processing event', {
                eventId: event.id,
                eventType: event.eventType,
                retryCount: event.retryCount
            });
            // Check if we've exceeded max retries
            if (event.retryCount >= this.maxRetries) {
                await this.store.markEventFailed(event.id, 'Max retries exceeded');
                this.logger.error('Event failed after max retries', new Error('Max retries exceeded'), {
                    eventId: event.id,
                    eventType: event.eventType,
                    maxRetries: this.maxRetries
                });
                return;
            }
            // Publish the event to the message broker
            const topic = this.getTopicForEvent(event.eventType);
            await this.messageBroker.publish(topic, {
                eventId: event.id,
                sagaId: event.sagaId,
                stepId: event.stepId,
                eventType: event.eventType,
                payload: event.payload,
                timestamp: event.createdAt
            });
            // Mark the event as published
            await this.store.markEventPublished(event.id);
            this.logger.info('Event published successfully', {
                eventId: event.id,
                eventType: event.eventType,
                topic
            });
        }
        catch (error) {
            this.logger.error('Error processing event', error, {
                eventId: event.id,
                eventType: event.eventType
            });
            // Increment retry count and mark as failed
            event.retryCount++;
            await this.store.markEventFailed(event.id, error.message);
        }
    }
    /**
     * Get the topic name for an event type
     * This can be customized based on your event naming conventions
     */
    getTopicForEvent(eventType) {
        // Convert event type to topic name
        // e.g., "PaymentProcessed" -> "payment.processed"
        return eventType
            .replace(/([A-Z])/g, '.$1')
            .toLowerCase()
            .replace(/^\./, '');
    }
    /**
     * Manually trigger processing of pending events
     */
    async processNow() {
        await this.processPendingEvents();
    }
    /**
     * Get statistics about the outbox
     */
    async getStats() {
        const pendingEvents = await this.store.getPendingEvents();
        // Note: This is a simplified implementation
        // In a real scenario, you'd want to query the store for these counts
        return {
            pending: pendingEvents.length,
            published: 0, // Would need to be implemented in the store
            failed: 0 // Would need to be implemented in the store
        };
    }
}
exports.TransactionalOutbox = TransactionalOutbox;
/**
 * Database transaction wrapper for outbox operations
 * This ensures that both the business data and the outbox event are saved atomically
 */
class OutboxTransaction {
    constructor(outbox, logger) {
        this.outbox = outbox;
        this.logger = logger;
    }
    /**
     * Execute a transaction that includes both business logic and outbox event storage
     */
    async execute(businessLogic, eventData) {
        // In a real implementation, this would be wrapped in a database transaction
        // For now, we'll simulate the transaction behavior
        try {
            // Execute business logic
            const result = await businessLogic();
            // Store event in outbox (this should be in the same transaction)
            await this.outbox.storeEvent(eventData.sagaId, eventData.stepId, eventData.eventType, eventData.payload);
            this.logger.info('Transaction completed successfully', {
                sagaId: eventData.sagaId,
                stepId: eventData.stepId,
                eventType: eventData.eventType
            });
            return result;
        }
        catch (error) {
            this.logger.error('Transaction failed', error, {
                sagaId: eventData.sagaId,
                stepId: eventData.stepId,
                eventType: eventData.eventType
            });
            throw error;
        }
    }
}
exports.OutboxTransaction = OutboxTransaction;
//# sourceMappingURL=TransactionalOutbox.js.map