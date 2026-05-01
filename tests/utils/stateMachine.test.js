import { 
    BookStates, 
    BookEvents, 
    canTransition, 
    getNextState, 
    isValidState, 
    isValidEvent,
    isValidInitialState,
    getAvailableEvents,
    BookStateMachine
} from '../../utils/stateMachine.js';

describe('BookStateMachine', () => {
    describe('State and Event Definitions', () => {
        test('should have all required states defined', () => {
            expect(BookStates.AVAILABLE).toBe('available');
            expect(BookStates.RESERVED).toBe('reserved');
            expect(BookStates.CHECKED_OUT).toBe('checked_out');
            expect(BookStates.OVERDUE).toBe('overdue');
            expect(BookStates.LOST).toBe('lost');
            expect(BookStates.DAMAGED).toBe('damaged');
        });

        test('should have all required events defined', () => {
            expect(BookEvents.RESERVE).toBe('reserve');
            expect(BookEvents.CHECKOUT).toBe('checkout');
            expect(BookEvents.RETURN).toBe('return');
            expect(BookEvents.CANCEL_RESERVATION).toBe('cancel_reservation');
            expect(BookEvents.MARK_OVERDUE).toBe('mark_overdue');
            expect(BookEvents.MARK_LOST).toBe('mark_lost');
            expect(BookEvents.MARK_DAMAGED).toBe('mark_damaged');
            expect(BookEvents.RESTORE).toBe('restore');
        });
    });

    describe('Validation Functions', () => {
        test('isValidState should return true for valid states', () => {
            expect(isValidState(BookStates.AVAILABLE)).toBe(true);
            expect(isValidState(BookStates.RESERVED)).toBe(true);
            expect(isValidState(BookStates.CHECKED_OUT)).toBe(true);
            expect(isValidState(BookStates.OVERDUE)).toBe(true);
            expect(isValidState(BookStates.LOST)).toBe(true);
            expect(isValidState(BookStates.DAMAGED)).toBe(true);
        });

        test('isValidState should return false for invalid states', () => {
            expect(isValidState('invalid_state')).toBe(false);
            expect(isValidState(null)).toBe(false);
            expect(isValidState(undefined)).toBe(false);
        });

        test('isValidEvent should return true for valid events', () => {
            expect(isValidEvent(BookEvents.RESERVE)).toBe(true);
            expect(isValidEvent(BookEvents.CHECKOUT)).toBe(true);
            expect(isValidEvent(BookEvents.RETURN)).toBe(true);
        });

        test('isValidInitialState should return true for valid initial states', () => {
            expect(isValidInitialState(BookStates.AVAILABLE)).toBe(true);
            expect(isValidInitialState(BookStates.DAMAGED)).toBe(true);
            expect(isValidInitialState(BookStates.LOST)).toBe(true);
        });

        test('isValidInitialState should return false for invalid initial states', () => {
            expect(isValidInitialState(BookStates.RESERVED)).toBe(false);
            expect(isValidInitialState(BookStates.CHECKED_OUT)).toBe(false);
            expect(isValidInitialState(BookStates.OVERDUE)).toBe(false);
        });
    });

    describe('State Transitions', () => {
        describe('From AVAILABLE state', () => {
            test('can transition to RESERVED via RESERVE event', () => {
                expect(canTransition(BookStates.AVAILABLE, BookEvents.RESERVE)).toBe(true);
                expect(getNextState(BookStates.AVAILABLE, BookEvents.RESERVE)).toBe(BookStates.RESERVED);
            });

            test('can transition to CHECKED_OUT via CHECKOUT event', () => {
                expect(canTransition(BookStates.AVAILABLE, BookEvents.CHECKOUT)).toBe(true);
                expect(getNextState(BookStates.AVAILABLE, BookEvents.CHECKOUT)).toBe(BookStates.CHECKED_OUT);
            });

            test('can transition to DAMAGED via MARK_DAMAGED event', () => {
                expect(canTransition(BookStates.AVAILABLE, BookEvents.MARK_DAMAGED)).toBe(true);
                expect(getNextState(BookStates.AVAILABLE, BookEvents.MARK_DAMAGED)).toBe(BookStates.DAMAGED);
            });

            test('cannot transition via invalid events', () => {
                expect(canTransition(BookStates.AVAILABLE, BookEvents.RETURN)).toBe(false);
                expect(canTransition(BookStates.AVAILABLE, BookEvents.CANCEL_RESERVATION)).toBe(false);
            });
        });

        describe('From RESERVED state', () => {
            test('can transition to CHECKED_OUT via CHECKOUT event', () => {
                expect(canTransition(BookStates.RESERVED, BookEvents.CHECKOUT)).toBe(true);
                expect(getNextState(BookStates.RESERVED, BookEvents.CHECKOUT)).toBe(BookStates.CHECKED_OUT);
            });

            test('can transition to AVAILABLE via CANCEL_RESERVATION event', () => {
                expect(canTransition(BookStates.RESERVED, BookEvents.CANCEL_RESERVATION)).toBe(true);
                expect(getNextState(BookStates.RESERVED, BookEvents.CANCEL_RESERVATION)).toBe(BookStates.AVAILABLE);
            });

            test('cannot transition via invalid events', () => {
                expect(canTransition(BookStates.RESERVED, BookEvents.RESERVE)).toBe(false);
                expect(canTransition(BookStates.RESERVED, BookEvents.RETURN)).toBe(false);
            });
        });

        describe('From CHECKED_OUT state', () => {
            test('can transition to AVAILABLE via RETURN event', () => {
                expect(canTransition(BookStates.CHECKED_OUT, BookEvents.RETURN)).toBe(true);
                expect(getNextState(BookStates.CHECKED_OUT, BookEvents.RETURN)).toBe(BookStates.AVAILABLE);
            });

            test('can transition to OVERDUE via MARK_OVERDUE event', () => {
                expect(canTransition(BookStates.CHECKED_OUT, BookEvents.MARK_OVERDUE)).toBe(true);
                expect(getNextState(BookStates.CHECKED_OUT, BookEvents.MARK_OVERDUE)).toBe(BookStates.OVERDUE);
            });

            test('can transition to LOST via MARK_LOST event', () => {
                expect(canTransition(BookStates.CHECKED_OUT, BookEvents.MARK_LOST)).toBe(true);
                expect(getNextState(BookStates.CHECKED_OUT, BookEvents.MARK_LOST)).toBe(BookStates.LOST);
            });
        });

        describe('From OVERDUE state', () => {
            test('can transition to AVAILABLE via RETURN event', () => {
                expect(canTransition(BookStates.OVERDUE, BookEvents.RETURN)).toBe(true);
                expect(getNextState(BookStates.OVERDUE, BookEvents.RETURN)).toBe(BookStates.AVAILABLE);
            });

            test('can transition to LOST via MARK_LOST event', () => {
                expect(canTransition(BookStates.OVERDUE, BookEvents.MARK_LOST)).toBe(true);
                expect(getNextState(BookStates.OVERDUE, BookEvents.MARK_LOST)).toBe(BookStates.LOST);
            });
        });

        describe('From LOST state', () => {
            test('can transition to AVAILABLE via RESTORE event', () => {
                expect(canTransition(BookStates.LOST, BookEvents.RESTORE)).toBe(true);
                expect(getNextState(BookStates.LOST, BookEvents.RESTORE)).toBe(BookStates.AVAILABLE);
            });
        });

        describe('From DAMAGED state', () => {
            test('can transition to AVAILABLE via RESTORE event', () => {
                expect(canTransition(BookStates.DAMAGED, BookEvents.RESTORE)).toBe(true);
                expect(getNextState(BookStates.DAMAGED, BookEvents.RESTORE)).toBe(BookStates.AVAILABLE);
            });
        });

        test('getNextState should throw error for invalid transition', () => {
            expect(() => getNextState(BookStates.AVAILABLE, BookEvents.RETURN)).toThrow();
            expect(() => getNextState(BookStates.RESERVED, BookEvents.RESERVE)).toThrow();
        });
    });

    describe('getAvailableEvents', () => {
        test('should return correct events for AVAILABLE state', () => {
            const events = getAvailableEvents(BookStates.AVAILABLE);
            expect(events).toContain(BookEvents.RESERVE);
            expect(events).toContain(BookEvents.CHECKOUT);
            expect(events).toContain(BookEvents.MARK_DAMAGED);
        });

        test('should return correct events for RESERVED state', () => {
            const events = getAvailableEvents(BookStates.RESERVED);
            expect(events).toContain(BookEvents.CHECKOUT);
            expect(events).toContain(BookEvents.CANCEL_RESERVATION);
        });

        test('should return empty array for invalid state', () => {
            expect(getAvailableEvents('invalid_state')).toEqual([]);
        });
    });

    describe('BookStateMachine Class', () => {
        test('should initialize with default AVAILABLE state', () => {
            const sm = new BookStateMachine();
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });

        test('should initialize with specified valid initial state', () => {
            const sm = new BookStateMachine(BookStates.DAMAGED);
            expect(sm.getState()).toBe(BookStates.DAMAGED);
        });

        test('should throw error for invalid initial state', () => {
            expect(() => new BookStateMachine(BookStates.RESERVED)).toThrow();
        });

        test('should perform valid state transitions', () => {
            const sm = new BookStateMachine();
            
            sm.performEvent(BookEvents.RESERVE);
            expect(sm.getState()).toBe(BookStates.RESERVED);
            
            sm.performEvent(BookEvents.CHECKOUT);
            expect(sm.getState()).toBe(BookStates.CHECKED_OUT);
            
            sm.performEvent(BookEvents.RETURN);
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });

        test('should throw error for invalid transition', () => {
            const sm = new BookStateMachine();
            expect(() => sm.performEvent(BookEvents.RETURN)).toThrow();
        });

        test('canPerformEvent should return correct value', () => {
            const sm = new BookStateMachine();
            expect(sm.canPerformEvent(BookEvents.RESERVE)).toBe(true);
            expect(sm.canPerformEvent(BookEvents.RETURN)).toBe(false);
        });

        test('should track state history', () => {
            const sm = new BookStateMachine();
            let history = sm.getHistory();
            expect(history.length).toBe(1);
            expect(history[0].state).toBe(BookStates.AVAILABLE);
            
            sm.performEvent(BookEvents.RESERVE);
            history = sm.getHistory();
            expect(history.length).toBe(2);
            expect(history[1].state).toBe(BookStates.RESERVED);
            expect(history[1].previousState).toBe(BookStates.AVAILABLE);
            expect(history[1].event).toBe(BookEvents.RESERVE);
            
            sm.performEvent(BookEvents.CHECKOUT);
            history = sm.getHistory();
            expect(history.length).toBe(3);
            expect(history[2].state).toBe(BookStates.CHECKED_OUT);
        });

        test('getAvailableEvents should return correct events for current state', () => {
            const sm = new BookStateMachine();
            let events = sm.getAvailableEvents();
            expect(events).toContain(BookEvents.RESERVE);
            expect(events).toContain(BookEvents.CHECKOUT);
            
            sm.performEvent(BookEvents.RESERVE);
            events = sm.getAvailableEvents();
            expect(events).toContain(BookEvents.CHECKOUT);
            expect(events).toContain(BookEvents.CANCEL_RESERVATION);
        });
    });

    describe('Complete Lifecycle Scenarios', () => {
        test('Complete checkout and return lifecycle', () => {
            const sm = new BookStateMachine();
            
            sm.performEvent(BookEvents.CHECKOUT);
            expect(sm.getState()).toBe(BookStates.CHECKED_OUT);
            
            sm.performEvent(BookEvents.RETURN);
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });

        test('Complete reservation, checkout, and return lifecycle', () => {
            const sm = new BookStateMachine();
            
            sm.performEvent(BookEvents.RESERVE);
            expect(sm.getState()).toBe(BookStates.RESERVED);
            
            sm.performEvent(BookEvents.CHECKOUT);
            expect(sm.getState()).toBe(BookStates.CHECKED_OUT);
            
            sm.performEvent(BookEvents.RETURN);
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });

        test('Reservation cancellation', () => {
            const sm = new BookStateMachine();
            
            sm.performEvent(BookEvents.RESERVE);
            expect(sm.getState()).toBe(BookStates.RESERVED);
            
            sm.performEvent(BookEvents.CANCEL_RESERVATION);
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });

        test('Overdue book return', () => {
            const sm = new BookStateMachine();
            
            sm.performEvent(BookEvents.CHECKOUT);
            expect(sm.getState()).toBe(BookStates.CHECKED_OUT);
            
            sm.performEvent(BookEvents.MARK_OVERDUE);
            expect(sm.getState()).toBe(BookStates.OVERDUE);
            
            sm.performEvent(BookEvents.RETURN);
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });

        test('Lost book restoration', () => {
            const sm = new BookStateMachine();
            
            sm.performEvent(BookEvents.CHECKOUT);
            expect(sm.getState()).toBe(BookStates.CHECKED_OUT);
            
            sm.performEvent(BookEvents.MARK_LOST);
            expect(sm.getState()).toBe(BookStates.LOST);
            
            sm.performEvent(BookEvents.RESTORE);
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });

        test('Damaged book restoration', () => {
            const sm = new BookStateMachine();
            
            sm.performEvent(BookEvents.MARK_DAMAGED);
            expect(sm.getState()).toBe(BookStates.DAMAGED);
            
            sm.performEvent(BookEvents.RESTORE);
            expect(sm.getState()).toBe(BookStates.AVAILABLE);
        });
    });
});
