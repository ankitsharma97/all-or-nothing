/**
 * Basic tests for Atomic API Operations package
 */

import { 
  AtomicApiOperations, 
  SagaDefinition, 
  IdempotencyStore,
  SagaStore,
  Logger,
  SagaExecution
} from '../src';

// Mock implementations for testing
class MockIdempotencyStore implements IdempotencyStore {
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

class MockSagaStore implements SagaStore {
  private executions = new Map<string, SagaExecution>();

  async saveExecution(execution: SagaExecution) {
    this.executions.set(execution.id, execution);
  }

  async getExecution(id: string) {
    return this.executions.get(id) || null;
  }

  async updateExecution(execution: SagaExecution) {
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

class MockLogger implements Logger {
  logs: string[] = [];

  info(message: string, _meta?: any) {
    this.logs.push(`[INFO] ${message}`);
  }

  error(message: string, error?: Error, _meta?: any) {
    this.logs.push(`[ERROR] ${message}: ${error?.message || ''}`);
  }

  warn(message: string, _meta?: any) {
    this.logs.push(`[WARN] ${message}`);
  }

  debug(message: string, _meta?: any) {
    this.logs.push(`[DEBUG] ${message}`);
  }
}

// Test saga definition
const testSaga: SagaDefinition = {
  id: 'test-saga',
  name: 'Test Saga',
  steps: [
    {
      id: 'step-1',
      name: 'Step 1',
      action: async (context: any) => {
        return { result: 'step1-completed', context };
      },
      compensation: async (_context: any, _output: any) => {
        // Compensation logic
      }
    },
    {
      id: 'step-2',
      name: 'Step 2',
      action: async (context: any) => {
        return { result: 'step2-completed', context };
      },
      compensation: async (_context: any, _output: any) => {
        // Compensation logic
      }
    }
  ]
};

// Test context
const testContext = {
  userId: 'test-user',
  amount: 100,
  timestamp: new Date()
};

// Basic functionality test
async function testBasicFunctionality() {
  console.log('🧪 Testing Basic Functionality\n');

  const logger = new MockLogger();
  const atomicApi = new AtomicApiOperations({
    idempotencyStore: new MockIdempotencyStore(),
    sagaStore: new MockSagaStore(),
    logger
  });

  try {
    console.log('📋 Test Context:', testContext);
    console.log('🔄 Executing test saga...\n');

    const result = await atomicApi.executeSaga(testSaga, testContext);

    console.log('✅ Saga executed successfully!');
    console.log('Status:', result.status);
    console.log('Execution ID:', result.id);
    console.log('Step Count:', result.stepResults.length);
    
    console.log('\n📝 Step Results:');
    result.stepResults.forEach((step, index) => {
      console.log(`${index + 1}. ${step.stepName}: ${step.status}`);
    });

    console.log('\n📊 Logger Output:');
    logger.logs.forEach(log => console.log(log));

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test with failure
async function testWithFailure() {
  console.log('\n🧪 Testing with Failure\n');

  const logger = new MockLogger();
  const atomicApi = new AtomicApiOperations({
    idempotencyStore: new MockIdempotencyStore(),
    sagaStore: new MockSagaStore(),
    logger
  });

  // Create a saga with a failing step
  const failingSaga: SagaDefinition = {
    id: 'failing-saga',
    name: 'Failing Saga',
    steps: [
      {
        id: 'success-step',
        name: 'Success Step',
        action: async (_context: any) => {
          return { result: 'success' };
        },
        compensation: async (_context: any, _output: any) => {
          console.log('Compensating success step');
        }
      },
      {
        id: 'failing-step',
        name: 'Failing Step',
        action: async (_context: any) => {
          throw new Error('Simulated failure');
        },
        compensation: async (_context: any, _output: any) => {
          console.log('Compensating failing step');
        }
      }
    ]
  };

  try {
    console.log('📋 Test Context:', testContext);
    console.log('🔄 Executing failing saga...\n');

    const result = await atomicApi.executeSaga(failingSaga, testContext);

    console.log('📊 Saga Result:');
    console.log('Status:', result.status);
    console.log('Execution ID:', result.id);
    
    if (result.error) {
      console.log('Error:', result.error.message);
    }

    console.log('\n📝 Step Results:');
    result.stepResults.forEach((step, index) => {
      console.log(`${index + 1}. ${step.stepName}: ${step.status}`);
      if (step.error) {
        console.log(`   Error: ${step.error.message}`);
      }
    });

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test idempotency
async function testIdempotency() {
  console.log('\n🧪 Testing Idempotency\n');

  const logger = new MockLogger();
  const atomicApi = new AtomicApiOperations({
    idempotencyStore: new MockIdempotencyStore(),
    sagaStore: new MockSagaStore(),
    logger
  });

  const key = atomicApi.generateIdempotencyKey();
  console.log('Generated idempotency key:', key);

  // Test key generation
  const isValid = key.length > 0;
  console.log('Key validation:', isValid);

  return { key, isValid };
}

// Jest test functions
describe('Atomic API Operations', () => {
  test('should execute basic saga successfully', async () => {
    const result = await testBasicFunctionality();
    expect(result.status).toBe('COMPLETED');
  });

  test('should handle saga failures with compensation', async () => {
    const result = await testWithFailure();
    expect(result.status).toBe('COMPENSATED');
  });

  test('should generate idempotency keys', async () => {
    const { key, isValid } = await testIdempotency();
    expect(isValid).toBe(true);
    expect(key.length).toBeGreaterThan(0);
  });
});

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Atomic API Operations Tests\n');

  try {
    await testBasicFunctionality();
    await testWithFailure();
    await testIdempotency();
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  }
}

// Export for use in other files
export {
  testBasicFunctionality,
  testWithFailure,
  testIdempotency,
  runAllTests
};

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
} 