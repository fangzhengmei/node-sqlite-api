jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation((path, callback) => {
    if (callback) callback(null);
    return {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      close: jest.fn()
    };
  })
}));
