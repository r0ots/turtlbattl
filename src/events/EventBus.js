export class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    // Subscribe to an event
    on(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        this.listeners.get(eventType).push(listener);
        
        // Return unsubscribe function
        return () => this.off(eventType, listener);
    }
    
    // Subscribe to an event once (automatically unsubscribes after first call)
    once(eventType, listener) {
        const onceListener = (data) => {
            listener(data);
            this.off(eventType, onceListener);
        };
        
        return this.on(eventType, onceListener);
    }
    
    // Unsubscribe from an event
    off(eventType, listener) {
        if (!this.listeners.has(eventType)) return;
        
        const eventListeners = this.listeners.get(eventType);
        const index = eventListeners.indexOf(listener);
        
        if (index > -1) {
            eventListeners.splice(index, 1);
        }
        
        // Clean up empty event arrays
        if (eventListeners.length === 0) {
            this.listeners.delete(eventType);
        }
    }
    
    // Emit an event
    emit(eventType, data = null) {
        if (!this.listeners.has(eventType)) return;
        
        const eventListeners = this.listeners.get(eventType);
        
        // Call all listeners with the data
        eventListeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventType}:`, error);
            }
        });
    }
    
    // Remove all listeners for a specific event type
    removeAllListeners(eventType) {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            // Remove all listeners if no event type specified
            this.listeners.clear();
        }
    }
    
    // Get count of listeners for an event type
    listenerCount(eventType) {
        return this.listeners.has(eventType) ? this.listeners.get(eventType).length : 0;
    }
    
    // Get all registered event types
    getEventTypes() {
        return Array.from(this.listeners.keys());
    }
    
    // Destroy the event bus
    destroy() {
        this.listeners.clear();
    }
}