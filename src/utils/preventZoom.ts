/**
 * Global mobile zoom prevention utility for Skyline Brawl.
 *
 * Prevents:
 * 1. iOS Safari gesture zoom (gesturestart / gesturechange / gestureend)
 * 2. Multi-touch pinch zoom (touchmove with 2+ touches)
 * 3. Double-tap to zoom on mobile browsers
 * 4. Ctrl/Cmd + wheel zoom on trackpads and touch devices
 * 5. Ctrl/Cmd + +/-/0 keyboard zoom shortcuts
 */

export function setupMobileZoomPrevention(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // 1. Prevent Safari gesture zooming (gesturestart, gesturechange, gestureend)
  const preventGesture = (e: Event) => {
    e.preventDefault();
  };

  // 2. Prevent multi-touch touchmove (pinch to zoom)
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  };

  // 3. Prevent rapid double-tap to zoom while preserving intentional button clicks
  let lastTouchEnd = 0;
  const handleTouchEnd = (e: TouchEvent) => {
    const now = performance.now();
    if (now - lastTouchEnd <= 300) {
      const target = e.target as HTMLElement | null;
      const isInput =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (!isInput) {
        e.preventDefault();
        // If clicking a real button or link, trigger click so button behavior remains responsive
        const clickable = target?.closest('button, a, [role="button"]') as HTMLElement | null;
        if (clickable) {
          clickable.click();
        }
      }
    }
    lastTouchEnd = now;
  };

  // 4. Prevent Ctrl/Cmd + wheel zoom (pinch on trackpads or Ctrl+Scroll)
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  };

  // 5. Prevent keyboard zoom shortcuts (Ctrl/Cmd + '+', '-', '=', '0')
  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.key === '_')
    ) {
      e.preventDefault();
    }
  };

  // Reset any accidental scroll offset on orientation change or resize
  const handleViewportShift = () => {
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  };

  // Register gesture events safely for WebKit
  const docAny = document as unknown as {
    addEventListener: (type: string, listener: (e: Event) => void, options?: boolean | AddEventListenerOptions) => void;
    removeEventListener: (type: string, listener: (e: Event) => void) => void;
  };

  docAny.addEventListener('gesturestart', preventGesture, { passive: false });
  docAny.addEventListener('gesturechange', preventGesture, { passive: false });
  docAny.addEventListener('gestureend', preventGesture, { passive: false });

  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleViewportShift);
  window.addEventListener('orientationchange', handleViewportShift);

  return () => {
    docAny.removeEventListener('gesturestart', preventGesture);
    docAny.removeEventListener('gesturechange', preventGesture);
    docAny.removeEventListener('gestureend', preventGesture);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('wheel', handleWheel);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleViewportShift);
    window.removeEventListener('orientationchange', handleViewportShift);
  };
}
