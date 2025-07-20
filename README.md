Of course\! Here is a revised and enhanced version of your README file. I've focused on improving the structure, clarity, and professional polish to make it more engaging and easier for developers to understand and adopt.

-----

# atomic-saga

### ✨ Implement rock-solid, distributed transactions in Node.js with confidence.

[](https://www.google.com/search?q=https://www.npmjs.com/package/atomic-saga)
[](https://www.google.com/search?q=https://travis-ci.com/ankitsharma97/atomic-saga)
[](https://www.google.com/search?q=https://github.com/ankitsharma97/atomic-saga/blob/main/LICENSE)
[](https://www.google.com/search?q=https://www.npmjs.com/package/atomic-saga)

Building reliable applications with microservices is hard. How do you handle a business transaction that spans multiple services, like processing a payment, updating inventory, and sending a confirmation email? If one step fails, how do you prevent leaving your system in an inconsistent state?

**`atomic-saga`** provides a complete, production-ready toolkit to solve these challenges using proven architectural patterns. It empowers you to build resilient and reliable distributed systems on Node.js.

## 🤔 Why `atomic-saga`?

  - ✅ **Production-Ready Patterns**: Implements the Saga, Transactional Outbox, and Idempotency patterns right out of the box, saving you from building complex infrastructure from scratch.
  - 👨‍💻 **Developer-Friendly API**: A clean, fluent, and strongly-typed API makes defining, executing, and monitoring complex workflows straightforward.
  - 🧩 **Flexible & Extensible**: Bring your own storage and messaging systems. The package provides interfaces for databases (PostgreSQL, MongoDB) and message brokers (Kafka, RabbitMQ), allowing you to integrate with your existing stack.
  - 🛡️ **Built for Reliability**: With features like automatic rollbacks (compensations), configurable retries, and atomic event publishing, you can handle failures gracefully and ensure data consistency across services.

## 📖 Table of Contents

  - [Features](https://www.google.com/search?q=%23-features)
  - [Installation](https://www.google.com/search?q=%23-installation)
  - [Quick Start](https://www.google.com/search?q=%23-quick-start)
  - [Core Concepts](https://www.google.com/search?q=%23-core-concepts)
      - [Saga Pattern (Orchestration)](https://www.google.com/search?q=%23saga-pattern-orchestration)
      - [Compensating Transactions](https://www.google.com/search?q=%23compensating-transactions)
      - [Transactional Outbox](https://www.google.com/search?q=%23transactional-outbox-pattern)
  - [API Usage](https://www.google.com/search?q=%23-api-usage)
      - [Idempotent APIs](https://www.google.com/search?q=%23-idempotent-apis)
      - [Transactional Outbox](https://www.google.com/search?q=%23-transactional-outbox)
  - [Configuration](https://www.google.com/search?q=%23-configuration)
  - [Monitoring & Observability](https://www.google.com/search?q=%23-monitoring--observability)
  - [Store Implementations](https://www.google.com/search?q=%23%EF%B8%8F-store-implementations)
  - [Testing](https://www.google.com/search?q=%23-testing)
  - [Best Practices](https://www.google.com/search?q=%23-best-practices)
  - [Contributing](https://www.google.com/search?q=%23-contributing)
  - [License](https://www.google.com/search?q=%23-license)

## ✨ Features

  - **Saga Orchestration**: Define, execute, and monitor complex business workflows as a sequence of steps.
  - **Automatic Compensation**: If any step fails, the Saga automatically runs compensating actions to roll back previous steps.
  - **Configurable Retries**: Robust retry policies with exponential backoff for transient failures.
  - **Idempotent API Middleware**: A simple Express middleware to make your API endpoints idempotent, preventing duplicate operations.
  - **Transactional Outbox**: Guarantees that events are published if and only if the corresponding database transaction succeeds.
  - **Reliable Event Delivery**: A background processor ensures outbox messages are reliably delivered to your message broker.
  - **Full TypeScript Support**: Strongly typed from end to end for superior developer experience and fewer runtime errors.

## 📦 Installation

```bash
npm install atomic-saga
```

## 🚀 Quick Start

### 1\. Initialization

First, create an instance of `AtomicApiOperations` with your chosen storage and logging implementations. For development, you can use the provided in-memory stores.

```typescript
import { AtomicApiOperations, InMemoryIdempotencyStore, InMemorySagaStore } from 'atomic-saga';

// Use your preferred logger (e.g., Winston)
const logger = console; 

// Configure the package with storage implementations
const atomicApi = new AtomicApiOperations({
  idempotencyStore: new InMemoryIdempotencyStore(),
  sagaStore: new InMemorySagaStore(),
  logger: logger
});
```

### 2\. Define a Saga

Define the steps of your business transaction. Each step has an `action` to perform the work and an optional `compensation` to undo it.

```typescript
import { SagaDefinition } from 'atomic-saga';

const paymentSaga: SagaDefinition = {
  id: 'payment-processing',
  name: 'Payment Processing Saga',
  steps: [
    {
      id: 'deduct-payment',
      name: 'Deduct Payment from Account',
      action: async (context) => {
        // 1. Call your payment service
        const result = await paymentService.deduct(context.amount, context.userId);
        return { transactionId: result.id }; // Pass output to the next step or compensation
      },
      compensation: async (context, actionOutput) => {
        // 1a. If a later step fails, refund the payment
        await paymentService.refund(actionOutput.transactionId);
      },
      retryPolicy: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 }
    },
    {
      id: 'update-inventory',
      name: 'Update Inventory',
      action: async (context) => {
        // 2. Call your inventory service
        await inventoryService.reserve(context.productId, context.quantity);
        return { inventoryReserved: true };
      },
      compensation: async (context) => {
        // 2a. Release the inventory reservation
        await inventoryService.release(context.productId, context.quantity);
      }
    },
    {
      id: 'send-confirmation',
      name: 'Send Confirmation Email',
      action: async (context) => {
        // 3. Send a confirmation email
        await emailService.sendConfirmation(context.userId, context.orderId);
        return { emailSent: true };
      }
      // No compensation needed, as we usually don't "un-send" an email.
    }
  ],
  onSuccess: async (context) => {
    logger.log(`Saga [${paymentSaga.id}] completed successfully for order ${context.orderId}.`);
  },
  onFailure: async (context, error) => {
    logger.error(`Saga [${paymentSaga.id}] failed for order ${context.orderId}:`, error);
  }
};
```

### 3\. Execute the Saga

Run the Saga with the required initial data. The orchestrator will manage the entire flow.

```typescript
async function processOrder() {
  const executionContext = {
    amount: 100.00,
    userId: 'user-123',
    productId: 'prod-456',
    quantity: 2,
    orderId: 'order-789'
  };

  const result = await atomicApi.executeSaga(paymentSaga, executionContext);

  console.log('Saga execution finished with status:', result.status); // e.g., 'COMPLETED' or 'COMPENSATED'
}
```

## 🏗️ Core Concepts

### Saga Pattern (Orchestration)

This package implements the **Saga Orchestration** pattern, where a central coordinator manages a distributed transaction.

1.  **Start**: A client requests to start a Saga.
2.  **Execute Step**: The orchestrator executes the first step's `action`.
3.  **Continue**: If the step succeeds, it moves to the next one.
4.  **Failure & Compensation**: If any step fails, the orchestrator executes the `compensation` function for all previously completed steps, in reverse order.
5.  **State Management**: The state of the Saga is persisted, allowing it to be resumed after a crash.

### Compensating Transactions

A compensating transaction is an operation that semantically reverses the effect of a previous step. It's the key to achieving "all or nothing" behavior.

  - **Action**: `paymentService.deduct(amount)`
  - **Compensation**: `paymentService.refund(transactionId)`

Your compensation logic should be idempotent and designed to succeed even in failure scenarios.

### Transactional Outbox Pattern

This pattern ensures atomic updates between a database and a message broker. It prevents a common distributed system failure: the database commit succeeds, but the message to notify other services fails to send.

1.  **Atomic Operation**: The business data (e.g., `User` record) and the event (`UserUpdated` message) are saved to the database in the *same transaction*. The event is stored in a dedicated `outbox` table.
2.  **Background Publisher**: A separate, reliable process polls the `outbox` table for unpublished events.
3.  **Publish & Mark**: It publishes the events to a message broker (like Kafka or RabbitMQ) and, upon success, marks them as `published` in the database to prevent duplicates.

## 🔄 API Usage

### Idempotent APIs

Protect your `POST` or `PUT` endpoints from duplicate requests caused by client retries or network issues.

#### Express Middleware

```typescript
import express from 'express';
import { AtomicApiOperations } from 'atomic-saga';

const app = express();
const atomicApi = new AtomicApiOperations(/* ... config ... */);

// Add the middleware to your app.
// It automatically checks for the 'X-Idempotency-Key' header.
app.use(atomicApi.getIdempotencyMiddleware());

app.post('/api/payments', async (req, res) => {
  // This operation will now be idempotent. If a request with the same
  // idempotency key arrives, the middleware will return the cached response.
  const paymentResult = await processPayment(req.body);
  res.json(paymentResult);
});
```

#### Client Usage

The client must generate a unique key and send it in the header.

```typescript
// Generate a unique key for the operation
const idempotencyKey = atomicApi.generateIdempotencyKey(); // Or use a UUID library

// Send the key in the request header
await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify(paymentData),
});
```

### 📨 Transactional Outbox

Use the outbox to atomically save data and publish an event.

```typescript
// 1. Configure AtomicApiOperations with an OutboxStore and MessageBroker
const atomicApi = new AtomicApiOperations({
  // ... other stores
  outboxStore: new PostgresOutboxStore(dbConnection),
  messageBroker: new KafkaMessageBroker(kafkaClient),
});

// 2. Start the background processor (typically on app startup)
atomicApi.startOutbox();

// 3. Use it in your business logic
async function updateUser(userId: string, userData: any) {
  // Get a transaction handle from the outbox
  const outboxTransaction = atomicApi.createOutboxTransaction();

  // Execute your database logic and define the event to be published
  await outboxTransaction.execute(
    // A function that contains your database updates
    async (transactionalClient) => {
      await database.updateUser(userId, userData, { client: transactionalClient });
      await database.updateRelatedData(userId, { client: transactionalClient });
    },
    // The event to publish upon success
    {
      eventType: 'UserUpdated',
      payload: { userId, ...userData }
    }
  );
}
```

## 🔧 Configuration

### `AtomicApiConfig`

```typescript
interface AtomicApiConfig {
  idempotencyStore: IdempotencyStore;        // Required: Manages idempotency keys.
  sagaStore: SagaStore;                      // Required: Persists Saga state.
  outboxStore?: OutboxStore;                 // Optional: Required for Transactional Outbox.
  messageBroker?: MessageBroker;             // Optional: Required for Transactional Outbox.
  logger?: Logger;                           // Optional: For logging. Defaults to console.
  defaultRetryPolicy?: RetryPolicy;          // Optional: Default retry policy for Saga steps.
}
```

### `RetryPolicy`

```typescript
interface RetryPolicy {
  maxAttempts: number;       // Maximum number of attempts for an action.
  backoffMs: number;         // Initial delay in milliseconds.
  backoffMultiplier: number; // Factor to multiply delay by for each retry (e.g., 2 for exponential).
}
```

## 📊 Monitoring & Observability

### Saga Execution Tracking

```typescript
// Get details of a specific Saga execution
const execution = await atomicApi.getSagaExecution('execution-id-123');
console.log('Execution Status:', execution.status);
console.log('Step Results:', execution.stepResults);

// List all completed executions for a specific Saga
const executions = await atomicApi.listSagaExecutions({
  sagaId: 'payment-processing', 
  status: 'COMPLETED'
});
```

### Outbox Statistics

```typescript
const stats = await atomicApi.getOutboxStats();
console.log('Pending Events:', stats.pending);
console.log('Published Events:', stats.published);
console.log('Failed Events:', stats.failed);
```

## 🛠️ Store Implementations

The package is unopinionated about your data storage. You provide the implementation by conforming to these interfaces. Example implementations for popular databases are planned for the future.

  - **`IdempotencyStore`**:
      - `set(key, response)`
      - `get(key)`
      - *Recommended Backend: Redis (for its speed and TTL support)*
  - **`SagaStore`**:
      - `createExecution(data)`
      - `getExecution(id)`
      - `updateExecution(id, data)`
      - *Recommended Backend: PostgreSQL, MongoDB*
  - **`OutboxStore`**:
      - `add(event, transaction)`
      - `getUnpublished()`
      - `markAsPublished(eventId)`
      - *Recommended Backend: PostgreSQL, MongoDB*

## 🧪 Testing

The package is designed to be easily testable. Use the `InMemory` stores to test your Saga logic without external dependencies.

```typescript
import { AtomicApiOperations, InMemorySagaStore, InMemoryIdempotencyStore } from 'atomic-saga';

describe('Payment Saga', () => {
  let atomicApi: AtomicApiOperations;
  let mockPaymentService;

  beforeEach(() => {
    atomicApi = new AtomicApiOperations({
      idempotencyStore: new InMemoryIdempotencyStore(),
      sagaStore: new InMemorySagaStore(),
    });

    // Mock external services
    mockPaymentService = {
      deduct: jest.fn().mockResolvedValue({ id: 'txn-123' }),
      refund: jest.fn().mockResolvedValue(true),
    };
  });

  it('should complete successfully when all steps succeed', async () => {
    // ... setup mocks to succeed
    const result = await atomicApi.executeSaga(paymentSaga, paymentContext);
    expect(result.status).toBe('COMPLETED');
    expect(mockPaymentService.refund).not.toHaveBeenCalled();
  });

  it('should compensate successfully when a step fails', async () => {
    // Mock the inventory service to throw an error
    mockInventoryService.reserve.mockRejectedValue(new Error('Inventory not available'));

    const result = await atomicApi.executeSaga(paymentSaga, paymentContext);
    
    expect(result.status).toBe('COMPENSATED');
    expect(mockPaymentService.refund).toHaveBeenCalledWith('txn-123');
  });
});
```

## 🔒 Best Practices

  - **Design Idempotent Compensations**: Your compensation logic might be retried. Ensure it can be run multiple times without causing issues (e.g., don't refund twice).
  - **Keep Steps Small and Focused**: Each step should ideally interact with a single service or transactional boundary.
  - **Avoid Business Logic in the Orchestrator**: The Saga definition should only coordinate the steps. The actual business logic belongs in your services.
  - **Monitor for Failed Compensations**: A failed compensation is a critical error that requires manual intervention. Set up alerts to detect these scenarios.

## 🤝 Contributing

Contributions are welcome\! Please feel free to fork the repository, create a feature branch, and submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a pull request.

## 🙏 Acknowledgments

This package is heavily inspired by the patterns and principles from giants in the field:

  - "Saga" by Hector Garcia-Molina and Kenneth Salem
  - "Patterns of Enterprise Application Architecture" by Martin Fowler
  - "Building Microservices" by Sam Newman

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.

-----

For questions or issues, please [create an issue on GitHub](https://www.google.com/search?q=https://github.com/ankitsharma97/atomic-saga/issues).