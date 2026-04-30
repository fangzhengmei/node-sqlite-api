import { createReservation, cancelReservation, checkExpiredReservations } from "../../controllers/reservationController.js";
import * as dbHelpers from '../../utils/dbRunMethodWrapper.js'

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('createReservation unit tests', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();

        req = {
            body : { reader_id : 1, book_id : 1, expire_hours: 24 },
        };

        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn(),
        };
    });

    test('should create a reservation when book has no available copies', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', published_year: 2020, author_id: 1 })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ available_quantity: 0 })
            .mockResolvedValueOnce({ count: 0 });
        
        dbHelpers.execute.mockResolvedValue();

        await createReservation(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(6);
        expect(dbHelpers.execute).toHaveBeenCalledTimes(1);

        expect(res.status).toHaveBeenCalledWith(200);
    })

    test('throw error if reader does not exist', async()=>{
        dbHelpers.fetchFirst.mockResolvedValueOnce(null);

        await expect(createReservation(req, res)).rejects.toMatchObject({
            message: 'Reader with id 1 does not exist',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if book does not exist', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce(null);

        await expect(createReservation(req, res)).rejects.toMatchObject({
            message: 'Book with id 1 does not exist',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if reader already has active reservation', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', published_year: 2020, author_id: 1 })
            .mockResolvedValueOnce({ id: 1, reader_id: 1, book_id: 1, status: 'pending' });

        await expect(createReservation(req, res)).rejects.toMatchObject({
            message: 'You already have an active reservation for this book',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if book has available copies', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, name: 'Test Reader', email: 'reader@test.com' })
            .mockResolvedValueOnce({ id: 1, title: 'Test Book', isbn: '1234567890', published_year: 2020, author_id: 1 })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ available_quantity: 5 });

        await expect(createReservation(req, res)).rejects.toMatchObject({
            message: 'This book has available copies. You can borrow it directly.',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })
})

describe('cancelReservation unit tests', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();

        req = {
            params : { id : 1 },
        };

        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn(),
        };
    });

    test('should cancel a pending reservation successfully', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce({ id: 1, reader_id: 1, book_id: 1, status: 'pending', queue_position: 1 });
        
        dbHelpers.execute.mockResolvedValue();

        await cancelReservation(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(1);
        expect(dbHelpers.execute).toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'Reservation cancelled successfully' });
    })

    test('throw error if reservation does not exist', async()=>{
        dbHelpers.fetchFirst.mockResolvedValueOnce(null);

        await expect(cancelReservation(req, res)).rejects.toMatchObject({
            message: 'Reservation with id 1 does not exist',
            statusCode: 404,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })

    test('throw error if reservation is already cancelled', async()=>{
        dbHelpers.fetchFirst.mockResolvedValueOnce({ id: 1, reader_id: 1, book_id: 1, status: 'cancelled', queue_position: 1 });

        await expect(cancelReservation(req, res)).rejects.toMatchObject({
            message: 'This reservation cannot be cancelled. Current status: cancelled',
            statusCode: 400,
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    })
})

describe('checkExpiredReservations unit tests', ()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();

        req = {};

        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn(),
        };
    });

    test('should return no expired reservations when none exist', async()=>{
        dbHelpers.fetchAll.mockResolvedValueOnce([]);

        await checkExpiredReservations(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ msg: 'No expired reservations found', expired_count: 0 });
    })

    test('should process expired reservations', async()=>{
        dbHelpers.fetchAll.mockResolvedValueOnce([
            { id: 1, book_id: 1, queue_position: 1 },
            { id: 2, book_id: 1, queue_position: 2 }
        ]);
        dbHelpers.execute.mockResolvedValue();

        await checkExpiredReservations(req, res);

        expect(dbHelpers.fetchAll).toHaveBeenCalled();
        expect(dbHelpers.execute).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    })
})
