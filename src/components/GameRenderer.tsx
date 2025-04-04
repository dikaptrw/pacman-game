"use client";

import React, { useEffect } from "react";
import { Cell, Pacman, GridGhost, VisualEffect, GameState } from "@/types/game";

interface GameRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  maze: Cell[][];
  pacman: Pacman;
  ghosts: GridGhost[];
  visualEffects: VisualEffect[];
  gameState: GameState;
  score: number;
  highScore: number;
  level: number;
  cellSize: number;
  isMobileDevice: boolean;
  soundsEnabled: boolean;
}

const GameRenderer: React.FC<GameRendererProps> = ({
  canvasRef,
  maze,
  pacman,
  ghosts,
  visualEffects,
  gameState,
  score,
  level,
  cellSize,
  isMobileDevice,
}) => {
  // Convert grid position to pixel coordinates for rendering
  // const gridToPixel = (position: GridPosition) => {
  //   return {
  //     x: position.col * cellSize,
  //     y: position.row * cellSize,
  //   };
  // };

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
        const xPos = x * cellSize;
        const yPos = y * cellSize;

        switch (cell.type) {
          case "wall":
            ctx.fillStyle = "#0000FF"; // Blue walls like in the original
            ctx.fillRect(xPos, yPos, cellSize, cellSize);

            // Add a slight glow effect to walls
            ctx.shadowColor = "#0066FF";
            ctx.shadowBlur = 5;
            ctx.strokeStyle = "#0066FF";
            ctx.strokeRect(xPos, yPos, cellSize, cellSize);
            ctx.shadowBlur = 0;
            break;
          case "dot":
            ctx.fillStyle = "#FFFF00"; // Yellow dots
            ctx.beginPath();
            ctx.arc(
              xPos + cellSize / 2,
              yPos + cellSize / 2,
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
              xPos + cellSize / 2,
              yPos + cellSize / 2,
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
      const startX = pacman.position.col * cellSize;
      const startY = pacman.position.row * cellSize;
      let endX = startX;
      let endY = startY;

      switch (pacman.direction) {
        case "up":
          endY = startY - cellSize;
          break;
        case "down":
          endY = startY + cellSize;
          break;
        case "left":
          endX = startX - cellSize;
          // Handle tunnel wrapping
          if (endX < 0) endX = maze[0].length * cellSize - cellSize;
          break;
        case "right":
          endX = startX + cellSize;
          // Handle tunnel wrapping
          if (endX >= maze[0].length * cellSize) endX = 0;
          break;
      }

      pacmanX = startX + (endX - startX) * pacman.moveProgress;
      pacmanY = startY + (endY - startY) * pacman.moveProgress;
    } else {
      pacmanX = pacman.position.col * cellSize;
      pacmanY = pacman.position.row * cellSize;
    }

    const radius = cellSize / 2;

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
        const startX = ghost.position.col * cellSize;
        const startY = ghost.position.row * cellSize;
        let endX = startX;
        let endY = startY;

        switch (ghost.direction) {
          case "up":
            endY = startY - cellSize;
            break;
          case "down":
            endY = startY + cellSize;
            break;
          case "left":
            endX = startX - cellSize;
            // Handle tunnel wrapping
            if (endX < 0) endX = maze[0].length * cellSize - cellSize;
            break;
          case "right":
            endX = startX + cellSize;
            // Handle tunnel wrapping
            if (endX >= maze[0].length * cellSize) endX = 0;
            break;
        }

        ghostX = startX + (endX - startX) * ghost.moveProgress;
        ghostY = startY + (endY - startY) * ghost.moveProgress;
      } else {
        ghostX = ghost.position.col * cellSize;
        ghostY = ghost.position.row * cellSize;
      }

      // Draw ghost body
      let ghostColor = "#FFFFFF"; // Default white

      if (ghost.mode === "frightened") {
        ghostColor = "#0000FF"; // Blue when frightened
      } else {
        switch (ghost.type) {
          case "blinky":
            ghostColor = "#E91716"; // Red
            break;
          case "pinky":
            ghostColor = "#FF82D6"; // Pink
            break;
          case "inky":
            ghostColor = "#65D2E7"; // Cyan
            break;
          case "clyde":
            ghostColor = "#FF7918"; // Orange
            break;
          case "sue":
            ghostColor = "#8B17C6"; // Purple
            break;
        }
      }

      ctx.fillStyle = ghostColor;

      // Add a slight glow effect to ghosts
      if (ghost.mode === "frightened") {
        ctx.shadowColor = "#0000FF";
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = ghostColor;
        ctx.shadowBlur = 5;
      }

      // Draw ghost body (semi-circle top and rectangle bottom)
      ctx.beginPath();
      ctx.arc(ghostX + radius, ghostY + radius, radius, Math.PI, 0, false);
      ctx.lineTo(ghostX + cellSize, ghostY + cellSize);

      // Draw wavy bottom for ghost
      const waveHeight = 2;
      const segments = 3;
      const segmentWidth = cellSize / segments;

      for (let i = 0; i < segments; i++) {
        const waveY =
          i % 2 === 0 ? ghostY + cellSize : ghostY + cellSize - waveHeight;

        ctx.lineTo(ghostX + cellSize - i * segmentWidth, waveY);
      }

      ctx.lineTo(ghostX, ghostY + cellSize);
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
      const effectX = effect.position.col * cellSize;
      const effectY = effect.position.row * cellSize;
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
            effectX + cellSize / 2,
            effectY - 5 * progress
          );
          break;
        case "ghost":
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            `${effect.value}`,
            effectX + cellSize / 2,
            effectY - 10 * progress
          );
          break;
        case "powerPellet":
          ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
          ctx.beginPath();
          const radius = 20 * progress;
          ctx.arc(
            effectX + cellSize / 2,
            effectY + cellSize / 2,
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
            effectX + cellSize / 2,
            effectY + cellSize / 2,
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
        isMobileDevice ? "Tap to start" : "Press SPACE to start",
        canvas.width / 2,
        canvas.height / 2 + 24
      );
    } else if (gameState === "paused") {
      ctx.fillStyle = "yellow";
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
      ctx.fillText(
        isMobileDevice ? "Tap to resume" : "Press SPACE to resume",
        canvas.width / 2,
        canvas.height / 2 + 24
      );
    } else if (gameState === "game-over") {
      ctx.fillStyle = "red";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
      ctx.fillStyle = "yellow";
      ctx.fillText(
        isMobileDevice ? "Tap to play again" : "Press SPACE to play again",
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

    // Draw debug grid (optional)
    // if (false) {
    //   // Set to true to enable debug grid
    //   ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    //   for (let x = 0; x < maze[0].length; x++) {
    //     for (let y = 0; y < maze.length; y++) {
    //       ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    //     }
    //   }
    // }
  }, [
    maze,
    pacman,
    ghosts,
    score,
    gameState,
    level,
    visualEffects,
    isMobileDevice,
    cellSize,
    canvasRef,
  ]);

  return null; // This component doesn't render anything directly, it just uses the canvas ref
};

export default GameRenderer;
