"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GridGhost,
  GridPosition,
  Direction,
  Cell,
  GhostType,
} from "@/types/game";
import { isWalkable, getCell } from "@/utils/maze";
import { calculateGhostTarget, getOppositeDirection } from "@/utils/ghost";

interface UseGhostProps {
  maze: Cell[][];
  gameState: string;
  pacmanPosition: GridPosition;
  pacmanDirection: Direction;
  ghostMoveTime: number;
  frightenedGhostMoveTime: number;
  level: number;
  powerMode: boolean;
}

export const useGhost = ({
  maze,
  pacmanPosition,
  pacmanDirection,
  ghostMoveTime,
  frightenedGhostMoveTime,
  level,
  powerMode,
}: UseGhostProps) => {
  // Create initial ghosts
  const createInitialGhosts = (): GridGhost[] => {
    const levelSpeedMultiplier = 1 - level * 0.05; // Decrease time (increase speed) by 5% per level
    return [
      {
        type: "blinky",
        position: { row: 11, col: 13 },
        direction: "left",
        mode: "scatter",
        speed: ghostMoveTime * levelSpeedMultiplier,
        targetPosition: { row: 0, col: 26 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "pinky",
        position: { row: 14, col: 13 },
        direction: "down",
        mode: "scatter",
        speed: ghostMoveTime * 1.05 * levelSpeedMultiplier,
        targetPosition: { row: 0, col: 2 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "inky",
        position: { row: 14, col: 11 },
        direction: "up",
        mode: "scatter",
        speed: ghostMoveTime * 1.1 * levelSpeedMultiplier,
        targetPosition: { row: 31, col: 27 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "clyde",
        position: { row: 14, col: 15 },
        direction: "up",
        mode: "scatter",
        speed: ghostMoveTime * 1.15 * levelSpeedMultiplier,
        targetPosition: { row: 31, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
      {
        type: "sue",
        position: { row: 13, col: 13 },
        direction: "right",
        mode: "scatter",
        speed: ghostMoveTime * 1.2 * levelSpeedMultiplier,
        targetPosition: { row: 15, col: 0 },
        isMoving: false,
        moveProgress: 0,
      },
    ];
  };

  const [ghosts, setGhosts] = useState<GridGhost[]>(createInitialGhosts());
  const [ghostsEaten, setGhostsEaten] = useState(0);

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
            pacmanPosition,
            pacmanDirection,
            ghost.mode
          );

          // Determine possible directions (excluding the opposite of current direction)
          const possibleDirections: Direction[] = [];
          const oppositeDirection = getOppositeDirection(ghost.direction);

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

          // If no valid directions, try including the opposite direction
          if (possibleDirections.length === 0) {
            if (canMove(ghost.position, oppositeDirection)) {
              possibleDirections.push(oppositeDirection);
            }
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

  // Reset ghost positions
  const resetGhostPositions = () => {
    setGhosts((prevGhosts) =>
      prevGhosts.map((g, i) => {
        const positions = [
          { row: 11, col: 13 }, // blinky
          { row: 14, col: 13 }, // pinky
          { row: 14, col: 11 }, // inky
          { row: 14, col: 15 }, // clyde
          { row: 13, col: 13 }, // sue
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
  };

  // Set ghosts to frightened mode
  const setGhostsFrightened = useCallback(() => {
    setGhosts((prevGhosts) =>
      prevGhosts.map((ghost) => ({
        ...ghost,
        mode: "frightened",
        speed: frightenedGhostMoveTime,
      }))
    );
  }, [frightenedGhostMoveTime]);

  // Reset ghost to normal mode
  const resetGhostMode = (ghostType: GhostType) => {
    setGhosts((prevGhosts) =>
      prevGhosts.map((g) =>
        g.type === ghostType
          ? {
              ...g,
              position: { row: 14, col: 13 },
              mode: "chase",
              isMoving: false,
              moveProgress: 0,
              speed: ghostMoveTime * (1 - level * 0.05),
            }
          : g
      )
    );
  };

  // Toggle ghost mode between chase and scatter
  const toggleGhostMode = () => {
    setGhosts((prevGhosts) =>
      prevGhosts.map((ghost) => ({
        ...ghost,
        mode: ghost.mode === "chase" ? "scatter" : "chase",
      }))
    );
  };

  // Reset ghosts to initial state
  const resetGhosts = () => {
    setGhosts(createInitialGhosts());
    setGhostsEaten(0);
  };

  // Update ghost modes when power mode changes
  useEffect(() => {
    if (powerMode) {
      setGhostsFrightened();
    } else {
      // Restore ghosts to normal mode with level-appropriate speed
      const levelSpeedMultiplier = 1 - level * 0.05;
      setGhosts((prevGhosts) =>
        prevGhosts.map((ghost) => {
          if (ghost.mode === "frightened") {
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
          }
          return ghost;
        })
      );
    }
  }, [powerMode, level, ghostMoveTime, setGhostsFrightened]);

  return {
    ghosts,
    setGhosts,
    ghostsEaten,
    setGhostsEaten,
    moveGhosts,
    resetGhostPositions,
    setGhostsFrightened,
    resetGhostMode,
    toggleGhostMode,
    resetGhosts,
  };
};
