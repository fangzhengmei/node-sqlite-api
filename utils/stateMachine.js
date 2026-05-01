export const BookStates = {
    AVAILABLE: 'available',
    RESERVED: 'reserved',
    CHECKED_OUT: 'checked_out',
    OVERDUE: 'overdue',
    LOST: 'lost',
    DAMAGED: 'damaged'
};

export const BookEvents = {
    RESERVE: 'reserve',
    CHECKOUT: 'checkout',
    RETURN: 'return',
    CANCEL_RESERVATION: 'cancel_reservation',
    MARK_OVERDUE: 'mark_overdue',
    MARK_LOST: 'mark_lost',
    MARK_DAMAGED: 'mark_damaged',
    RESTORE: 'restore'
};

const stateTransitions = {
    [BookStates.AVAILABLE]: {
        [BookEvents.RESERVE]: BookStates.RESERVED,
        [BookEvents.CHECKOUT]: BookStates.CHECKED_OUT,
        [BookEvents.MARK_DAMAGED]: BookStates.DAMAGED
    },
    [BookStates.RESERVED]: {
        [BookEvents.CHECKOUT]: BookStates.CHECKED_OUT,
        [BookEvents.CANCEL_RESERVATION]: BookStates.AVAILABLE
    },
    [BookStates.CHECKED_OUT]: {
        [BookEvents.RETURN]: BookStates.AVAILABLE,
        [BookEvents.MARK_OVERDUE]: BookStates.OVERDUE,
        [BookEvents.MARK_LOST]: BookStates.LOST
    },
    [BookStates.OVERDUE]: {
        [BookEvents.RETURN]: BookStates.AVAILABLE,
        [BookEvents.MARK_LOST]: BookStates.LOST
    },
    [BookStates.LOST]: {
        [BookEvents.RESTORE]: BookStates.AVAILABLE
    },
    [BookStates.DAMAGED]: {
        [BookEvents.RESTORE]: BookStates.AVAILABLE
    }
};

const validInitialStates = [
    BookStates.AVAILABLE,
    BookStates.DAMAGED,
    BookStates.LOST
];

export function canTransition(currentState, event) {
    if (!stateTransitions[currentState]) {
        return false;
    }
    return stateTransitions[currentState][event] !== undefined;
}

export function getNextState(currentState, event) {
    if (!canTransition(currentState, event)) {
        throw new Error(`Invalid transition: cannot ${event} from ${currentState}`);
    }
    return stateTransitions[currentState][event];
}

export function isValidState(state) {
    return Object.values(BookStates).includes(state);
}

export function isValidEvent(event) {
    return Object.values(BookEvents).includes(event);
}

export function isValidInitialState(state) {
    return validInitialStates.includes(state);
}

export function getAvailableEvents(currentState) {
    if (!stateTransitions[currentState]) {
        return [];
    }
    return Object.keys(stateTransitions[currentState]);
}

export function getStateDescription(state) {
    const descriptions = {
        [BookStates.AVAILABLE]: 'Book is available for checkout or reservation',
        [BookStates.RESERVED]: 'Book is reserved by a user, waiting for checkout',
        [BookStates.CHECKED_OUT]: 'Book is checked out by a user',
        [BookStates.OVERDUE]: 'Book is overdue (checked out past due date)',
        [BookStates.LOST]: 'Book is reported as lost',
        [BookStates.DAMAGED]: 'Book is damaged and not available for checkout'
    };
    return descriptions[state] || 'Unknown state';
}

export function getEventDescription(event) {
    const descriptions = {
        [BookEvents.RESERVE]: 'Reserve the book for a user',
        [BookEvents.CHECKOUT]: 'Check out the book to a user',
        [BookEvents.RETURN]: 'Return the book to the library',
        [BookEvents.CANCEL_RESERVATION]: 'Cancel an existing reservation',
        [BookEvents.MARK_OVERDUE]: 'Mark the book as overdue',
        [BookEvents.MARK_LOST]: 'Mark the book as lost',
        [BookEvents.MARK_DAMAGED]: 'Mark the book as damaged',
        [BookEvents.RESTORE]: 'Restore the book to available state (from lost/damaged)'
    };
    return descriptions[event] || 'Unknown event';
}

export class BookStateMachine {
    constructor(initialState = BookStates.AVAILABLE) {
        if (!isValidInitialState(initialState)) {
            throw new Error(`Invalid initial state: ${initialState}`);
        }
        this.currentState = initialState;
        this.history = [{
            state: initialState,
            event: null,
            timestamp: new Date().toISOString()
        }];
    }

    getState() {
        return this.currentState;
    }

    canPerformEvent(event) {
        return canTransition(this.currentState, event);
    }

    performEvent(event) {
        if (!this.canPerformEvent(event)) {
            throw new Error(`Cannot perform event '${event}' from state '${this.currentState}'`);
        }

        const previousState = this.currentState;
        this.currentState = getNextState(this.currentState, event);
        
        this.history.push({
            state: this.currentState,
            event: event,
            previousState: previousState,
            timestamp: new Date().toISOString()
        });

        return this.currentState;
    }

    getHistory() {
        return [...this.history];
    }

    getAvailableEvents() {
        return getAvailableEvents(this.currentState);
    }
}
