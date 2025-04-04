"use client";

import { useState, useEffect } from "react";
import { TouchPosition } from "@/types/game";

interface UseTouchControlsProps {
  minDragDistance: number;
  onDirectionChange: (direction: "up" | "down" | "left" | "right") => void;
  onGameAction: () => void;
}

export const useTouchControls = ({
  minDragDistance,
  onDirectionChange,
  onGameAction,
}: UseTouchControlsProps) => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<TouchPosition | null>(
    null
  );
  const [currentTouchPos, setCurrentTouchPos] = useState<TouchPosition | null>(
    null
  );
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  // Detect if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase()
        );
      setIsMobileDevice(isMobile);
    };

    checkMobile();

    // Also check on resize in case of orientation changes
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Handle touch start event
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      // Store the starting position of the touch
      const touch = e.touches[0];
      setActiveTouchId(touch.identifier);
      setTouchStartPos({
        x: touch.clientX,
        y: touch.clientY,
      });
      setCurrentTouchPos({
        x: touch.clientX,
        y: touch.clientY,
      });
      setTouchStartTime(Date.now());
      setHasMoved(false);
    }
  };

  // Handle touch move event
  const handleTouchMove = (e: TouchEvent) => {
    // Prevent scrolling when dragging
    e.preventDefault();

    // Find the active touch
    if (activeTouchId !== null) {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === activeTouchId) {
          // Update current touch position
          setCurrentTouchPos({
            x: touch.clientX,
            y: touch.clientY,
          });

          // Check if we've moved beyond the minimum drag distance
          if (touchStartPos) {
            const deltaX = Math.abs(touch.clientX - touchStartPos.x);
            const deltaY = Math.abs(touch.clientY - touchStartPos.y);
            if (deltaX > 5 || deltaY > 5) {
              // Small threshold to detect movement
              setHasMoved(true);
            }
          }

          // Process movement based on drag direction
          processTouchMovement();
          break;
        }
      }
    }
  };

  // Handle touch end event
  const handleTouchEnd = (e: TouchEvent) => {
    // Check if the active touch has ended
    let activeEnded = true;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeTouchId) {
        activeEnded = false;
        break;
      }
    }

    if (activeEnded) {
      // Check if this was a quick tap (not a hold or drag)
      const isQuickTap =
        touchStartTime && !hasMoved && Date.now() - touchStartTime < 300; // 300ms threshold for quick tap

      if (isQuickTap) {
        onGameAction();
      }

      setActiveTouchId(null);
      setTouchStartPos(null);
      setCurrentTouchPos(null);
      setTouchStartTime(null);
      setHasMoved(false);
    }
  };

  // Process touch movement based on drag direction
  const processTouchMovement = () => {
    if (!touchStartPos || !currentTouchPos) return;

    const deltaX = currentTouchPos.x - touchStartPos.x;
    const deltaY = currentTouchPos.y - touchStartPos.y;

    // Only process if the drag distance is significant
    if (
      Math.abs(deltaX) < minDragDistance &&
      Math.abs(deltaY) < minDragDistance
    ) {
      return;
    }

    // Determine the direction of the drag
    let direction: "up" | "down" | "left" | "right";

    // Check if the drag was more horizontal or vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal drag
      direction = deltaX > 0 ? "right" : "left";
    } else {
      // Vertical drag
      direction = deltaY > 0 ? "down" : "up";
    }

    // Call the direction change callback
    onDirectionChange(direction);

    // Update touch start position to current position for continuous tracking
    setTouchStartPos(currentTouchPos);
  };

  // Set up touch event listeners
  const setupTouchListeners = (element: HTMLElement) => {
    if (!element) return;

    // Add touch event listeners
    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      // Remove touch event listeners
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  };

  return {
    isMobileDevice,
    touchStartPos,
    currentTouchPos,
    activeTouchId,
    setupTouchListeners,
  };
};
