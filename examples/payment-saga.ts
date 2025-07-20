/**
 * Payment Processing Saga Example
 * 
 * This example demonstrates how to use the Atomic API Operations package
 * to implement a reliable payment processing workflow with proper rollback.
 */

import { 
  AtomicApiOperations, 
  SagaDefinition, 
  utils,
  IdempotencyStore,
  SagaStore,
  Logger
} from '../src';

// Mock services for demonstration
class PaymentService {
  async deduct(amount: number, userId: string) {
    console.log(`Deducting ${amount} from user ${userId}`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: `tx_${Date.now()}`, amount, userId };
  }

  async refund(transactionId: string) {
    console.log(`Refunding transaction ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { refunded: true, transactionId };
  }
}

class InventoryService {
  async reserve(productId: string, quantity: number) {
    console.log(`Reserving ${quantity} units of product ${productId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { reserved: true, productId, quantity };
  }

  async release(productId: string, quantity: number) {
    console.log(`Releasing ${quantity} units of product ${productId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { released: true, productId, quantity };
  }
}

class EmailService {
  async sendConfirmation(userId: string, orderId: string) {
    console.log(`Sending confirmation email to user ${userId} for order ${orderId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { emailSent: true, userId, orderId };
  }
}

// In-memory implementations for demonstration
class InMemoryIdempotencyStore implements IdempotencyStore {
  private keys = new Map<string, { key: string; expiresAt: Date }>();

  async get(key: string) {
    const entry = this.keys.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < new Date()) {
      this.keys.delete(key);
      return null;
    }
    
    return entry;
  }

  async set(key: string, expiresAt: Date) {
    this.keys.set(key, { key, expiresAt });
  }

  async delete(key: string) {
    this.keys.delete(key);
  }
}

class InMemorySagaStore implements SagaStore {
  private executions = new Map<string, any>();

  async saveExecution(execution: any) {
    this.executions.set(execution.id, execution);
  }

  async getExecution(id: string) {
    return this.executions.get(id) || null;
  }

  async updateExecution(execution: any) {
    this.executions.set(execution.id, execution);
  }

  async listExecutions(sagaId?: string, status?: string) {
    const all = Array.from(this.executions.values());
    return all.filter(exec => 
      (!sagaId || exec.sagaId === sagaId) && 
      (!status || exec.status === status)
    );
  }
}

class ConsoleLogger implements Logger {
  info(message: string, meta?: any) {
    console.log(`[INFO] ${message}`, meta || '');
  }

  error(message: string, error?: Error, meta?: any) {
    console.error(`[ERROR] ${message}`, error?.message || '', meta || '');
  }

  warn(message: string, meta?: any) {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  debug(message: string, meta?: any) {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}

// Initialize services
const paymentService = new PaymentService();
const inventoryService = new InventoryService();
const emailService = new EmailService();

// Configure Atomic API Operations
const atomicApi = new AtomicApiOperations({
  idempotencyStore: new InMemoryIdempotencyStore(),
  sagaStore: new InMemorySagaStore(),
  logger: new ConsoleLogger(),
  defaultRetryPolicy: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2
  },
  defaultTimeout: 30000
});

// Define the Payment Processing Saga
const paymentSaga: SagaDefinition = {
  id: 'payment-processing',
  name: 'Payment Processing Saga',
  steps: [
    {
      id: 'deduct-payment',
      name: 'Deduct Payment from Account',
      action: async (context: any) => {
        const result = await paymentService.deduct(context.amount, context.userId);
        return { transactionId: result.id };
      },
      compensation: async (context: any, output: any) => {
        if (output?.transactionId) {
          await paymentService.refund(output.transactionId);
        }
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 1000,
        backoffMultiplier: 2
      }
    },
    {
      id: 'update-inventory',
      name: 'Update Inventory',
      action: async (context: any) => {
        await inventoryService.reserve(context.productId, context.quantity);
        return { inventoryReserved: true };
      },
      compensation: async (context: any, output: any) => {
        if (output?.inventoryReserved) {
          await inventoryService.release(context.productId, context.quantity);
        }
      }
    },
    {
      id: 'send-confirmation',
      name: 'Send Confirmation Email',
      action: async (context: any) => {
        await emailService.sendConfirmation(context.userId, context.orderId);
        return { emailSent: true };
      }
      // No compensation needed for email sending
    }
  ],
  onSuccess: async (context: any) => {
    console.log(`✅ Payment saga completed successfully for user ${context.userId}`);
  },
  onFailure: async (context: any, error: Error) => {
    console.error(`❌ Payment saga failed for user ${context.userId}:`, error.message);
  }
};

// Example usage
async function processPayment() {
  console.log('🚀 Starting Payment Processing Saga Example\n');

  const paymentContext = {
    amount: 99.99,
    userId: 'user-123',
    productId: 'prod-456',
    quantity: 2,
    orderId: 'order-789'
  };

  try {
    console.log('📋 Payment Context:', paymentContext);
    console.log('🔄 Executing payment saga...\n');

    const result = await atomicApi.executeSaga(paymentSaga, paymentContext);

    console.log('\n📊 Saga Execution Result:');
    console.log('Status:', result.status);
    console.log('Execution ID:', result.id);
    console.log('Duration:', result.completedAt!.getTime() - result.startedAt.getTime(), 'ms');
    
    console.log('\n📝 Step Results:');
    result.stepResults.forEach((step, index) => {
      console.log(`${index + 1}. ${step.stepName}: ${step.status} (${step.attempts} attempts)`);
    });

  } catch (error) {
    console.error('💥 Error executing payment saga:', error);
  }
}

// Example with failure simulation
async function processPaymentWithFailure() {
  console.log('\n🚀 Starting Payment Processing Saga with Failure Example\n');

  // Create a saga with a failing step
  const failingSaga: SagaDefinition = {
    ...paymentSaga,
    steps: [
      {
        ...paymentSaga.steps[0], // Deduct payment (will succeed)
      },
      {
        ...paymentSaga.steps[1], // Update inventory (will succeed)
      },
      {
        id: 'failing-step',
        name: 'Failing Step',
        action: async () => {
          throw new Error('Service temporarily unavailable');
        },
        compensation: async () => {
          console.log('Compensating for failing step');
        }
      }
    ]
  };

  const paymentContext = {
    amount: 49.99,
    userId: 'user-456',
    productId: 'prod-789',
    quantity: 1,
    orderId: 'order-999'
  };

  try {
    console.log('📋 Payment Context:', paymentContext);
    console.log('🔄 Executing payment saga with failure...\n');

    const result = await atomicApi.executeSaga(failingSaga, paymentContext);

    console.log('\n📊 Saga Execution Result:');
    console.log('Status:', result.status);
    console.log('Execution ID:', result.id);
    
    if (result.error) {
      console.log('Error:', result.error.message);
    }

    console.log('\n📝 Step Results:');
    result.stepResults.forEach((step, index) => {
      console.log(`${index + 1}. ${step.stepName}: ${step.status} (${step.attempts} attempts)`);
      if (step.error) {
        console.log(`   Error: ${step.error.message}`);
      }
    });

  } catch (error) {
    console.error('💥 Error executing payment saga:', error);
  }
}

// Run examples
async function runExamples() {
  await processPayment();
  await processPaymentWithFailure();
  
  console.log('\n🎉 Examples completed!');
}

// Export for use in other files
export {
  processPayment,
  processPaymentWithFailure,
  paymentSaga,
  atomicApi
};

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
} 