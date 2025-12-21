class EventBus {
    constructor() {
        this.storageKey = 'time_tracker_events';
        this.listeners = {};
        this.lastEventId = 0;
        
        // Listen for storage changes from other tabs/windows
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        console.log('✅ EventBus initialized');
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Event name (e.g., 'timer:started', 'project:created')
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        
        this.listeners[eventName].push(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
        };
    }

    /**
     * Emit an event (broadcasts to all tabs/windows)
     * @param {string} eventName - Event name
     * @param {object} data - Event data
     */
    emit(eventName, data = {}) {
        const event = {
            id: ++this.lastEventId,
            name: eventName,
            data: data,
            timestamp: Date.now(),
            source: 'current_tab'
        };

        // Trigger local listeners immediately
        this.triggerListeners(eventName, event);

        // Broadcast to other tabs via localStorage
        this.broadcastToOtherTabs(event);

        console.log('📤 Event emitted:', eventName, data);
    }

    /**
     * Handle storage change from other tabs
     */
    handleStorageChange(e) {
        if (e.key !== this.storageKey) return;
        if (!e.newValue) return;

        try {
            const event = JSON.parse(e.newValue);
            
            // Ignore events from current tab
            if (event.source === 'current_tab') return;

            console.log('📥 Event received from other tab:', event.name, event.data);
            
            this.triggerListeners(event.name, event);
        } catch (error) {
            console.error('EventBus: Parse error', error);
        }
    }

    /**
     * Trigger all listeners for an event
     */
    triggerListeners(eventName, event) {
        const listeners = this.listeners[eventName] || [];
        listeners.forEach(callback => {
            try {
                callback(event.data, event);
            } catch (error) {
                console.error(`EventBus: Error in listener for ${eventName}:`, error);
            }
        });

        // Also trigger wildcard listeners
        const wildcardListeners = this.listeners['*'] || [];
        wildcardListeners.forEach(callback => {
            try {
                callback(event.data, event);
            } catch (error) {
                console.error('EventBus: Error in wildcard listener:', error);
            }
        });
    }

    /**
     * Broadcast event to other tabs via localStorage
     */
    broadcastToOtherTabs(event) {
        try {
            // Mark as external for other tabs
            const externalEvent = { ...event, source: 'other_tab' };
            localStorage.setItem(this.storageKey, JSON.stringify(externalEvent));
            
            // Clean up immediately (we only need the change event)
            setTimeout(() => {
                localStorage.removeItem(this.storageKey);
            }, 100);
        } catch (error) {
            console.error('EventBus: Broadcast error', error);
        }
    }

    /**
     * Remove all listeners for an event
     */
    off(eventName) {
        delete this.listeners[eventName];
    }

    /**
     * Clear all listeners
     */
    clear() {
        this.listeners = {};
    }
}

// ========== GLOBAL INSTANCE ==========
const eventBus = new EventBus();

// ========== PREDEFINED EVENT TYPES ==========
const Events = {
    // Timer events
    TIMER_STARTED: 'timer:started',
    TIMER_STOPPED: 'timer:stopped',
    TIMER_UPDATED: 'timer:updated',
    
    // Project events
    PROJECT_CREATED: 'project:created',
    PROJECT_UPDATED: 'project:updated',
    PROJECT_DELETED: 'project:deleted',
    
    // Task events
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated',
    TASK_DELETED: 'task:deleted',
    
    // Time entry events
    ENTRY_CREATED: 'entry:created',
    ENTRY_UPDATED: 'entry:updated',
    ENTRY_DELETED: 'entry:deleted',
    ENTRY_BULK_DELETED: 'entry:bulk_deleted',
    
    // Data refresh
    DATA_REFRESH: 'data:refresh',
    STATISTICS_REFRESH: 'statistics:refresh'
};

// Export to global scope
window.eventBus = eventBus;
window.Events = Events;

// ========== HELPER FUNCTIONS ==========

/**
 * Auto-refresh helper for pages
 * Usage: autoRefreshOn(['timer:started', 'entry:deleted'], () => loadData())
 */
window.autoRefreshOn = function(eventNames, refreshCallback) {
    const unsubscribers = [];
    
    eventNames.forEach(eventName => {
        const unsubscribe = eventBus.on(eventName, () => {
            console.log(`🔄 Auto-refresh triggered by: ${eventName}`);
            refreshCallback();
        });
        unsubscribers.push(unsubscribe);
    });
    
    // Return cleanup function
    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
};

/**
 * Debounced refresh helper
 */
window.debouncedRefreshOn = function(eventNames, refreshCallback, delay = 1000) {
    let timeout;
    
    const debouncedCallback = () => {
        clearTimeout(timeout);
        timeout = setTimeout(refreshCallback, delay);
    };
    
    return window.autoRefreshOn(eventNames, debouncedCallback);
};

// ========== DEBUG MODE ==========
if (localStorage.getItem('eventbus_debug') === 'true') {
    eventBus.on('*', (data, event) => {
        console.log('🔔 EventBus Debug:', event.name, data);
    });
}

console.log(`
🎯 EventBus Quick Reference:

Emit events:
  eventBus.emit(Events.TIMER_STARTED, { taskId: 123 })
  eventBus.emit(Events.PROJECT_CREATED, { projectId: 456 })

Listen to events:
  eventBus.on(Events.TIMER_STARTED, (data) => {
      console.log('Timer started:', data.taskId)
  })

Auto-refresh on events:
  autoRefreshOn([Events.TIMER_STARTED, Events.ENTRY_DELETED], loadData)

Enable debug mode:
  localStorage.setItem('eventbus_debug', 'true')
`);