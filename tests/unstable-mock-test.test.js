import { jest, describe, test, expect, beforeEach } from '@jest/globals';

let myFunc;
let mockMyFunc;

describe('unstable_mockModule test', () => {
    beforeEach(async () => {
        jest.resetModules();
        
        mockMyFunc = jest.fn();
        console.log('Created mockMyFunc:', typeof mockMyFunc);
        
        await jest.unstable_mockModule('../utils/test-util.js', () => {
            console.log('unstable_mockModule factory called');
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
        mockMyFunc.mockResolvedValue('mocked result');
        
        const result = await myFunc('test');
        
        console.log('Result:', result);
        console.log('mockMyFunc called:', mockMyFunc.mock.calls);
        
        expect(mockMyFunc).toHaveBeenCalledWith('test');
        expect(result).toBe('mocked result');
    });
});
