export default {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    exec: jest.fn(),
    serialize: jest.fn((fn) => fn())
};
