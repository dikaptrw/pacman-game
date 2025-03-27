"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createMaze, Cell, isWalkable, getCell } from "@/utils/mazeUtils";
import {
  getGhostColor,
  calculateGhostTarget,
  GhostType,
  GhostMode,
} from "@/utils/ghostUtils";
import { useSounds } from "@/utils/soundUtils";

// Direction type for Pacman movement
type Direction = "up" | "down" | "left" | "right" | "none";

// Game state type
type GameState = "ready" | "playing" | "paused" | "game-over" | "win";

// Grid position interface
interface GridPosition {
  row: number;
  col: number;
}

// Pacman character interface
interface Pacman {
  position: GridPosition;
  direction: Direction;
  nextDirection: Direction;
  mouthOpen: boolean;
  mouthAngle: number;
  lives: number;
  isMoving: boolean;
  moveProgress: number;
}

// Ghost interface with grid position
interface GridGhost {
  type: GhostType;
  direction: Direction;
  mode: GhostMode;
  position: GridPosition;
  targetPosition: GridPosition;
  isMoving: boolean;
  moveProgress: number;
  speed: number;
}

// Visual effect interface
interface VisualEffect {
  type: "score" | "ghost" | "powerPellet" | "death";
  position: GridPosition;
  value?: number;
  duration: number;
  startTime: number;
}

const GameBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [pacman, setPacman] = useState<Pacman>({
    position: { row: 23, col: 13 }, // Starting position
    direction: "none",
    nextDirection: "none",
    mouthOpen: true,
    mouthAngle: 0.2,
    lives: 3,
    isMoving: false,
    moveProgress: 0,
  });
  const [ghosts, setGhosts] = useState<GridGhost[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [dotsRemaining, setDotsRemaining] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setPowerMode] = useState(false);
  const [powerModeTimer, setPowerModeTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [ghostsEaten, setGhostsEaten] = useState(0);
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);

  // Use the sound utility hook
  const { playSound, toggleSounds, soundsEnabled } = useSounds();

  // Game animation frame reference
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const ghostModeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cell size in pixels
  const CELL_SIZE = 16;

  // Movement speed (milliseconds per cell)
  const PACMAN_MOVE_TIME = 200; // ms per cell
  const GHOST_MOVE_TIME = 250; // ms per cell
  const FRIGHTENED_GHOST_MOVE_TIME = 400; // ms per cell

  // Power mode duration in milliseconds
  const POWER_MODE_DURATION = 8000;

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

  // Initialize the game board
  useEffect(() => {
    if (!isInitialized) {
      const initialMaze = createMaze();

      // Count dots in the maze
      let dots = 0;
      initialMaze.forEach((row) => {
        row.forEach((cell) => {
          if (cell.type === "dot" || cell.type === "powerPellet") {
            dots++;
          }
        });
      });

      // Convert original ghosts to grid-based ghosts
      const initialGhosts: GridGhost[] = [
        {
          type: "blinky",
          position: { row: 11, col: 13 },
          direction: "left",
          mode: "scatter",
          speed: GHOST_MOVE_TIME,
          targetPosition: { row: 0, col: 26 },
          isMoving: false,
          moveProgress: 0,
        },
        {
          type: "pinky",
          position: { row: 14, col: 13 },
          direction: "down",
          mode: "scatter",
          speed: GHOST_MOVE_TIME * 1.05,
          targetPosition: { row: 0, col: 2 },
          isMoving: false,
          moveProgress: 0,
        },
        {
          type: "inky",
          position: { row: 14, col: 11 },
          direction: "up",
          mode: "scatter",
          speed: GHOST_MOVE_TIME * 1.1,
          targetPosition: { row: 31, col: 27 },
          isMoving: false,
          moveProgress: 0,
        },
        {
          type: "clyde",
          position: { row: 14, col: 15 },
          direction: "up",
          mode: "scatter",
          speed: GHOST_MOVE_TIME * 1.15,
          targetPosition: { row: 31, col: 0 },
          isMoving: false,
          moveProgress: 0,
        },
        {
          type: "teal",
          position: { row: 29, col: 21 },
          direction: "left",
          mode: "scatter",
          speed: GHOST_MOVE_TIME * 1.15,
          targetPosition: { row: 31, col: 0 },
          isMoving: false,
          moveProgress: 0,
        },
        {
          type: "white",
          position: { row: 1, col: 9 },
          direction: "down",
          mode: "scatter",
          speed: GHOST_MOVE_TIME * 1.15,
          targetPosition: { row: 21, col: 0 },
          isMoving: false,
          moveProgress: 0,
        },
      ];

      setMaze(initialMaze);
      setGhosts(initialGhosts);
      setDotsRemaining(dots);
      setIsInitialized(true);
      setGameState("ready");

      // Load high score from localStorage if available
      const savedHighScore = localStorage.getItem("pacmanHighScore");
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore, 10));
      }
    }

    return () => {
      if (ghostModeTimerRef.current) {
        clearInterval(ghostModeTimerRef.current);
      }
      if (powerModeTimer) {
        clearTimeout(powerModeTimer);
      }
    };
  }, [isInitialized, powerModeTimer]);

  // Reset game to initial state
  const resetGame = useCallback(() => {
    const initialMaze = createMaze();

    // Count dots in the maze
    let dots = 0;
    initialMaze.forEach((row) => {
      row.forEach((cell) => {
        if (cell.type === "dot" || cell.type === "powerPellet") {
          dots++;
        }
      });
    });

    // Create initial ghosts
    const initialGhosts: GridGhost[] = [
      {
        type: "blinky",
        position: { row: 11, col: 13 },
        direction: "left",
        mode: "scatter",
        speed: GHOST_MOVE_TIME,
        targetPosition: { row: 0, col: 26 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "pinky",
        position: { row: 14, col: 13 },
        direction: "down",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.05,
        targetPosition: { row: 0, col: 2 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "inky",
        position: { row: 14, col: 11 },
        direction: "up",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.1,
        targetPosition: { row: 31, col: 27 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "clyde",
        position: { row: 14, col: 15 },
        direction: "up",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.15,
        targetPosition: { row: 31, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "teal",
        position: { row: 29, col: 21 },
        direction: "left",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.15,
        targetPosition: { row: 31, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "white",
        position: { row: 1, col: 9 },
        direction: "down",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.15,
        targetPosition: { row: 21, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
    ];

    setMaze(initialMaze);
    setGhosts(initialGhosts);
    setDotsRemaining(dots);
    setPacman({
      position: { row: 23, col: 13 },
      direction: "none",
      nextDirection: "none",
      mouthOpen: true,
      mouthAngle: 0.2,
      lives: 3,
      isMoving: false,
      moveProgress: 0,
    });
    setScore(0);
    setLevel(1);
    setGameState("ready");
    setGhostsEaten(0);
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
  }, [powerModeTimer]);

  // Handle keyboard input for Pacman movement and game control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Game controls
      if (e.key === " " || e.key === "Enter") {
        if (gameState === "ready" || gameState === "paused") {
          setGameState("playing");
          playSound("start");

          // Set up ghost mode cycling (between chase and scatter) when game starts
          if (!ghostModeTimerRef.current) {
            ghostModeTimerRef.current = setInterval(() => {
              setGhosts((prevGhosts) =>
                prevGhosts.map((ghost) => ({
                  ...ghost,
                  mode: ghost.mode === "chase" ? "scatter" : "chase",
                }))
              );
            }, 20000); // Switch every 20 seconds
          }
        } else if (gameState === "playing") {
          setGameState("paused");
        } else if (gameState === "game-over") {
          // Reset game
          resetGame();
        }
        return;
      }

      // Toggle sound with 'M' key
      if (e.key === "m" || e.key === "M") {
        toggleSounds();
        return;
      }

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

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    gameState,
    pacman.isMoving,
    pacman.direction,
    playSound,
    toggleSounds,
    resetGame,
    soundsEnabled,
  ]);

  // Advance to next level
  const nextLevel = useCallback(() => {
    playSound("levelComplete");

    const initialMaze = createMaze();

    // Count dots in the maze
    let dots = 0;
    initialMaze.forEach((row) => {
      row.forEach((cell) => {
        if (cell.type === "dot" || cell.type === "powerPellet") {
          dots++;
        }
      });
    });

    // Create ghosts with increased speed for higher levels
    const levelSpeedMultiplier = 1 - level * 0.05; // Decrease time (increase speed) by 5% per level
    const initialGhosts: GridGhost[] = [
      {
        type: "blinky",
        position: { row: 11, col: 13 },
        direction: "left",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * levelSpeedMultiplier,
        targetPosition: { row: 0, col: 26 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "pinky",
        position: { row: 14, col: 13 },
        direction: "down",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.05 * levelSpeedMultiplier,
        targetPosition: { row: 0, col: 2 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "inky",
        position: { row: 14, col: 11 },
        direction: "up",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.1 * levelSpeedMultiplier,
        targetPosition: { row: 31, col: 27 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "clyde",
        position: { row: 14, col: 15 },
        direction: "up",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.15 * levelSpeedMultiplier,
        targetPosition: { row: 31, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "teal",
        position: { row: 29, col: 21 },
        direction: "left",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.15 * levelSpeedMultiplier,
        targetPosition: { row: 31, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "white",
        position: { row: 1, col: 9 },
        direction: "down",
        mode: "scatter",
        speed: GHOST_MOVE_TIME * 1.15 * levelSpeedMultiplier,
        targetPosition: { row: 21, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
    ];

    setMaze(initialMaze);
    setGhosts(initialGhosts);
    setDotsRemaining(dots);
    setPacman((prev) => ({
      ...prev,
      position: { row: 23, col: 13 },
      direction: "none",
      nextDirection: "none",
      isMoving: false,
      moveProgress: 0,
    }));
    setLevel((prev) => prev + 1);
    setGameState("ready");
    setGhostsEaten(0);
    setPowerMode(false);
    setVisualEffects([]);

    if (powerModeTimer) {
      clearTimeout(powerModeTimer);
      setPowerModeTimer(null);
    }
  }, [level, playSound, powerModeTimer]);

  // Check if a move is valid in the specified direction
  const canMove = (position: GridPosition, direction: Direction): boolean => {
    if (direction === "none") return false;

    // Calculate the target position based on direction
    let targetRow = position.row;
    let targetCol = position.col;

    switch (direction) {
      case "up":
        targetRow -= 1;
        break;
      case "down":
        targetRow += 1;
        break;
      case "left":
        targetCol -= 1;
        break;
      case "right":
        targetCol += 1;
        break;
    }

    // Handle tunnel wrapping
    if (targetCol < 0) targetCol = maze[0].length - 1;
    if (targetCol >= maze[0].length) targetCol = 0;

    // Check if the target position is walkable
    const targetCell = getCell(maze, targetCol, targetRow);
    return isWalkable(targetCell);
  };

  // Move Pacman based on current direction
  const movePacman = (deltaTime: number) => {
    setPacman((prev) => {
      // If Pacman is not moving, try to start a move
      if (!prev.isMoving) {
        // First try to move in the next direction if it's set
        if (
          prev.nextDirection !== "none" &&
          canMove(prev.position, prev.nextDirection)
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
          canMove(prev.position, prev.direction)
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
      const newProgress = prev.moveProgress + deltaTime / PACMAN_MOVE_TIME;

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
                speed: FRIGHTENED_GHOST_MOVE_TIME,
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

              // Restore ghosts to normal mode with level-appropriate speed
              const levelSpeedMultiplier = 1 - level * 0.05;
              setGhosts((prevGhosts) =>
                prevGhosts.map((ghost) => {
                  let baseSpeed = GHOST_MOVE_TIME;
                  switch (ghost.type) {
                    case "blinky":
                      baseSpeed = GHOST_MOVE_TIME;
                      break;
                    case "pinky":
                      baseSpeed = GHOST_MOVE_TIME * 1.05;
                      break;
                    case "inky":
                      baseSpeed = GHOST_MOVE_TIME * 1.1;
                      break;
                    case "clyde":
                      baseSpeed = GHOST_MOVE_TIME * 1.15;
                      break;
                    case "teal":
                      baseSpeed = GHOST_MOVE_TIME * 1.2;
                      break;
                    case "white":
                      baseSpeed = GHOST_MOVE_TIME * 1.25;
                      break;
                  }

                  return {
                    ...ghost,
                    mode: "chase",
                    speed: baseSpeed * levelSpeedMultiplier,
                  };
                })
              );
            }, POWER_MODE_DURATION);

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

  // Move ghosts based on their behavior
  const moveGhosts = (deltaTime: number) => {
    setGhosts((prevGhosts) => {
      return prevGhosts.map((ghost) => {
        // If ghost is not moving, try to start a move
        if (!ghost.isMoving) {
          // Calculate ghost target based on current mode and Pacman position
          const target = calculateGhostTarget(
            ghost.type,
            ghost.position,
            pacman.position,
            pacman.direction,
            ghost.mode
          );

          // Determine possible directions (excluding the opposite of current direction)
          const possibleDirections: Direction[] = [];

          // Check each direction
          if (ghost.direction !== "down" && canMove(ghost.position, "up")) {
            possibleDirections.push("up");
          }

          if (ghost.direction !== "up" && canMove(ghost.position, "down")) {
            possibleDirections.push("down");
          }

          if (ghost.direction !== "right" && canMove(ghost.position, "left")) {
            possibleDirections.push("left");
          }

          if (ghost.direction !== "left" && canMove(ghost.position, "right")) {
            possibleDirections.push("right");
          }

          // Choose the best direction based on target
          let bestDirection = ghost.direction;

          if (possibleDirections.length > 0) {
            if (ghost.mode === "frightened") {
              // In frightened mode, choose a random direction
              bestDirection =
                possibleDirections[
                  Math.floor(Math.random() * possibleDirections.length)
                ];
            } else {
              // In chase or scatter mode, choose the direction that gets closest to the target
              let bestDistance = Infinity;

              possibleDirections.forEach((direction) => {
                let newRow = ghost.position.row;
                let newCol = ghost.position.col;

                switch (direction) {
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

                // Handle tunnel wrapping for distance calculation
                if (newCol < 0) newCol = maze[0].length - 1;
                if (newCol >= maze[0].length) newCol = 0;

                const distanceToTarget = Math.sqrt(
                  Math.pow(newCol - target.col, 2) +
                    Math.pow(newRow - target.row, 2)
                );

                if (distanceToTarget < bestDistance) {
                  bestDistance = distanceToTarget;
                  bestDirection = direction;
                }
              });
            }
          }

          // Start moving in the chosen direction
          return {
            ...ghost,
            direction: bestDirection,
            isMoving: true,
            moveProgress: 0,
            targetPosition: target,
          };
        }

        // If ghost is already moving, update the progress
        const newProgress = ghost.moveProgress + deltaTime / ghost.speed;

        // If the move is complete
        if (newProgress >= 1) {
          // Calculate the new position
          let newRow = ghost.position.row;
          let newCol = ghost.position.col;

          switch (ghost.direction) {
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

          // Move is complete, update position and reset progress
          return {
            ...ghost,
            position: { row: newRow, col: newCol },
            isMoving: false,
            moveProgress: 0,
          };
        }

        // Move is still in progress
        return {
          ...ghost,
          moveProgress: newProgress,
        };
      });
    });
  };

  // Check for collisions between Pacman and ghosts
  const checkGhostCollisions = () => {
    ghosts.forEach((ghost) => {
      // Check if Pacman and ghost are in the same cell
      const samePosition =
        ghost.position.row === pacman.position.row &&
        ghost.position.col === pacman.position.col;

      // If they're in the same cell or both moving between the same cells in opposite directions
      if (
        samePosition ||
        (pacman.isMoving &&
          ghost.isMoving &&
          pacman.direction === oppositeOf(ghost.direction) &&
          areMovingBetweenSameCells(pacman, ghost))
      ) {
        if (ghost.mode === "frightened") {
          // Pacman eats the ghost
          playSound("eatGhost");

          const newGhostsEaten = ghostsEaten + 1;
          setGhostsEaten(newGhostsEaten);

          // Score increases with each ghost eaten during a single power mode
          // 200, 400, 800, 1600 points
          const points = 200 * Math.pow(2, newGhostsEaten - 1);
          setScore((prev) => prev + points);

          // Add visual effect
          addVisualEffect("ghost", ghost.position, points);

          // Reset the ghost position
          setGhosts((prevGhosts) =>
            prevGhosts.map((g) =>
              g.type === ghost.type
                ? {
                    ...g,
                    position: { row: 14, col: 13 },
                    mode: "chase",
                    isMoving: false,
                    moveProgress: 0,
                    speed: GHOST_MOVE_TIME * (1 - level * 0.05),
                  }
                : g
            )
          );
        } else {
          // Pacman loses a life
          playSound("death");

          // Add death visual effect
          addVisualEffect("death", pacman.position);

          setPacman((prev) => {
            const newLives = prev.lives - 1;

            if (newLives <= 0) {
              // Game over
              setGameState("game-over");

              // Update high score if needed
              if (score > highScore) {
                setHighScore(score);
                localStorage.setItem("pacmanHighScore", score.toString());
              }
            } else {
              // Reset positions but continue game
              setTimeout(() => {
                setPacman((p) => ({
                  ...p,
                  position: { row: 23, col: 13 },
                  direction: "none",
                  nextDirection: "none",
                  isMoving: false,
                  moveProgress: 0,
                }));

                // Reset ghost positions
                setGhosts((prevGhosts) =>
                  prevGhosts.map((g, i) => {
                    const positions = [
                      { row: 11, col: 13 }, // blinky
                      { row: 14, col: 13 }, // pinky
                      { row: 14, col: 11 }, // inky
                      { row: 14, col: 15 }, // clyde
                      { row: 29, col: 21 }, // teal
                      { row: 1, col: 9 }, // white
                    ];

                    return {
                      ...g,
                      position: positions[i],
                      isMoving: false,
                      moveProgress: 0,
                      mode: "scatter",
                    };
                  })
                );

                setGameState("ready");
              }, 1000);

              setGameState("paused");
            }

            return {
              ...prev,
              lives: newLives,
            };
          });
        }
      }
    });
  };

  // Helper function to get the opposite direction
  const oppositeOf = (direction: Direction): Direction => {
    switch (direction) {
      case "up":
        return "down";
      case "down":
        return "up";
      case "left":
        return "right";
      case "right":
        return "left";
      default:
        return "none";
    }
  };

  // Helper function to check if Pacman and ghost are moving between the same cells
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

  // Check if level is complete (all dots eaten)
  useEffect(() => {
    if (dotsRemaining === 0 && gameState === "playing") {
      // Level complete
      setGameState("win");

      // Advance to next level after a delay
      setTimeout(() => {
        nextLevel();
      }, 3000);
    }
  }, [dotsRemaining, gameState, nextLevel]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") {
      lastTimeRef.current = 0;
      return;
    }

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Limit delta time to prevent large jumps after tab switch
      const cappedDeltaTime = Math.min(deltaTime, 50);

      // Update game state
      movePacman(cappedDeltaTime);
      moveGhosts(cappedDeltaTime);
      checkGhostCollisions();

      // Continue the game loop
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line
  }, [gameState, maze, ghosts, pacman]);

  // Draw the game board
  useEffect(() => {
    if (!canvasRef.current || maze.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 448; // 28 cells * 16 pixels
    canvas.height = 496; // 31 cells * 16 pixels

    // Clear the canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the maze
    maze.forEach((row, y) => {
      row.forEach((cell, x) => {
        const xPos = x * CELL_SIZE;
        const yPos = y * CELL_SIZE;

        switch (cell.type) {
          case "wall":
            ctx.fillStyle = "#0000FF"; // Blue walls like in the original
            ctx.fillRect(xPos, yPos, CELL_SIZE, CELL_SIZE);

            // Add a slight glow effect to walls
            ctx.shadowColor = "#0066FF";
            ctx.shadowBlur = 5;
            ctx.strokeStyle = "#0066FF";
            ctx.strokeRect(xPos, yPos, CELL_SIZE, CELL_SIZE);
            ctx.shadowBlur = 0;
            break;
          case "dot":
            ctx.fillStyle = "#FFFF00"; // Yellow dots
            ctx.beginPath();
            ctx.arc(
              xPos + CELL_SIZE / 2,
              yPos + CELL_SIZE / 2,
              2,
              0,
              Math.PI * 2
            );
            ctx.fill();
            break;
          case "powerPellet":
            // Animate power pellets by pulsing their size
            const pulseSize = 3 + Math.sin(Date.now() / 200) * 1;
            ctx.fillStyle = "#FFFF00"; // Yellow power pellets
            ctx.beginPath();
            ctx.arc(
              xPos + CELL_SIZE / 2,
              yPos + CELL_SIZE / 2,
              pulseSize,
              0,
              Math.PI * 2
            );
            ctx.fill();
            break;
          default:
            // Empty space, do nothing
            break;
        }
      });
    });

    // Draw Pacman with interpolated position during movement
    let pacmanX, pacmanY;

    if (pacman.isMoving) {
      // Calculate interpolated position based on movement progress
      const startX = pacman.position.col * CELL_SIZE;
      const startY = pacman.position.row * CELL_SIZE;
      let endX = startX;
      let endY = startY;

      switch (pacman.direction) {
        case "up":
          endY = startY - CELL_SIZE;
          break;
        case "down":
          endY = startY + CELL_SIZE;
          break;
        case "left":
          endX = startX - CELL_SIZE;
          // Handle tunnel wrapping
          if (endX < 0) endX = maze[0].length * CELL_SIZE - CELL_SIZE;
          break;
        case "right":
          endX = startX + CELL_SIZE;
          // Handle tunnel wrapping
          if (endX >= maze[0].length * CELL_SIZE) endX = 0;
          break;
      }

      pacmanX = startX + (endX - startX) * pacman.moveProgress;
      pacmanY = startY + (endY - startY) * pacman.moveProgress;
    } else {
      pacmanX = pacman.position.col * CELL_SIZE;
      pacmanY = pacman.position.row * CELL_SIZE;
    }

    const radius = CELL_SIZE / 2;

    ctx.fillStyle = "#FFFF00"; // Yellow Pacman
    ctx.beginPath();

    // Calculate mouth angles based on direction
    let startAngle = 0;
    let endAngle = 2 * Math.PI;

    if (pacman.mouthOpen) {
      switch (pacman.direction) {
        case "right":
          startAngle = 0.2;
          endAngle = 2 * Math.PI - 0.2;
          break;
        case "left":
          startAngle = Math.PI + 0.2;
          endAngle = Math.PI - 0.2;
          break;
        case "up":
          startAngle = Math.PI * 1.5 + 0.2;
          endAngle = Math.PI * 1.5 - 0.2;
          break;
        case "down":
          startAngle = Math.PI * 0.5 + 0.2;
          endAngle = Math.PI * 0.5 - 0.2;
          break;
        default:
          // Default to right-facing if no direction
          startAngle = 0.2;
          endAngle = 2 * Math.PI - 0.2;
      }
    }

    ctx.arc(pacmanX + radius, pacmanY + radius, radius, startAngle, endAngle);
    ctx.lineTo(pacmanX + radius, pacmanY + radius);
    ctx.fill();

    // Draw ghosts with interpolated positions during movement
    ghosts.forEach((ghost) => {
      let ghostX, ghostY;

      if (ghost.isMoving) {
        // Calculate interpolated position based on movement progress
        const startX = ghost.position.col * CELL_SIZE;
        const startY = ghost.position.row * CELL_SIZE;
        let endX = startX;
        let endY = startY;

        switch (ghost.direction) {
          case "up":
            endY = startY - CELL_SIZE;
            break;
          case "down":
            endY = startY + CELL_SIZE;
            break;
          case "left":
            endX = startX - CELL_SIZE;
            // Handle tunnel wrapping
            if (endX < 0) endX = maze[0].length * CELL_SIZE - CELL_SIZE;
            break;
          case "right":
            endX = startX + CELL_SIZE;
            // Handle tunnel wrapping
            if (endX >= maze[0].length * CELL_SIZE) endX = 0;
            break;
        }

        ghostX = startX + (endX - startX) * ghost.moveProgress;
        ghostY = startY + (endY - startY) * ghost.moveProgress;
      } else {
        ghostX = ghost.position.col * CELL_SIZE;
        ghostY = ghost.position.row * CELL_SIZE;
      }

      // Draw ghost body
      ctx.fillStyle = getGhostColor(ghost.type, ghost.mode);

      // Add a slight glow effect to ghosts
      if (ghost.mode === "frightened") {
        ctx.shadowColor = "#0000FF";
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = getGhostColor(ghost.type, ghost.mode);
        ctx.shadowBlur = 5;
      }

      // Draw ghost body (semi-circle top and rectangle bottom)
      ctx.beginPath();
      ctx.arc(ghostX + radius, ghostY + radius, radius, Math.PI, 0, false);
      ctx.lineTo(ghostX + CELL_SIZE, ghostY + CELL_SIZE);

      // Draw wavy bottom for ghost
      const waveHeight = 2;
      const segments = 3;
      const segmentWidth = CELL_SIZE / segments;

      for (let i = 0; i < segments; i++) {
        const waveY =
          i % 2 === 0 ? ghostY + CELL_SIZE : ghostY + CELL_SIZE - waveHeight;

        ctx.lineTo(ghostX + CELL_SIZE - i * segmentWidth, waveY);
      }

      ctx.lineTo(ghostX, ghostY + CELL_SIZE);
      ctx.closePath();
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw ghost eyes (not for frightened mode)
      if (ghost.mode !== "frightened") {
        ctx.fillStyle = "white";

        // Left eye
        ctx.beginPath();
        ctx.arc(ghostX + radius - 2, ghostY + radius - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Right eye
        ctx.beginPath();
        ctx.arc(ghostX + radius + 2, ghostY + radius - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw pupils based on direction
        ctx.fillStyle = "black";

        let pupilOffsetX = 0;
        let pupilOffsetY = 0;

        switch (ghost.direction) {
          case "up":
            pupilOffsetY = -1;
            break;
          case "down":
            pupilOffsetY = 1;
            break;
          case "left":
            pupilOffsetX = -1;
            break;
          case "right":
            pupilOffsetX = 1;
            break;
        }

        // Left pupil
        ctx.beginPath();
        ctx.arc(
          ghostX + radius - 2 + pupilOffsetX,
          ghostY + radius - 2 + pupilOffsetY,
          1,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Right pupil
        ctx.beginPath();
        ctx.arc(
          ghostX + radius + 2 + pupilOffsetX,
          ghostY + radius - 2 + pupilOffsetY,
          1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else {
        // Draw frightened eyes
        ctx.fillStyle = "white";

        // Left eye
        ctx.beginPath();
        ctx.arc(ghostX + radius - 2, ghostY + radius - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Right eye
        ctx.beginPath();
        ctx.arc(ghostX + radius + 2, ghostY + radius - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw visual effects
    visualEffects.forEach((effect) => {
      const effectX = effect.position.col * CELL_SIZE;
      const effectY = effect.position.row * CELL_SIZE;
      const progress = (Date.now() - effect.startTime) / effect.duration;

      // Fade out as the effect progresses
      const alpha = 1 - progress;

      switch (effect.type) {
        case "score":
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            `${effect.value}`,
            effectX + CELL_SIZE / 2,
            effectY - 5 * progress
          );
          break;
        case "ghost":
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            `${effect.value}`,
            effectX + CELL_SIZE / 2,
            effectY - 10 * progress
          );
          break;
        case "powerPellet":
          ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
          ctx.beginPath();
          const radius = 20 * progress;
          ctx.arc(
            effectX + CELL_SIZE / 2,
            effectY + CELL_SIZE / 2,
            radius,
            0,
            Math.PI * 2
          );
          ctx.fill();
          break;
        case "death":
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
          ctx.beginPath();
          const deathRadius = 15 * progress;
          ctx.arc(
            effectX + CELL_SIZE / 2,
            effectY + CELL_SIZE / 2,
            deathRadius,
            0,
            Math.PI * 2
          );
          ctx.fill();
          break;
      }
    });

    // Draw game state messages
    ctx.font = "16px Arial";
    ctx.textAlign = "center";

    if (gameState === "ready") {
      ctx.fillStyle = "yellow";
      ctx.fillText("READY!", canvas.width / 2, canvas.height / 2);
      ctx.fillText(
        "Press SPACE to start",
        canvas.width / 2,
        canvas.height / 2 + 24
      );
    } else if (gameState === "paused") {
      ctx.fillStyle = "yellow";
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
      ctx.fillText(
        "Press SPACE to resume",
        canvas.width / 2,
        canvas.height / 2 + 24
      );
    } else if (gameState === "game-over") {
      ctx.fillStyle = "red";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
      ctx.fillStyle = "yellow";
      ctx.fillText(
        "Press SPACE to play again",
        canvas.width / 2,
        canvas.height / 2 + 24
      );
    } else if (gameState === "win") {
      ctx.fillStyle = "yellow";
      ctx.fillText("LEVEL COMPLETE!", canvas.width / 2, canvas.height / 2);
      ctx.fillText(
        "Get ready for level " + (level + 1),
        canvas.width / 2,
        canvas.height / 2 + 24
      );
    }

    // Update score display
    const scoreElement = document.getElementById("score");
    if (scoreElement) {
      scoreElement.textContent = score.toString();
    }
  }, [maze, pacman, ghosts, score, gameState, level, visualEffects]);

  return (
    <div className="relative flex flex-col items-center">
      <div className="mb-4 flex w-full justify-between items-center">
        <div className="text-white">
          <span className="mr-4">LEVEL: {level}</span>
        </div>
        <div className="text-white">
          <span className="mr-4">1UP</span>
          <span id="score">{score}</span>
        </div>
        <div className="text-white">
          <span className="mr-2">HIGH SCORE:</span>
          <span>{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="border-2 border-white"
        width={448}
        height={496}
      />

      <div className="mt-4 flex">
        {Array.from({ length: pacman.lives }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 bg-yellow-400 rounded-full mx-1"
          ></div>
        ))}
      </div>

      <div className="mt-4 text-white text-sm flex justify-between w-full max-w-md">
        <p>Controls: Arrow keys to move</p>
        <p>Space: Start/Pause</p>
        <p>M: {soundsEnabled ? "Mute" : "Unmute"}</p>
      </div>
    </div>
  );
};

export default GameBoard;
