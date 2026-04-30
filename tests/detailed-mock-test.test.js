import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let myFunc;
let mockMyFunc;

describe('detailed mock test', () => {
    beforeEach(async () => {
        jest.resetModules();
        
        mockMyFunc = jest.fn();
        console.log('Created mockMyFunc:', typeof mockMyFunc, mockMyFunc.mockResolvedValue);
        
        jest.doMock('../utils/test-util.js', () => {
            console.log('doMock factory called, mockMyFunc:', typeof mockMyFunc);
            return {
                __esModule: true,
                myFunc: mockMyFunc
            };
        });
        
        const module = await import('../utils/test-util.js');
        console.log('Imported module:', module);
        console.log('module.myFunc:', typeof module.myFunc);
        console.log('module.myFunc.mockResolvedValue:', module.myFunc.mockResolvedValue);
        
        myFunc = module.myFunc;
    });

    test('should mock the function', async () => {
        console.log('Before mockResolvedValue, mockMyFunc:', typeof mockMyFunc);
        console.log('mockMyFunc.mockResolvedValue:', mockMyFunc.mockResolvedValue);
        
        mockMyFunc.mockResolvedValue('mocked result');
        
        const result = await myFunc('test');
        
        console.log('Result:', result);
        console.log('mockMyFunc called:', mockMyFunc.mock.calls);
        
        expect(mockMyFunc).toHaveBeenCalledWith('test');
        expect(result).toBe('mocked result');
    });
});
