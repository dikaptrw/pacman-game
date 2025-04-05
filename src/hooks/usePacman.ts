"use client";

import { useState } from "react";
import {
  Direction,
  GameState,
  GridPosition,
  Pacman,
  GridGhost,
  TouchPosition,
  Cell,
} from "@/types/game";
import { getCell } from "@/utils/maze";
import { canMove } from "@/utils";

interface UsePacmanProps {
  maze: Cell[][];
  gameState: GameState;
  pacmanMoveTime: number;
  addVisualEffect: (
    type: "score" | "ghost" | "powerPellet" | "death",
    position: GridPosition,
    value?: number
  ) => void;
  setDotsRemaining: (callback: (prev: number) => number) => void;
  setScore: (callback: (prev: number) => number) => void;
  setPowerMode: (value: boolean) => void;
  setGhosts: (callback: (prev: GridGhost[]) => GridGhost[]) => void;
  setGhostsEaten: (value: number) => void;
  setMaze: (callback: (prev: Cell[][]) => Cell[][]) => void;
  ghostsEaten: number;
  level: number;
  powerModeTimer: NodeJS.Timeout | null;
  setPowerModeTimer: (timer: NodeJS.Timeout | null) => void;
  frightenedGhostMoveTime: number;
  ghostMoveTime: number;
  powerModeDuration: number;
  playSound: (soundName: string, forcePlay?: boolean) => void;
  stopSound: (soundName: string) => void;
  pacmanLives: number;
}

export const usePacman = ({
  maze,
  gameState,
  pacmanMoveTime,
  addVisualEffect,
  setDotsRemaining,
  setScore,
  setPowerMode,
  setGhosts,
  setGhostsEaten,
  setMaze,
  level,
  powerModeTimer,
  setPowerModeTimer,
  frightenedGhostMoveTime,
  ghostMoveTime,
  powerModeDuration,
  playSound,
  stopSound,
  pacmanLives = 3,
}: UsePacmanProps) => {
  const [pacman, setPacman] = useState<Pacman>({
    position: { row: 23, col: 13 }, // Starting position
    direction: "none",
    nextDirection: "none",
    mouthOpen: true,
    mouthAngle: 0.2,
    lives: pacmanLives,
    isMoving: false,
    moveProgress: 0,
  });

  // Move Pacman based on current direction
  const movePacman = (deltaTime: number) => {
    setPacman((prev) => {
      // If Pacman is not moving, try to start a move
      if (!prev.isMoving) {
        // First try to move in the next direction if it's set
        if (
          prev.nextDirection !== "none" &&
          canMove(prev.position, prev.nextDirection, maze)
        ) {
          return {
            ...prev,
            direction: prev.nextDirection,
            isMoving: true,
            moveProgress: 0,
          };
        }
        // Otherwise try to continue in the current direction
        else if (
          prev.direction !== "none" &&
          canMove(prev.position, prev.direction, maze)
        ) {
          return {
            ...prev,
            isMoving: true,
            moveProgress: 0,
          };
        }
        // If neither is possible, stay still
        return prev;
      }

      // If Pacman is already moving, update the progress
      const newProgress = prev.moveProgress + deltaTime / pacmanMoveTime;

      // If the move is complete
      if (newProgress >= 1) {
        // Calculate the new position
        let newRow = prev.position.row;
        let newCol = prev.position.col;

        switch (prev.direction) {
          case "up":
            newRow -= 1;
            break;
          case "down":
            newRow += 1;
            break;
          case "left":
            newCol -= 1;
            break;
          case "right":
            newCol += 1;
            break;
        }

        // Handle tunnel wrapping
        if (newCol < 0) newCol = maze[0].length - 1;
        if (newCol >= maze[0].length) newCol = 0;

        // Check for dot collision and update score
        const currentCell = getCell(maze, newCol, newRow);

        if (
          currentCell &&
          (currentCell.type === "dot" || currentCell.type === "powerPellet")
        ) {
          // Play sound
          playSound("munch");

          // Update score
          const pointValue = currentCell.type === "dot" ? 10 : 50;
          setScore((prev) => prev + pointValue);

          // Add visual effect
          addVisualEffect("score", { row: newRow, col: newCol }, pointValue);

          // Update dots remaining
          setDotsRemaining((prev) => prev - 1);

          // Update maze (remove the dot)
          setMaze((prev) => {
            const newMaze = [...prev];
            newMaze[newRow][newCol] = {
              ...newMaze[newRow][newCol],
              type: "empty",
            };
            return newMaze;
          });

          // Handle power pellet
          if (currentCell.type === "powerPellet") {
            // Play power pellet sound
            playSound("powerPellet");

            // Add visual effect
            addVisualEffect("powerPellet", { row: newRow, col: newCol });

            // Reset ghosts eaten counter for this power pellet
            setGhostsEaten(0);

            // Set ghosts to frightened mode
            setGhosts((prevGhosts) =>
              prevGhosts.map((ghost) => ({
                ...ghost,
                mode: "frightened",
                speed: frightenedGhostMoveTime,
              }))
            );

            // Clear existing power mode timer
            if (powerModeTimer) {
              clearTimeout(powerModeTimer);
            }

            // Set power mode
            setPowerMode(true);

            // Set timer to end power mode
            const timer = setTimeout(() => {
              setPowerMode(false);
              stopSound("powerPellet");

              // Restore ghosts to normal mode with level-appropriate speed
              const levelSpeedMultiplier = 1 - level * 0.05;
              setGhosts((prevGhosts) =>
                prevGhosts.map((ghost) => {
                  let baseSpeed = ghostMoveTime;
                  switch (ghost.type) {
                    case "blinky":
                      baseSpeed = ghostMoveTime;
                      break;
                    case "pinky":
                      baseSpeed = ghostMoveTime * 1.05;
                      break;
                    case "inky":
                      baseSpeed = ghostMoveTime * 1.1;
                      break;
                    case "clyde":
                      baseSpeed = ghostMoveTime * 1.15;
                      break;
                    case "sue":
                      baseSpeed = ghostMoveTime * 1.2;
                      break;
                  }

                  return {
                    ...ghost,
                    mode: "chase",
                    speed: baseSpeed * levelSpeedMultiplier,
                  };
                })
              );
            }, powerModeDuration);

            setPowerModeTimer(timer);
          }
        }

        // Move is complete, update position and reset progress
        return {
          ...prev,
          position: { row: newRow, col: newCol },
          isMoving: false,
          moveProgress: 0,
          mouthOpen: !prev.mouthOpen, // Animate mouth
        };
      }

      // Move is still in progress
      return {
        ...prev,
        moveProgress: newProgress,
      };
    });
  };

  // Set Pacman direction based on keyboard input
  const handleKeyDown = (e: KeyboardEvent) => {
    // Only process movement if game is playing
    if (gameState !== "playing") return;

    switch (e.key) {
      case "ArrowUp":
        setPacman((prev) => ({ ...prev, nextDirection: "up" }));
        break;
      case "ArrowDown":
        setPacman((prev) => ({ ...prev, nextDirection: "down" }));
        break;
      case "ArrowLeft":
        setPacman((prev) => ({ ...prev, nextDirection: "left" }));
        break;
      case "ArrowRight":
        setPacman((prev) => ({ ...prev, nextDirection: "right" }));
        break;
    }
  };

  // Process touch movement based on drag direction
  const processTouchMovement = (
    touchStartPos: TouchPosition,
    currentTouchPos: TouchPosition,
    minDragDistance: number
  ) => {
    if (gameState !== "playing") return;

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
    let direction: Direction = "none";

    // Check if the drag was more horizontal or vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal drag
      direction = deltaX > 0 ? "right" : "left";
    } else {
      // Vertical drag
      direction = deltaY > 0 ? "down" : "up";
    }

    // Only set next direction if Pacman isn't currently moving
    // or if we're setting a direction opposite to the current one
    if (
      !pacman.isMoving ||
      (direction === "up" && pacman.direction === "down") ||
      (direction === "down" && pacman.direction === "up") ||
      (direction === "left" && pacman.direction === "right") ||
      (direction === "right" && pacman.direction === "left")
    ) {
      setPacman((prev) => ({ ...prev, nextDirection: direction }));
    }
  };

  // Reset Pacman to initial state
  const resetPacman = () => {
    setPacman({
      position: { row: 23, col: 13 },
      direction: "none",
      nextDirection: "none",
      mouthOpen: true,
      mouthAngle: 0.2,
      lives: pacmanLives,
      isMoving: false,
      moveProgress: 0,
    });
  };

  // Check if Pacman and ghost are moving between the same cells
  const areMovingBetweenSameCells = (
    pacman: Pacman,
    ghost: GridGhost
  ): boolean => {
    // Calculate the target position for Pacman
    let pacmanTargetRow = pacman.position.row;
    let pacmanTargetCol = pacman.position.col;

    switch (pacman.direction) {
      case "up":
        pacmanTargetRow -= 1;
        break;
      case "down":
        pacmanTargetRow += 1;
        break;
      case "left":
        pacmanTargetCol -= 1;
        break;
      case "right":
        pacmanTargetCol += 1;
        break;
    }

    // Handle tunnel wrapping
    if (pacmanTargetCol < 0) pacmanTargetCol = maze[0].length - 1;
    if (pacmanTargetCol >= maze[0].length) pacmanTargetCol = 0;

    // Calculate the target position for ghost
    let ghostTargetRow = ghost.position.row;
    let ghostTargetCol = ghost.position.col;

    switch (ghost.direction) {
      case "up":
        ghostTargetRow -= 1;
        break;
      case "down":
        ghostTargetRow += 1;
        break;
      case "left":
        ghostTargetCol -= 1;
        break;
      case "right":
        ghostTargetCol += 1;
        break;
    }

    // Handle tunnel wrapping
    if (ghostTargetCol < 0) ghostTargetCol = maze[0].length - 1;
    if (ghostTargetCol >= maze[0].length) ghostTargetCol = 0;

    // Check if Pacman's target is ghost's current position and vice versa
    return (
      pacmanTargetRow === ghost.position.row &&
      pacmanTargetCol === ghost.position.col &&
      ghostTargetRow === pacman.position.row &&
      ghostTargetCol === pacman.position.col
    );
  };

  // Decrease Pacman lives
  const decreaseLives = () => {
    setPacman((prev) => ({
      ...prev,
      lives: prev.lives - 1,
    }));
  };

  // Reset Pacman position
  const resetPacmanPosition = () => {
    setPacman((prev) => ({
      ...prev,
      position: { row: 23, col: 13 },
      direction: "none",
      nextDirection: "none",
      isMoving: false,
      moveProgress: 0,
    }));
  };

  return {
    pacman,
    setPacman,
    movePacman,
    handleKeyDown,
    processTouchMovement,
    resetPacman,
    canMove,
    areMovingBetweenSameCells,
    decreaseLives,
    resetPacmanPosition,
  };
};
