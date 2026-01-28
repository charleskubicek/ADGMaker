/**
 * Jest Test Setup
 *
 * This file is run before each test file.
 */

import * as path from 'path';
import * as fs from 'fs';

// Global test constants
export const TEST_FIXTURES_PATH = path.join(__dirname, 'fixtures');
export const TEST_TEMPLATES_PATH = path.join(__dirname, '..', 'templates');
export const TEST_OUTPUT_PATH = path.join(__dirname, 'fixtures', 'output');

// Ensure output directory exists for tests
beforeAll(() => {
  if (!fs.existsSync(TEST_OUTPUT_PATH)) {
    fs.mkdirSync(TEST_OUTPUT_PATH, { recursive: true });
  }
});

// Clean up output directory after all tests
afterAll(() => {
  if (fs.existsSync(TEST_OUTPUT_PATH)) {
    const files = fs.readdirSync(TEST_OUTPUT_PATH);
    for (const file of files) {
      fs.unlinkSync(path.join(TEST_OUTPUT_PATH, file));
    }
  }
});

// Increase timeout for file operations
jest.setTimeout(10000);
