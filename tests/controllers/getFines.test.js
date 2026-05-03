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

describe('getAllFines unit tests', () => {
    let getAllFines;
    let getSingleFine;
    let getOverdueFinesReminder;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const fineModule = await import('../../controllers/fineController.js');
        getAllFines = fineModule.getAllFines;
        getSingleFine = fineModule.getSingleFine;
        getOverdueFinesReminder = fineModule.getOverdueFinesReminder;

        req = { query: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should return fines with default query params', async () => {
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                borrow_record_id: 1,
                fine_amount: 2.5,
                fine_days: 5,
                is_paid: 0,
                borrower_name: 'John Doe',
                title: 'Test Book'
            }
        ]);

        await getAllFines(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('LIMIT ? OFFSET ?'),
            expect.arrayContaining([10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Fines retrieved successfully',
            data: expect.any(Array)
        }));
    });

    test('should apply borrower_name filter when provided', async () => {
        req.query = { borrower_name: 'John' };
        dbHelpers.fetchAll.mockResolvedValue([
            {
                id: 1,
                borrow_record_id: 1,
                fine_amount: 2.5,
                fine_days: 5,
                borrower_name: 'John Doe',
                title: 'Test Book'
            }
        ]);

        await getAllFines(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE br.borrower_name LIKE ?'),
            expect.arrayContaining(['%John%', 10, 0])
        );

        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 204 when no fines found', async () => {
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getAllFines(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.json).toHaveBeenCalledWith({ msg: 'No fines found' });
    });
});

describe('getSingleFine unit tests', () => {
    let getAllFines;
    let getSingleFine;
    let getOverdueFinesReminder;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const fineModule = await import('../../controllers/fineController.js');
        getAllFines = fineModule.getAllFines;
        getSingleFine = fineModule.getSingleFine;
        getOverdueFinesReminder = fineModule.getOverdueFinesReminder;

        req = { params: { id: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should return fine when exists', async () => {
        dbHelpers.fetchFirst.mockResolvedValue({
            id: 1,
            borrow_record_id: 1,
            fine_amount: 2.5,
            fine_days: 5,
            is_paid: 0,
            borrower_name: 'John Doe',
            title: 'Test Book'
        });

        await getSingleFine(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE f.id = ?'),
            [1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Fine retrieved successfully'
        }));
    });

    test('should throw 404 when fine does not exist', async () => {
        dbHelpers.fetchFirst.mockResolvedValue(null);

        await expect(getSingleFine(req, res)).rejects.toMatchObject({
            message: 'Fine with id 1 does not exist',
            statusCode: 404,
        });
    });
});

describe('getOverdueFinesReminder unit tests', () => {
    let getAllFines;
    let getSingleFine;
    let getOverdueFinesReminder;
    let dbHelpers;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        
        const dbHelpersModule = await import('../../utils/dbRunMethodWrapper.js');
        dbHelpers = dbHelpersModule;
        
        const fineModule = await import('../../controllers/fineController.js');
        getAllFines = fineModule.getAllFines;
        getSingleFine = fineModule.getSingleFine;
        getOverdueFinesReminder = fineModule.getOverdueFinesReminder;

        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should return overdue reminder with data', async () => {
        dbHelpers.fetchAll.mockResolvedValue([
            {
                borrow_id: 1,
                book_id: 1,
                borrower_name: 'John Doe',
                borrow_date: '2026-04-01',
                due_date: '2026-04-15',
                title: 'Test Book',
                overdue_days: 5.5,
                estimated_fine: 2.75
            }
        ]);

        await getOverdueFinesReminder(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('WHERE br.return_date IS NULL'),
            []
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'Overdue fines reminder generated successfully',
            summary: expect.objectContaining({
                total_overdue: expect.any(Number),
                total_estimated_fine: expect.any(Number)
            })
        }));
    });

    test('should return empty reminder when no overdue books', async () => {
        dbHelpers.fetchAll.mockResolvedValue([]);

        await getOverdueFinesReminder(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            msg: 'No overdue books found',
            summary: expect.objectContaining({
                total_overdue: 0
            })
        }));
    });
});
