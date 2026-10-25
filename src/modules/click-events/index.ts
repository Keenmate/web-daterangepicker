// =============================================================================
// Click Event Manager (Pub/Sub Pattern)
// =============================================================================
// Centralizes click event handling for inside/outside calendar detection.
// Single listener per scope (calendar, document), modules subscribe/unsubscribe.
//
// For DateRangePicker:
// - 'outsideClick': Click outside calendar and input - close floating calendar
// - 'calendarClick': Click inside calendar element (for active state tracking)

export type ClickEventName =
	| 'outsideClick'    // Document click outside the calendar and input
	| 'calendarClick'   // Click inside the calendar element

export interface ClickContext {
	target: HTMLElement
	event: MouseEvent
	/** The original event path from composedPath() */
	path: EventTarget[]
}

export type ClickHandler = (ctx: ClickContext) => boolean | void
// Return true to stop other handlers from running (like stopPropagation)

export interface ClickSubscription {
	unsubscribe: () => void
}

export interface ClickEventManager {
	/**
	 * Subscribe to click events of a specific type
	 * @param type - The type of click event to subscribe to
	 * @param handler - Callback function, return true to stop other handlers
	 * @returns Subscription object with unsubscribe method
	 */
	subscribe(type: ClickEventName, handler: ClickHandler): ClickSubscription

	/**
	 * Initialize click listeners
	 * @param calendar - The calendar element
	 * @param input - The input element (optional, for floating mode)
	 * @param calendarButton - Optional trigger button element
	 */
	init(calendar: HTMLElement, input?: HTMLElement | null, calendarButton?: HTMLElement | null): void

	/**
	 * Update the input/button references (if they change after init)
	 */
	updateReferences(input?: HTMLElement | null, calendarButton?: HTMLElement | null): void

	/**
	 * Detach the document-level listener while the host is out of the DOM
	 * (subscriptions and calendar listeners are kept). Undo with resume().
	 */
	suspend(): void

	/**
	 * Re-attach the document-level listener after suspend().
	 */
	resume(): void

	/**
	 * Remove all listeners and subscriptions
	 */
	destroy(): void
}

/**
 * Create a click event manager for a DateRangePicker instance
 */
export function createClickEventManager(): ClickEventManager {
	const handlers: Record<ClickEventName, Set<ClickHandler>> = {
		outsideClick: new Set(),
		calendarClick: new Set()
	}

	let calendarElement: HTMLElement | null = null
	let inputElement: HTMLElement | null = null
	let buttonElement: HTMLElement | null = null
	let documentListenerAttached = false

	// Track if current click originated inside the calendar (set on mousedown, checked on click)
	// This handles cases where render() rebuilds DOM between mousedown and click
	let insideCalendarClickInProgress = false

	// Dispatch to handlers, stop if any returns true
	const dispatch = (type: ClickEventName, ctx: ClickContext): boolean => {
		for (const handler of handlers[type]) {
			if (handler(ctx) === true) {
				return true // Handler requested stop
			}
		}
		return false
	}

	// Calendar mousedown handler - detects clicks inside the calendar
	const handleCalendarMousedown = (e: Event) => {
		insideCalendarClickInProgress = true

		const mouseEvent = e as MouseEvent
		const path = mouseEvent.composedPath()
		const target = (path[0] || mouseEvent.target) as HTMLElement

		dispatch('calendarClick', {
			target,
			event: mouseEvent,
			path
		})
	}

	// Calendar mouseup handler - clears the flag if no click follows (e.g., after drag)
	const handleCalendarMouseup = () => {
		// Clear the flag after a very short delay to allow click event to fire first
		setTimeout(() => {
			if (insideCalendarClickInProgress) {
				insideCalendarClickInProgress = false
			}
		}, 10)
	}

	// Document click handler - detects clicks outside the calendar
	const handleDocumentClick = (e: Event) => {
		if (!calendarElement) return

		// If mousedown happened inside the calendar, this is not an outside click
		if (insideCalendarClickInProgress) {
			insideCalendarClickInProgress = false
			return
		}

		const mouseEvent = e as MouseEvent
		const path = mouseEvent.composedPath ? mouseEvent.composedPath() : []
		const target = (path[0] || mouseEvent.target) as HTMLElement

		// Check if click is inside the calendar
		const clickedCalendar = path.includes(calendarElement)

		// Check if click is on the input element
		const clickedInput = inputElement && path.includes(inputElement)

		// Check if click is on a calendar trigger button
		const clickedButton = buttonElement && path.includes(buttonElement)

		// Also check for data-calendar-button attribute (external trigger buttons)
		const isCalendarButton = target.closest?.('[data-calendar-button]')

		if (!clickedCalendar && !clickedInput && !clickedButton && !isCalendarButton) {
			dispatch('outsideClick', {
				target,
				event: mouseEvent,
				path
			})
		}
	}

	return {
		subscribe(type: ClickEventName, handler: ClickHandler): ClickSubscription {
			handlers[type].add(handler)

			return {
				unsubscribe: () => {
					handlers[type].delete(handler)
				}
			}
		},

		init(calendar: HTMLElement, input?: HTMLElement | null, calendarButton?: HTMLElement | null) {
			calendarElement = calendar
			inputElement = input || null
			buttonElement = calendarButton || null

			// Listen for mousedown/mouseup on calendar element
			calendar.addEventListener('mousedown', handleCalendarMousedown)
			calendar.addEventListener('mouseup', handleCalendarMouseup)

			// Listen for clicks on document (for outside detection)
			if (!documentListenerAttached) {
				document.addEventListener('click', handleDocumentClick, true)
				documentListenerAttached = true
			}
		},

		updateReferences(input?: HTMLElement | null, calendarButton?: HTMLElement | null) {
			inputElement = input || null
			buttonElement = calendarButton || null
		},

		suspend() {
			if (documentListenerAttached) {
				document.removeEventListener('click', handleDocumentClick, true)
				documentListenerAttached = false
			}
			insideCalendarClickInProgress = false
		},

		resume() {
			if (calendarElement && !documentListenerAttached) {
				document.addEventListener('click', handleDocumentClick, true)
				documentListenerAttached = true
			}
		},

		destroy() {
			if (calendarElement) {
				calendarElement.removeEventListener('mousedown', handleCalendarMousedown)
				calendarElement.removeEventListener('mouseup', handleCalendarMouseup)
			}

			if (documentListenerAttached) {
				document.removeEventListener('click', handleDocumentClick, true)
				documentListenerAttached = false
			}

			calendarElement = null
			inputElement = null
			buttonElement = null
			insideCalendarClickInProgress = false

			// Clear all handlers
			Object.values(handlers).forEach(set => set.clear())
		}
	}
}
