import { BenchmarkTest } from '../models/index.js';
import { logger } from './logger.js';

/**
 * Standard Test Suites - Predefined benchmark tests
 */

/**
 * Get CRUD test suite
 */
export async function getCRUDTestSuite(): Promise<string[]> {
  const tests = [
    {
      testId: 'crud_create_facility',
      name: 'Create Facility',
      description: 'Test creating a new facility',
      test: {
        query: 'Create a new facility called Test Facility in New York',
        expectedOutcome: {
          type: 'success' as const,
          expectedSteps: ['create_facility'],
        },
      },
      category: 'crud',
      tags: ['create', 'facility'],
      priority: 'high' as const,
    },
    {
      testId: 'crud_list_facilities',
      name: 'List Facilities',
      description: 'Test listing all facilities',
      test: {
        query: 'List all facilities',
        expectedOutcome: {
          type: 'success' as const,
          expectedSteps: ['list_facilities'],
        },
      },
      category: 'crud',
      tags: ['read', 'facility'],
      priority: 'high' as const,
    },
    {
      testId: 'crud_get_facility',
      name: 'Get Facility',
      description: 'Test getting a specific facility',
      test: {
        query: 'Get facility with short code TEST',
        expectedOutcome: {
          type: 'success' as const,
          expectedSteps: ['get_facility'],
        },
      },
      category: 'crud',
      tags: ['read', 'facility'],
      priority: 'medium' as const,
    },
  ];

  const testIds: string[] = [];
  for (const test of tests) {
    await BenchmarkTest.findOneAndUpdate(
      { testId: test.testId },
      test,
      { upsert: true }
    );
    testIds.push(test.testId);
  }

  return testIds;
}

/**
 * Get complex workflow test suite
 */
export async function getComplexWorkflowTestSuite(): Promise<string[]> {
  const tests = [
    {
      testId: 'complex_list_and_create',
      name: 'List and Create Shipment',
      description: 'Test multi-step workflow: list facilities then create shipment',
      test: {
        query: 'List all facilities and create a shipment for the first one',
        expectedOutcome: {
          type: 'success' as const,
          expectedSteps: ['list_facilities', 'create_shipment'],
          maxDuration: 10000,
        },
      },
      category: 'complex',
      tags: ['multi-step', 'workflow'],
      priority: 'high' as const,
    },
  ];

  const testIds: string[] = [];
  for (const test of tests) {
    await BenchmarkTest.findOneAndUpdate(
      { testId: test.testId },
      test,
      { upsert: true }
    );
    testIds.push(test.testId);
  }

  return testIds;
}

/**
 * Get error handling test suite
 */
export async function getErrorHandlingTestSuite(): Promise<string[]> {
  const tests = [
    {
      testId: 'error_invalid_facility',
      name: 'Handle Invalid Facility',
      description: 'Test error handling for invalid facility ID',
      test: {
        query: 'Get facility with ID INVALID_ID_12345',
        expectedOutcome: {
          type: 'failure' as const,
        },
      },
      category: 'error_handling',
      tags: ['error', 'validation'],
      priority: 'medium' as const,
    },
  ];

  const testIds: string[] = [];
  for (const test of tests) {
    await BenchmarkTest.findOneAndUpdate(
      { testId: test.testId },
      test,
      { upsert: true }
    );
    testIds.push(test.testId);
  }

  return testIds;
}

/**
 * Get all standard test suites
 */
export async function getAllStandardTestSuites(): Promise<{
  crud: string[];
  complex: string[];
  errorHandling: string[];
}> {
  const crud = await getCRUDTestSuite();
  const complex = await getComplexWorkflowTestSuite();
  const errorHandling = await getErrorHandlingTestSuite();

  return {
    crud,
    complex,
    errorHandling,
  };
}

