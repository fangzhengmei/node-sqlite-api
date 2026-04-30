import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let myModule;
let mockFunc;

describe('jest.doMock with dynamic import test', () => {
    beforeEach(async () => {
        jest.resetModules();
        
        mockFunc = jest.fn();
        
        jest.doMock('../utils/test-util.js', () => ({
            __esModule: true,
            myFunc: mockFunc
        }));
        
        const module = await import('../utils/test-util.js');
        myModule = module;
    });

    test('should mock the function', async () => {
        mockFunc.mockResolvedValue('mocked result');
        
        const result = await myModule.myFunc('test');
        
        expect(mockFunc).toHaveBeenCalledWith('test');
        expect(result).toBe('mocked result');
    });

    test('should mock again in different test', async () => {
        mockFunc.mockResolvedValue('another result');
        
        const result = await myModule.myFunc('another');
        
        expect(mockFunc).toHaveBeenCalledWith('another');
        expect(result).toBe('another result');
    });
});
