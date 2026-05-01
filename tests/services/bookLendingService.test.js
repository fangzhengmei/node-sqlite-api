import * as lendingService from '../../services/bookLendingService.js';
import * as dbHelper from '../../utils/dbRunMethodWrapper.js';
import { BookStates, BookEvents } from '../../utils/stateMachine.js';

jest.mock('../../utils/dbRunMethodWrapper.js');
jest.mock('../../config/connDB.js', () => ({}));
jest.mock('../../logger/logger.js', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('BookLendingService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getBookById', () => {
        test('should return book when found', async () => {
            const mockBook = {
                id: 1,
                title: 'Test Book',
                isbn: '1234567890',
                status: BookStates.AVAILABLE,
                total_copies: 5,
                available_copies: 5
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockBook);
            
            const result = await lendingService.getBookById(1);
            
            expect(dbHelper.fetchFirst).toHaveBeenCalledWith(
                expect.anything(),
                'SELECT * FROM books WHERE id = ?',
                [1]
            );
            expect(result).toEqual(mockBook);
        });

        test('should return null when book not found', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            const result = await lendingService.getBookById(999);
            
            expect(result).toBeNull();
        });
    });

    describe('reserveBook', () => {
        test('should reserve book successfully when available', async () => {
            const mockBook = {
                id: 1,
                title: 'Test Book',
                status: BookStates.AVAILABLE,
                available_copies: 5
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                if (sql.includes('SELECT * FROM reservations')) {
                    return Promise.resolve(null);
                }
                return Promise.resolve(null);
            });
            
            dbHelper.execute.mockResolvedValue({ lastID: 100 });
            
            const result = await lendingService.reserveBook(1, 1);
            
            expect(result.reservationId).toBe(100);
            expect(result.bookId).toBe(1);
            expect(result.userId).toBe(1);
            expect(result.status).toBe('active');
        });

        test('should throw error when book not found', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            await expect(lendingService.reserveBook(999, 1)).rejects.toThrow('Book with id 999 not found');
        });

        test('should throw error when book status cannot be reserved', async () => {
            const mockBook = {
                id: 1,
                status: BookStates.CHECKED_OUT,
                available_copies: 0
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockBook);
            
            await expect(lendingService.reserveBook(1, 1)).rejects.toThrow('Cannot reserve book with status checked_out');
        });

        test('should throw error when no available copies', async () => {
            const mockBook = {
                id: 1,
                status: BookStates.AVAILABLE,
                available_copies: 0
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockBook);
            
            await expect(lendingService.reserveBook(1, 1)).rejects.toThrow('No available copies');
        });

        test('should throw error when user already has active reservation', async () => {
            const mockBook = {
                id: 1,
                status: BookStates.AVAILABLE,
                available_copies: 5
            };
            
            const mockReservation = {
                id: 100,
                book_id: 1,
                user_id: 1,
                status: 'active'
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                if (sql.includes('SELECT * FROM reservations')) {
                    return Promise.resolve(mockReservation);
                }
                return Promise.resolve(null);
            });
            
            await expect(lendingService.reserveBook(1, 1)).rejects.toThrow('already has an active reservation');
        });
    });

    describe('checkoutBook', () => {
        test('should checkout book successfully when available', async () => {
            const mockBook = {
                id: 1,
                title: 'Test Book',
                status: BookStates.AVAILABLE,
                available_copies: 5
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                if (sql.includes('SELECT * FROM loans')) {
                    return Promise.resolve(null);
                }
                return Promise.resolve(null);
            });
            
            dbHelper.execute.mockResolvedValue({ lastID: 200 });
            
            const result = await lendingService.checkoutBook(1, 1);
            
            expect(result.loanId).toBe(200);
            expect(result.bookId).toBe(1);
            expect(result.userId).toBe(1);
            expect(result.status).toBe('active');
        });

        test('should throw error when book not found', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            await expect(lendingService.checkoutBook(999, 1)).rejects.toThrow('Book with id 999 not found');
        });

        test('should throw error when book status cannot be checked out', async () => {
            const mockBook = {
                id: 1,
                status: BookStates.LOST,
                available_copies: 0
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockBook);
            
            await expect(lendingService.checkoutBook(1, 1)).rejects.toThrow('Cannot checkout book with status lost');
        });
    });

    describe('returnBook', () => {
        test('should return book successfully', async () => {
            const mockLoan = {
                id: 200,
                book_id: 1,
                user_id: 1,
                status: 'active'
            };
            
            const mockBook = {
                id: 1,
                status: BookStates.CHECKED_OUT,
                available_copies: 4
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM loans WHERE id = ?')) {
                    return Promise.resolve(mockLoan);
                }
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                return Promise.resolve(null);
            });
            
            dbHelper.execute.mockResolvedValue({});
            
            const result = await lendingService.returnBook(200, 1);
            
            expect(result.loanId).toBe(200);
            expect(result.bookId).toBe(1);
            expect(result.userId).toBe(1);
            expect(result.status).toBe('returned');
        });

        test('should throw error when loan not found', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            await expect(lendingService.returnBook(999, 1)).rejects.toThrow('Loan 999 not found');
        });

        test('should throw error when loan is not active or overdue', async () => {
            const mockLoan = {
                id: 200,
                book_id: 1,
                user_id: 1,
                status: 'returned'
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockLoan);
            
            await expect(lendingService.returnBook(200, 1)).rejects.toThrow('is not active or overdue');
        });
    });

    describe('cancelReservation', () => {
        test('should cancel reservation successfully', async () => {
            const mockReservation = {
                id: 100,
                book_id: 1,
                user_id: 1,
                status: 'active'
            };
            
            const mockBook = {
                id: 1,
                status: BookStates.RESERVED
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM reservations WHERE id = ?')) {
                    return Promise.resolve(mockReservation);
                }
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                return Promise.resolve(null);
            });
            
            dbHelper.execute.mockResolvedValue({});
            
            const result = await lendingService.cancelReservation(100, 1);
            
            expect(result.reservationId).toBe(100);
            expect(result.bookId).toBe(1);
            expect(result.userId).toBe(1);
            expect(result.status).toBe('cancelled');
        });

        test('should throw error when reservation not found', async () => {
            dbHelper.fetchFirst.mockResolvedValue(null);
            
            await expect(lendingService.cancelReservation(999, 1)).rejects.toThrow('Reservation 999 not found');
        });

        test('should throw error when reservation is not active', async () => {
            const mockReservation = {
                id: 100,
                book_id: 1,
                user_id: 1,
                status: 'cancelled'
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockReservation);
            
            await expect(lendingService.cancelReservation(100, 1)).rejects.toThrow('is not active');
        });
    });

    describe('activateReservation', () => {
        test('should activate reservation successfully', async () => {
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);
            
            const mockReservation = {
                id: 100,
                book_id: 1,
                user_id: 1,
                status: 'active',
                expires_at: futureDate.toISOString()
            };
            
            const mockBook = {
                id: 1,
                status: BookStates.RESERVED,
                available_copies: 5
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM reservations WHERE id = ?')) {
                    return Promise.resolve(mockReservation);
                }
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                return Promise.resolve(null);
            });
            
            dbHelper.execute.mockResolvedValue({ lastID: 200 });
            
            const result = await lendingService.activateReservation(100, 1);
            
            expect(result.loanId).toBe(200);
            expect(result.reservationId).toBe(100);
            expect(result.bookId).toBe(1);
            expect(result.userId).toBe(1);
            expect(result.status).toBe('active');
        });

        test('should throw error when reservation has expired', async () => {
            const pastDate = new Date();
            pastDate.setHours(pastDate.getHours() - 1);
            
            const mockReservation = {
                id: 100,
                book_id: 1,
                user_id: 1,
                status: 'active',
                expires_at: pastDate.toISOString()
            };
            
            const mockBook = {
                id: 1,
                status: BookStates.RESERVED,
                available_copies: 5
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM reservations WHERE id = ?')) {
                    return Promise.resolve(mockReservation);
                }
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                return Promise.resolve(null);
            });
            
            await expect(lendingService.activateReservation(100, 1)).rejects.toThrow('has expired');
        });
    });

    describe('restoreInventory', () => {
        test('should restore lost book to available', async () => {
            const mockBook = {
                id: 1,
                status: BookStates.LOST
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockBook);
            dbHelper.execute.mockResolvedValue({});
            
            const result = await lendingService.restoreInventory(1, 1, 'found and returned');
            
            expect(result.bookId).toBe(1);
            expect(result.previousStatus).toBe(BookStates.LOST);
            expect(result.newStatus).toBe(BookStates.AVAILABLE);
            expect(result.reason).toBe('found and returned');
        });

        test('should restore damaged book to available', async () => {
            const mockBook = {
                id: 1,
                status: BookStates.DAMAGED
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockBook);
            dbHelper.execute.mockResolvedValue({});
            
            const result = await lendingService.restoreInventory(1, 1, 'repaired');
            
            expect(result.bookId).toBe(1);
            expect(result.previousStatus).toBe(BookStates.DAMAGED);
            expect(result.newStatus).toBe(BookStates.AVAILABLE);
        });

        test('should throw error when book cannot be restored', async () => {
            const mockBook = {
                id: 1,
                status: BookStates.AVAILABLE
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockBook);
            
            await expect(lendingService.restoreInventory(1, 1)).rejects.toThrow('Cannot restore book with status available');
        });
    });

    describe('markOverdue', () => {
        test('should mark active loan as overdue', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7);
            
            const mockLoan = {
                id: 200,
                book_id: 1,
                user_id: 1,
                status: 'active',
                due_date: pastDate.toISOString()
            };
            
            const mockBook = {
                id: 1,
                status: BookStates.CHECKED_OUT
            };
            
            dbHelper.fetchFirst.mockImplementation((db, sql, params) => {
                if (sql.includes('SELECT * FROM loans WHERE id = ?')) {
                    return Promise.resolve(mockLoan);
                }
                if (sql.includes('SELECT * FROM books WHERE id = ?')) {
                    return Promise.resolve(mockBook);
                }
                return Promise.resolve(null);
            });
            
            dbHelper.execute.mockResolvedValue({});
            
            const result = await lendingService.markOverdue(200);
            
            expect(result.loanId).toBe(200);
            expect(result.bookId).toBe(1);
            expect(result.userId).toBe(1);
            expect(result.status).toBe('overdue');
        });

        test('should throw error when loan is not active', async () => {
            const mockLoan = {
                id: 200,
                book_id: 1,
                user_id: 1,
                status: 'returned',
                due_date: new Date().toISOString()
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockLoan);
            
            await expect(lendingService.markOverdue(200)).rejects.toThrow('is not active');
        });

        test('should throw error when loan is not yet overdue', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            
            const mockLoan = {
                id: 200,
                book_id: 1,
                user_id: 1,
                status: 'active',
                due_date: futureDate.toISOString()
            };
            
            dbHelper.fetchFirst.mockResolvedValue(mockLoan);
            
            await expect(lendingService.markOverdue(200)).rejects.toThrow('is not yet overdue');
        });
    });
});
