/**
 * Core types and interfaces for Atomic API Operations
 * Based on the Saga pattern and distributed transaction principles
 */
export interface IdempotencyKey {
    key: string;
    expiresAt: Date;
}
export interface TransactionStep<TInput = any, TOutput = any> {
    id: string;
    name: string;
    action: (input: TInput) => Promise<TOutput>;
    compensation?: (input: TInput, output?: TOutput) => Promise<void>;
    retryPolicy?: RetryPolicy;
    timeout?: number;
}
export interface RetryPolicy {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
}
export interface SagaDefinition<TContext = any> {
    id: string;
    name: string;
    steps: TransactionStep[];
    context?: TContext;
    onSuccess?: (context: TContext) => Promise<void>;
    onFailure?: (context: TContext, error: Error) => Promise<void>;
}
export interface SagaExecution {
    id: string;
    sagaId: string;
    status: SagaStatus;
    currentStep?: number;
    context: any;
    startedAt: Date;
    completedAt?: Date;
    error?: Error;
    stepResults: StepResult[];
}
export type SagaStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'COMPENSATING' | 'COMPENSATED';
export interface StepResult {
    stepId: string;
    stepName: string;
    status: 'SUCCESS' | 'FAILED' | 'COMPENSATED';
    input?: any;
    output?: any;
    error?: Error;
    startedAt: Date;
    completedAt?: Date;
    attempts: number;
}
export interface OutboxEvent {
    id: string;
    sagaId: string;
    stepId: string;
    eventType: string;
    payload: any;
    status: 'PENDING' | 'PUBLISHED' | 'FAILED';
    createdAt: Date;
    publishedAt?: Date;
    retryCount: number;
}
export interface IdempotencyStore {
    get(key: string): Promise<IdempotencyKey | null>;
    set(key: string, expiresAt: Date): Promise<void>;
    delete(key: string): Promise<void>;
}
export interface SagaStore {
    saveExecution(execution: SagaExecution): Promise<void>;
    getExecution(id: string): Promise<SagaExecution | null>;
    updateExecution(execution: SagaExecution): Promise<void>;
    listExecutions(sagaId?: string, status?: SagaStatus): Promise<SagaExecution[]>;
}
export interface OutboxStore {
    saveEvent(event: OutboxEvent): Promise<void>;
    getPendingEvents(): Promise<OutboxEvent[]>;
    markEventPublished(id: string): Promise<void>;
    markEventFailed(id: string, error: string): Promise<void>;
    deleteEvent(id: string): Promise<void>;
}
export interface MessageBroker {
    publish(topic: string, message: any): Promise<void>;
    subscribe(topic: string, handler: (message: any) => Promise<void>): Promise<void>;
    unsubscribe(topic: string): Promise<void>;
}
export interface Logger {
    info(message: string, meta?: any): void;
    error(message: string, error?: Error, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}
export interface AtomicApiConfig {
    idempotencyStore: IdempotencyStore;
    sagaStore: SagaStore;
    outboxStore?: OutboxStore;
    messageBroker?: MessageBroker;
    logger?: Logger;
    defaultRetryPolicy?: RetryPolicy;
    defaultTimeout?: number;
}
export interface IdempotentRequest {
    idempotencyKey: string;
    method: string;
    path: string;
    body?: any;
    headers?: Record<string, string>;
}
export interface IdempotentResponse {
    idempotencyKey: string;
    statusCode: number;
    body: any;
    headers: Record<string, string>;
}
//# sourceMappingURL=index.d.ts.map