import { SagaDefinition, SagaExecution, SagaStatus, SagaStore, Logger, RetryPolicy } from '../types';
declare global {
    function setTimeout(callback: (...args: any[]) => void, ms: number): any;
    function clearTimeout(timeoutId: any): void;
}
/**
 * Saga Orchestrator - Manages distributed transactions using the orchestration pattern
 * Implements the Saga pattern with explicit compensating transactions for rollback
 */
export declare class SagaOrchestrator {
    private readonly store;
    private readonly logger;
    private readonly defaultRetryPolicy;
    private readonly defaultTimeout;
    constructor(store: SagaStore, logger: Logger, defaultRetryPolicy?: RetryPolicy, defaultTimeout?: number);
    /**
     * Execute a saga with the given definition and context
     * This is the main entry point for orchestrating distributed transactions
     */
    executeSaga<TContext = any>(definition: SagaDefinition<TContext>, context: TContext): Promise<SagaExecution>;
    /**
     * Execute all steps in the saga sequentially
     */
    private executeSteps;
    /**
     * Execute a single step with retry logic and timeout
     */
    private executeStep;
    /**
     * Execute compensation for all completed steps in reverse order
     */
    private compensate;
    /**
     * Execute a function with a timeout
     */
    private executeWithTimeout;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
    /**
     * Get execution by ID
     */
    getExecution(id: string): Promise<SagaExecution | null>;
    /**
     * List executions with optional filters
     */
    listExecutions(sagaId?: string, status?: SagaStatus): Promise<SagaExecution[]>;
}
//# sourceMappingURL=SagaOrchestrator.d.ts.map