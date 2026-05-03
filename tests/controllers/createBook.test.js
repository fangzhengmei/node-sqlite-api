import { createBooks } from '../../controllers/booksController.js';
import * as dbHelpers from "../../utils/dbRunMethodWrapper.js";

jest.mock('../../utils/dbRunMethodWrapper.js');

describe('Create Books test',()=>{
    let req;
    let res;

    beforeEach(()=>{
        jest.clearAllMocks();
        req = { 
            body : { 
                title : 'Test',
                isbn : '1234567890',
                published_year : 1996 , 
                author_id : 1}
        };
        res = {
            status : jest.fn().mockReturnThis(),
            json : jest.fn()
        }
    });

    test('should create a book if it does not already exist and author exists', async()=>{
        dbHelpers.fetchFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 1, name: 'Test Author' });
        dbHelpers.execute.mockResolvedValue();

        await createBooks(req, res);

        expect(dbHelpers.fetchFirst).toHaveBeenCalledTimes(2);
        expect(dbHelpers.execute).toHaveBeenCalledWith(
            expect.anything(),
            `INSERT INTO books
            (title, isbn, published_year, author_id)
            VALUES
            (?,?,?,?)`,
            ['Test','1234567890',1996,1]
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({msg:'Book created successfully'});
    });

    test('Throw 409 if book already exists', async()=>{
        dbHelpers.fetchFirst.mockResolvedValue({
                id : 1,
                title : 'Test',
                isbn : '1234567890',
                published_year : 1996 , 
                author_id : 1,
                created_at : '2025-09-12 06:47:02',
            });
        
        await expect(createBooks(req,res)).rejects.toMatchObject({
            message: 'Book with this isbn already exists',
            statusCode: 409
        });

        expect(dbHelpers.execute).not.toHaveBeenCalled();
    });

})