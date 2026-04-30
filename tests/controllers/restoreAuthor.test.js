import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let restoreAuthor;
let mockFetchFirst;
let mockFetchAll;
let mockExecute;

describe('restoreAuthor unit test', () => {
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        
        mockFetchFirst = jest.fn();
        mockFetchAll = jest.fn();
        mockExecute = jest.fn();
        
        jest.doMock('../../utils/dbRunMethodWrapper.js', () => ({
            __esModule: true,
            fetchFirst: mockFetchFirst,
            fetchAll: mockFetchAll,
            execute: mockExecute
        }));
        
        const authorModule = await import('../../controllers/authorController.js');
        restoreAuthor = authorModule.restoreAuthor;

        req = { params: { authorId: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    test('should restore a deleted author and their books', async () => {
        mockFetchFirst.mockResolvedValue({ id: 1, name: 'Test Author', email: 'test@test.com', deleted_at: '2025-09-13 06:47:02' });
        mockExecute.mockResolvedValue();

        await restoreAuthor(req, res);

        expect(mockFetchFirst).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('SELECT * FROM authors WHERE id = ? AND deleted_at IS NOT NULL'),
            [1]
        );
        expect(mockExecute).toHaveBeenCalledTimes(2);
        expect(mockExecute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE books SET deleted_at = NULL'),
            [1]
        );
        expect(mockExecute).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('UPDATE authors SET deleted_at = NULL'),
            [1]
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Author restored successfully' });
    });

    test('should return 404 when deleted author does not exist', async () => {
        mockFetchFirst.mockResolvedValue(null);

        await expect(restoreAuthor(req, res)).rejects.toMatchObject({
            message: 'Deleted author with the given id 1 does not exist',
            statusCode: 404
        });

        expect(mockExecute).not.toHaveBeenCalled();
    });
});
