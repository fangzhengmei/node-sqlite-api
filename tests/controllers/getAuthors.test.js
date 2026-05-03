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

describe('get authors controller unit test', () => {
    let getAllAuthors;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const authorModule = await import('../../controllers/authorController.js');
        getAllAuthors = authorModule.getAllAuthors;

        req = { query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('return all authors list', async () => {
        dbHelpers.fetchAll.mockResolvedValue([{
            id: 1,
            name: 'test',
            email: 'test@example.com',
            books_count: 2
        }]);

        await getAllAuthors(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: expect.stringContaining('retreived'),
            data: expect.any(Array)
        }));
    });

    test('return 204 if authors does not exist', async () => {
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getAllAuthors(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: "No any authors in the list yet" });
    });
});
