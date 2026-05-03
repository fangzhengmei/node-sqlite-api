import { jest, expect, describe, test, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../utils/dbRunMethodWrapper.js', () => ({
  fetchFirst: jest.fn(),
  fetchAll: jest.fn(),
  execute: jest.fn()
}));

jest.unstable_mockModule('../../config/connDB.js', () => ({
  default: {}
}));

jest.unstable_mockModule('../../logger/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.unstable_mockModule('../../utils/asyncWrapper.js', () => ({
  asyncHandler: (fn) => fn
}));

describe('create author unit test', () => {
    let createAuthor;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const authorModule = await import('../../controllers/authorController.js');
        createAuthor = authorModule.createAuthor;

        req = {
            body: {
                name: 'test',
                email: 'test@example.com'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    test('create a new author in authors table', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);
        dbHelpers.execute.mockResolvedValue();

        await createAuthor(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors WHERE email = ?'),
            ['test@example.com']
        );

        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('INSERT INTO authors'),
            ['test', 'test@example.com']
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            msg: 'Author created successfully'
        });
    });

    test('throw 409 error if author already exists', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({
            id: 1,
            name: 'test',
            email: 'test@example.com'
        });

        await expect(createAuthor(req, res)).rejects.toMatchObject({
            message: 'Author with this email already exists',
            statusCode: 409,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });
});
