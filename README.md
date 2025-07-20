# Atomic API Operations

A comprehensive npm package for ensuring atomic API operations in distributed Node.js applications using Saga patterns, compensating transactions, and idempotent operations.

## 🎯 Overview

This package implements the core patterns needed for reliable distributed transactions in microservices architectures:

- **Saga Pattern** (Orchestration) - Manages complex multi-step business transactions
- **Compensating Transactions** - Provides rollback capabilities for failed operations
- **Transactional Outbox Pattern** - Ensures reliable event publishing
- **Idempotent APIs** - Prevents duplicate operations and handles retries safely

## 🚀 Features

### ✅ Saga Orchestration
- Define complex business workflows as sequences of steps
- Automatic compensation (rollback) on failures
- Configurable retry policies with exponential backoff
- Comprehensive execution tracking and monitoring

### ✅ Idempotent Operations
- Express middleware for automatic idempotency
- Unique key generation and validation
- Configurable expiry times
- Safe retry handling

### ✅ Transactional Outbox
- Atomic database updates with event publishing
- Reliable message delivery with retry logic
- Background processing of pending events
- Configurable polling intervals

### ✅ TypeScript Support
- Full TypeScript definitions
- Strong typing for all operations
- IntelliSense support

## 📦 Installation

```bash
npm install atomic-api-operations
```

## 🔧 Quick Start

### Basic Setup

```typescript
import { AtomicApiOperations } from 'atomic-api-operations';

// Configure the package
const atomicApi = new AtomicApiOperations({
  idempotencyStore: new InMemoryIdempotencyStore(),
  sagaStore: new InMemorySagaStore(),
  logger: new WinstonLogger()
});
```

### Define a Payment Saga

```typescript
import { SagaDefinition, utils } from 'atomic-api-operations';

const paymentSaga: SagaDefinition = {
  id: 'payment-processing',
  name: 'Payment Processing Saga',
  steps: [
    {
      id: 'deduct-payment',
      name: 'Deduct Payment from Account',
      action: async (context) => {
        // Call payment service
        const result = await paymentService.deduct(context.amount, context.userId);
        return { transactionId: result.id };
      },
      compensation: async (context, output) => {
        // Refund the payment
        await paymentService.refund(output.transactionId);
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
      action: async (context) => {
        // Update inventory service
        await inventoryService.reserve(context.productId, context.quantity);
        return { inventoryReserved: true };
      },
      compensation: async (context, output) => {
        // Release inventory reservation
        await inventoryService.release(context.productId, context.quantity);
      }
    },
    {
      id: 'send-confirmation',
      name: 'Send Confirmation Email',
      action: async (context) => {
        // Send email
        await emailService.sendConfirmation(context.userId, context.orderId);
        return { emailSent: true };
      }
      // No compensation needed for email sending
    }
  ],
  onSuccess: async (context) => {
    console.log(`Payment saga completed for user ${context.userId}`);
  },
  onFailure: async (context, error) => {
    console.error(`Payment saga failed for user ${context.userId}:`, error);
  }
};
```

### Execute the Saga

```typescript
// Execute the payment saga
const result = await atomicApi.executeSaga(paymentSaga, {
  amount: 100.00,
  userId: 'user-123',
  productId: 'prod-456',
  quantity: 2,
  orderId: 'order-789'
});

console.log('Saga execution result:', result.status);
```

## 🔄 Idempotent APIs

### Express Middleware

```typescript
import express from 'express';
import { AtomicApiOperations } from 'atomic-api-operations';

const app = express();

// Add idempotency middleware
app.use(atomicApi.getIdempotencyMiddleware());

// Your API endpoints are now idempotent
app.post('/api/payments', async (req, res) => {
  // This endpoint will be idempotent
  const result = await processPayment(req.body);
  res.json(result);
});
```

### Client Usage

```typescript
// Generate an idempotency key
const idempotencyKey = atomicApi.generateIdempotencyKey();

// Make the request with the key
const response = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify(paymentData)
});

// Subsequent requests with the same key will return the same response
```

## 📨 Transactional Outbox

### Setup Outbox

```typescript
import { AtomicApiOperations } from 'atomic-api-operations';

const atomicApi = new AtomicApiOperations({
  idempotencyStore: new InMemoryIdempotencyStore(),
  sagaStore: new InMemorySagaStore(),
  outboxStore: new PostgresOutboxStore(), // Your implementation
  messageBroker: new KafkaMessageBroker(), // Your implementation
  logger: new WinstonLogger()
});

// Start the outbox processor
atomicApi.startOutbox();
```

### Use Outbox in Transactions

```typescript
const outboxTransaction = atomicApi.createOutboxTransaction();

if (outboxTransaction) {
  await outboxTransaction.execute(
    // Business logic
    async () => {
      await database.updateUser(userId, userData);
    },
    // Event data
    {
      sagaId: 'user-update',
      stepId: 'update-user',
      eventType: 'UserUpdated',
      payload: { userId, userData }
    }
  );
}
```

## 🏗️ Architecture Patterns

### Saga Pattern (Orchestration)

The package implements the **Saga Orchestration** pattern where a central coordinator manages the entire workflow:

1. **Step Execution**: Each step is executed sequentially
2. **Compensation**: If any step fails, all previous steps are compensated in reverse order
3. **Retry Logic**: Configurable retry policies with exponential backoff
4. **State Management**: Execution state is persisted for recovery

### Compensating Transactions

Each step can define a compensation function that undoes the step's effects:

```typescript
{
  id: 'deduct-payment',
  name: 'Deduct Payment',
  action: async (context) => {
    // Deduct money from account
    return await paymentService.deduct(context.amount);
  },
  compensation: async (context, output) => {
    // Refund the money back
    await paymentService.refund(output.transactionId);
  }
}
```

### Transactional Outbox Pattern

Ensures atomic database updates and event publishing:

1. **Atomic Storage**: Events are stored in the same transaction as business data
2. **Background Processing**: A separate process publishes events to message brokers
3. **Reliable Delivery**: Retry logic ensures events are eventually published
4. **Duplicate Prevention**: Events are marked as published to prevent duplicates

## 🔧 Configuration

### AtomicApiConfig

```typescript
interface AtomicApiConfig {
  idempotencyStore: IdempotencyStore;        // Required
  sagaStore: SagaStore;                      // Required
  outboxStore?: OutboxStore;                 // Optional
  messageBroker?: MessageBroker;             // Optional
  logger?: Logger;                           // Optional
  defaultRetryPolicy?: RetryPolicy;          // Optional
  defaultTimeout?: number;                   // Optional
}
```

### Retry Policy

```typescript
interface RetryPolicy {
  maxAttempts: number;       // Maximum retry attempts
  backoffMs: number;         // Initial backoff delay in milliseconds
  backoffMultiplier: number; // Multiplier for exponential backoff
}
```

## 📊 Monitoring and Observability

### Execution Tracking

```typescript
// Get execution details
const execution = await atomicApi.getExecution('execution-id');
console.log('Execution status:', execution.status);
console.log('Step results:', execution.stepResults);

// List executions
const executions = await atomicApi.listExecutions('payment-processing', 'COMPLETED');
```

### Outbox Statistics

```typescript
const stats = await atomicApi.getOutboxStats();
console.log('Pending events:', stats.pending);
console.log('Published events:', stats.published);
console.log('Failed events:', stats.failed);
```

## 🛠️ Store Implementations

The package provides interfaces for different storage backends. You'll need to implement these based on your infrastructure:

### IdempotencyStore
- **Redis**: Fast key-value storage with TTL
- **PostgreSQL**: Persistent storage with cleanup jobs
- **In-Memory**: For development/testing

### SagaStore
- **PostgreSQL**: Persistent execution state
- **MongoDB**: Document-based storage
- **Redis**: Fast in-memory storage

### OutboxStore
- **PostgreSQL**: Reliable event storage
- **MongoDB**: Document-based event storage

## 🧪 Testing

### Unit Testing

```typescript
import { AtomicApiOperations } from 'atomic-api-operations';

describe('Payment Saga', () => {
  let atomicApi: AtomicApiOperations;

  beforeEach(() => {
    atomicApi = new AtomicApiOperations({
      idempotencyStore: new InMemoryIdempotencyStore(),
      sagaStore: new InMemorySagaStore(),
      logger: new ConsoleLogger()
    });
  });

  it('should complete payment saga successfully', async () => {
    const result = await atomicApi.executeSaga(paymentSaga, paymentContext);
    expect(result.status).toBe('COMPLETED');
  });

  it('should compensate on failure', async () => {
    // Mock a failing step
    const failingSaga = { ...paymentSaga };
    failingSaga.steps[0].action = async () => {
      throw new Error('Payment service unavailable');
    };

    const result = await atomicApi.executeSaga(failingSaga, paymentContext);
    expect(result.status).toBe('COMPENSATED');
  });
});
```

## 🔒 Best Practices

### 1. Design Idempotent Operations
- Use unique identifiers for all operations
- Implement upsert patterns for database operations
- Handle duplicate requests gracefully

### 2. Plan Compensations Carefully
- Every step should have a corresponding compensation
- Compensations should be idempotent
- Consider the cost and complexity of compensations

### 3. Monitor and Alert
- Track saga execution metrics
- Set up alerts for failed compensations
- Monitor outbox processing health

### 4. Handle Edge Cases
- Network timeouts and retries
- Service unavailability
- Data consistency issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

This package is inspired by the patterns described in:
- "Saga: How to implement complex business transactions without two-phase commit" by Hector Garcia-Molina and Kenneth Salem
- "Patterns of Enterprise Application Architecture" by Martin Fowler
- "Building Microservices" by Sam Newman

## 📞 Support

For questions, issues, or contributions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/atomic-api-operations/issues)
- Documentation: [Read the docs](https://github.com/yourusername/atomic-api-operations/wiki)
- Examples: [View examples](https://github.com/yourusername/atomic-api-operations/examples) 