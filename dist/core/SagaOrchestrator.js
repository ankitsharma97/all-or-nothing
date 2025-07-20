"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaOrchestrator = void 0;
const uuid_1 = require("uuid");
/**
 * Saga Orchestrator - Manages distributed transactions using the orchestration pattern
 * Implements the Saga pattern with explicit compensating transactions for rollback
 */
class SagaOrchestrator {
    constructor(store, logger, defaultRetryPolicy = { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 }, defaultTimeout = 30000) {
        this.store = store;
        this.logger = logger;
        this.defaultRetryPolicy = defaultRetryPolicy;
        this.defaultTimeout = defaultTimeout;
    }
    /**
     * Execute a saga with the given definition and context
     * This is the main entry point for orchestrating distributed transactions
     */
    async executeSaga(definition, context) {
        const executionId = (0, uuid_1.v4)();
        const execution = {
            id: executionId,
            sagaId: definition.id,
            status: 'PENDING',
            context,
            startedAt: new Date(),
            stepResults: []
        };
        this.logger.info(`Starting saga execution`, {
            executionId,
            sagaId: definition.id,
            sagaName: definition.name,
            stepCount: definition.steps.length
        });
        try {
            // Save initial execution state
            await this.store.saveExecution(execution);
            // Execute all steps in sequence
            const result = await this.executeSteps(definition, execution);
            // Handle success
            if (result.status === 'COMPLETED') {
                execution.status = 'COMPLETED';
                execution.completedAt = new Date();
                if (definition.onSuccess) {
                    await definition.onSuccess(context);
                }
                this.logger.info(`Saga completed successfully`, {
                    executionId,
                    sagaId: definition.id,
                    duration: execution.completedAt.getTime() - execution.startedAt.getTime()
                });
            }
            else {
                // Handle failure and compensation
                await this.compensate(definition, execution, result.error);
            }
            await this.store.updateExecution(execution);
            return execution;
        }
        catch (error) {
            this.logger.error(`Saga execution failed`, error, {
                executionId,
                sagaId: definition.id
            });
            execution.status = 'FAILED';
            execution.error = error;
            execution.completedAt = new Date();
            await this.store.updateExecution(execution);
            throw error;
        }
    }
    /**
     * Execute all steps in the saga sequentially
     */
    async executeSteps(definition, execution) {
        execution.status = 'RUNNING';
        await this.store.updateExecution(execution);
        for (let i = 0; i < definition.steps.length; i++) {
            const step = definition.steps[i];
            if (!step) {
                throw new Error(`Step at index ${i} is undefined`);
            }
            execution.currentStep = i;
            this.logger.info(`Executing step ${i + 1}/${definition.steps.length}`, {
                executionId: execution.id,
                stepId: step.id,
                stepName: step.name
            });
            const stepResult = await this.executeStep(step, execution.context, i);
            execution.stepResults.push(stepResult);
            if (stepResult.status === 'FAILED') {
                return { status: 'FAILED', error: stepResult.error };
            }
            await this.store.updateExecution(execution);
        }
        return { status: 'COMPLETED' };
    }
    /**
     * Execute a single step with retry logic and timeout
     */
    async executeStep(step, context, _stepIndex) {
        const stepResult = {
            stepId: step.id,
            stepName: step.name,
            status: 'SUCCESS',
            input: context,
            startedAt: new Date(),
            attempts: 0
        };
        const retryPolicy = step.retryPolicy || this.defaultRetryPolicy;
        const timeout = step.timeout || this.defaultTimeout;
        for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
            stepResult.attempts = attempt;
            try {
                this.logger.debug(`Executing step attempt ${attempt}/${retryPolicy.maxAttempts}`, {
                    stepId: step.id,
                    stepName: step.name,
                    attempt
                });
                // Execute with timeout
                const output = await this.executeWithTimeout(() => step.action(context), timeout);
                stepResult.output = output;
                stepResult.completedAt = new Date();
                stepResult.status = 'SUCCESS';
                this.logger.info(`Step completed successfully`, {
                    stepId: step.id,
                    stepName: step.name,
                    attempt,
                    duration: stepResult.completedAt.getTime() - stepResult.startedAt.getTime()
                });
                return stepResult;
            }
            catch (error) {
                stepResult.error = error;
                this.logger.warn(`Step attempt ${attempt} failed`, {
                    stepId: step.id,
                    stepName: step.name,
                    attempt,
                    error: error.message
                });
                // If this is the last attempt, mark as failed
                if (attempt === retryPolicy.maxAttempts) {
                    stepResult.status = 'FAILED';
                    stepResult.completedAt = new Date();
                    this.logger.error(`Step failed after ${retryPolicy.maxAttempts} attempts`, error, {
                        stepId: step.id,
                        stepName: step.name
                    });
                    return stepResult;
                }
                // Wait before retry with exponential backoff
                const backoffDelay = retryPolicy.backoffMs * Math.pow(retryPolicy.backoffMultiplier, attempt - 1);
                await this.sleep(backoffDelay);
            }
        }
        // This should never be reached, but TypeScript requires it
        stepResult.status = 'FAILED';
        stepResult.completedAt = new Date();
        return stepResult;
    }
    /**
     * Execute compensation for all completed steps in reverse order
     */
    async compensate(definition, execution, failureError) {
        execution.status = 'COMPENSATING';
        await this.store.updateExecution(execution);
        this.logger.info(`Starting compensation for failed saga`, {
            executionId: execution.id,
            sagaId: definition.id,
            failedStep: execution.currentStep
        });
        // Find completed steps and compensate in reverse order
        const completedSteps = execution.stepResults
            .filter(result => result.status === 'SUCCESS')
            .reverse();
        for (const stepResult of completedSteps) {
            const step = definition.steps.find(s => s.id === stepResult.stepId);
            if (!step || !step.compensation) {
                this.logger.warn(`No compensation found for step`, {
                    stepId: stepResult.stepId,
                    stepName: stepResult.stepName
                });
                continue;
            }
            try {
                this.logger.info(`Executing compensation for step`, {
                    stepId: step.id,
                    stepName: step.name
                });
                await step.compensation(stepResult.input, stepResult.output);
                stepResult.status = 'COMPENSATED';
                this.logger.info(`Compensation completed successfully`, {
                    stepId: step.id,
                    stepName: step.name
                });
            }
            catch (error) {
                this.logger.error(`Compensation failed for step`, error, {
                    stepId: step.id,
                    stepName: step.name
                });
                // Note: In a production system, you might want to handle compensation failures differently
                // For now, we continue with other compensations
            }
        }
        execution.status = 'COMPENSATED';
        execution.completedAt = new Date();
        if (definition.onFailure) {
            await definition.onFailure(execution.context, failureError);
        }
        this.logger.info(`Saga compensation completed`, {
            executionId: execution.id,
            sagaId: definition.id,
            compensatedSteps: completedSteps.length
        });
    }
    /**
     * Execute a function with a timeout
     */
    async executeWithTimeout(fn, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            fn()
                .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            })
                .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get execution by ID
     */
    async getExecution(id) {
        return this.store.getExecution(id);
    }
    /**
     * List executions with optional filters
     */
    async listExecutions(sagaId, status) {
        return this.store.listExecutions(sagaId, status);
    }
}
exports.SagaOrchestrator = SagaOrchestrator;
//# sourceMappingURL=SagaOrchestrator.js.map