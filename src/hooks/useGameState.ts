"use client";

import { useState, useEffect, useRef } from "react";
import { GameState, VisualEffect, GridPosition } from "@/types/game";

interface UseGameStateProps {
  dotsRemaining: number;
  pacmanLives: number;
  score: number;
  highScore: number;
}

export const useGameState = ({
  dotsRemaining,
  pacmanLives,
  score,
  highScore,
}: UseGameStateProps) => {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [level, setLevel] = useState(1);
  const [powerMode, setPowerMode] = useState(false);
  const [powerModeTimer, setPowerModeTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);

  const ghostModeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Add a visual effect
  const addVisualEffect = (
    type: "score" | "ghost" | "powerPellet" | "death",
    position: GridPosition,
    value?: number
  ) => {
    const newEffect: VisualEffect = {
      type,
      position,
      value,
      duration: 1000, // 1 second duration
      startTime: Date.now(),
    };

    setVisualEffects((prev) => [...prev, newEffect]);

    // Remove the effect after its duration
    setTimeout(() => {
      setVisualEffects((prev) => prev.filter((effect) => effect !== newEffect));
    }, newEffect.duration);
  };

  // Check if level is complete (all dots eaten)
  useEffect(() => {
    if (dotsRemaining === 0 && gameState === "playing") {
      // Level complete
      setGameState("win");
    }
  }, [dotsRemaining, gameState]);

  // Check for game over
  useEffect(() => {
    if (pacmanLives <= 0 && gameState !== "game-over") {
      setGameState("game-over");

      // Update high score if needed
      if (score > highScore) {
        localStorage.setItem("pacmanHighScore", score.toString());
      }
    }
  }, [pacmanLives, gameState, score, highScore]);

  // Clean up timers on unmount
  useEffect(() => {
    const currentAnimationFrame = animationFrameRef.current;

    return () => {
      if (ghostModeTimerRef.current) {
        clearInterval(ghostModeTimerRef.current);
      }
      if (powerModeTimer) {
        clearTimeout(powerModeTimer);
      }
      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame);
      }
    };
  }, [powerModeTimer]);

  // Start ghost mode cycling
  const startGhostModeCycling = (toggleGhostMode: () => void) => {
    if (!ghostModeTimerRef.current) {
      ghostModeTimerRef.current = setInterval(() => {
        toggleGhostMode();
      }, 20000); // Switch every 20 seconds
    }
  };

  // Reset game state for next level
  const nextLevel = () => {
    setLevel((prev) => prev + 1);
    setGameState("ready");
    setPowerMode(false);
    setVisualEffects([]);

    if (powerModeTimer) {
      clearTimeout(powerModeTimer);
      setPowerModeTimer(null);
    }
  };

  // Reset game state completely
  const resetGame = () => {
    setLevel(1);
    setGameState("ready");
    setPowerMode(false);
    setVisualEffects([]);

    if (powerModeTimer) {
      clearTimeout(powerModeTimer);
      setPowerModeTimer(null);
    }

    if (ghostModeTimerRef.current) {
      clearInterval(ghostModeTimerRef.current);
      ghostModeTimerRef.current = null;
    }
  };

  return {
    gameState,
    setGameState,
    level,
    setLevel,
    powerMode,
    setPowerMode,
    powerModeTimer,
    setPowerModeTimer,
    visualEffects,
    setVisualEffects,
    ghostModeTimerRef,
    lastTimeRef,
    animationFrameRef,
    addVisualEffect,
    startGhostModeCycling,
    nextLevel,
    resetGame,
  };
};
