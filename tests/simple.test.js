import { jest, describe, test, expect } from '@jest/globals';

describe('simple test', () => {
    test('should pass', () => {
        expect(1 + 1).toBe(2);
    });

    test('should mock a function', () => {
        const mockFn = jest.fn();
        mockFn.mockReturnValue('hello');
        expect(mockFn()).toBe('hello');
        expect(mockFn).toHaveBeenCalled();
    });
});
