import { jest } from '@jest/globals';

jest.mock('sqlite3', () => ({
  default: {
    Database: jest.fn().mockImplementation(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      exec: jest.fn()
    }))
  }
}));

jest.mock('./config/connDB.js', () => ({
  default: {}
}));

jest.mock('./logger/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('./utils/dbRunMethodWrapper.js', () => ({
  execute: jest.fn(),
  fetchFirst: jest.fn(),
  fetchAll: jest.fn()
}));

console.log('Jest setup completed - mocks are in place');
