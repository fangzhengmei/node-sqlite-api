const mockDatabase = {
  run: jest.fn((sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (callback) callback(null);
    return mockDatabase;
  }),
  get: jest.fn((sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (callback) callback(null, null);
    return mockDatabase;
  }),
  all: jest.fn((sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (callback) callback(null, []);
    return mockDatabase;
  }),
  close: jest.fn((callback) => {
    if (callback) callback(null);
    return mockDatabase;
  })
};

const mockSqlite3 = {
  Database: jest.fn((filename, callback) => {
    if (callback) callback(null);
    return mockDatabase;
  }),
  cached: {
    Database: jest.fn((filename, callback) => {
      if (callback) callback(null);
      return mockDatabase;
    })
  }
};

export default mockSqlite3;
