// =============================================================================
// Scroll Event Manager (Pub/Sub Pattern)
// =============================================================================
// Centralizes scroll event handling to avoid duplicate listeners.
// Single listener per source (window, container), modules subscribe/unsubscribe.
//
// For DateRangePicker:
// - 'window' scroll: Close floating calendar when user scrolls the page
// - 'container' scroll: Handle scroll inside a scrollable parent container

export type ScrollSource = 'window' | 'container'
export type ScrollHandler = () => void

export interface ScrollSubscription {
	unsubscribe: () => void
}

export interface ScrollEventManager {
	/**
	 * Subscribe to scroll events from a specific source
	 * @param source - 'window' for page scroll, 'container' for scrollable parent
	 * @param handler - Callback function to invoke on scroll
	 * @returns Subscription object with unsubscribe method
	 */
	subscribe(source: ScrollSource, handler: ScrollHandler): ScrollSubscription

	/**
	 * Initialize scroll listeners
	 * @param container - Optional scrollable parent container element
	 */
	init(container?: HTMLElement): void

	/**
	 * Detach the window-level listener while the host is out of the DOM
	 * (subscriptions and the container listener are kept). Undo with resume().
	 */
	suspend(): void

	/**
	 * Re-attach the window-level listener after suspend().
	 */
	resume(): void

	/**
	 * Remove all listeners and subscriptions
	 */
	destroy(): void
}

/**
 * Create a scroll event manager for a DateRangePicker instance
 */
export function createScrollEventManager(): ScrollEventManager {
	const windowHandlers = new Set<ScrollHandler>()
	const containerHandlers = new Set<ScrollHandler>()

	let containerElement: HTMLElement | null = null
	let windowListenerAttached = false
	let containerListenerAttached = false
	let windowSuspended = false

	// Single window scroll handler - dispatches to all subscribers
	const handleWindowScroll = () => {
		windowHandlers.forEach(handler => handler())
	}

	// Single container scroll handler - dispatches to all subscribers
	const handleContainerScroll = () => {
		containerHandlers.forEach(handler => handler())
	}

	return {
		subscribe(source: ScrollSource, handler: ScrollHandler): ScrollSubscription {
			const handlers = source === 'window' ? windowHandlers : containerHandlers
			handlers.add(handler)

			return {
				unsubscribe: () => {
					handlers.delete(handler)
				}
			}
		},

		init(container?: HTMLElement) {
			// Window scroll listener (capture phase to catch all scroll events)
			if (!windowListenerAttached) {
				window.addEventListener('scroll', handleWindowScroll, { capture: true, passive: true })
				windowListenerAttached = true
			}

			// Container scroll listener (if provided)
			if (container && !containerListenerAttached) {
				containerElement = container
				container.addEventListener('scroll', handleContainerScroll, { passive: true })
				containerListenerAttached = true
			}
		},

		suspend() {
			if (windowListenerAttached) {
				window.removeEventListener('scroll', handleWindowScroll, true)
				windowListenerAttached = false
				windowSuspended = true
			}
		},

		resume() {
			if (windowSuspended && !windowListenerAttached) {
				window.addEventListener('scroll', handleWindowScroll, { capture: true, passive: true })
				windowListenerAttached = true
			}
			windowSuspended = false
		},

		destroy() {
			windowSuspended = false
			if (windowListenerAttached) {
				window.removeEventListener('scroll', handleWindowScroll, true)
				windowListenerAttached = false
			}

			if (containerElement && containerListenerAttached) {
				containerElement.removeEventListener('scroll', handleContainerScroll)
				containerListenerAttached = false
			}

			containerElement = null
			windowHandlers.clear()
			containerHandlers.clear()
		}
	}
}
