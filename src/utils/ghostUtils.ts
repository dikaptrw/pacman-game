'use client';

import React from 'react';

// Ghost type definitions
export type GhostType = 'blinky' | 'pinky' | 'inky' | 'clyde';
export type GhostMode = 'chase' | 'scatter' | 'frightened';

// Grid position interface
interface GridPosition {
  row: number;
  col: number;
}

// Get ghost color based on type and mode
export const getGhostColor = (type: GhostType, mode: GhostMode): string => {
  if (mode === 'frightened') {
    return '#0000FF'; // Blue when frightened
  }
  
  switch (type) {
    case 'blinky':
      return '#FF0000'; // Red
    case 'pinky':
      return '#FFC0CB'; // Pink
    case 'inky':
      return '#00FFFF'; // Cyan
    case 'clyde':
      return '#FFA500'; // Orange
    default:
      return '#FFFFFF'; // White (fallback)
  }
};

// Calculate ghost target based on mode and Pacman position
export const calculateGhostTarget = (
  ghostType: GhostType,
  ghostPosition: GridPosition,
  pacmanPosition: GridPosition,
  pacmanDirection: 'up' | 'down' | 'left' | 'right' | 'none',
  ghostMode: GhostMode
): GridPosition => {
  // If in frightened mode, target is random
  if (ghostMode === 'frightened') {
    return {
      row: Math.floor(Math.random() * 31),
      col: Math.floor(Math.random() * 28)
    };
  }
  
  // If in scatter mode, target is corner
  if (ghostMode === 'scatter') {
    switch (ghostType) {
      case 'blinky':
        return { row: 0, col: 26 }; // Top-right
      case 'pinky':
        return { row: 0, col: 2 }; // Top-left
      case 'inky':
        return { row: 31, col: 27 }; // Bottom-right
      case 'clyde':
        return { row: 31, col: 0 }; // Bottom-left
      default:
        return { row: 0, col: 0 };
    }
  }
  
  // In chase mode, each ghost has a different targeting strategy
  switch (ghostType) {
    case 'blinky':
      // Blinky directly targets Pacman
      return { row: pacmanPosition.row, col: pacmanPosition.col };
    
    case 'pinky':
      // Pinky targets 4 tiles ahead of Pacman
      let targetRow = pacmanPosition.row;
      let targetCol = pacmanPosition.col;
      
      switch (pacmanDirection) {
        case 'up':
          targetRow -= 4;
          targetCol -= 4; // This is actually a bug in the original game!
          break;
        case 'down':
          targetRow += 4;
          break;
        case 'left':
          targetCol -= 4;
          break;
        case 'right':
          targetCol += 4;
          break;
      }
      
      return { row: targetRow, col: targetCol };
    
    case 'inky':
      // Inky uses a vector from Blinky to a point ahead of Pacman
      let pivotRow = pacmanPosition.row;
      let pivotCol = pacmanPosition.col;
      
      // Get position 2 tiles ahead of Pacman
      switch (pacmanDirection) {
        case 'up':
          pivotRow -= 2;
          break;
        case 'down':
          pivotRow += 2;
          break;
        case 'left':
          pivotCol -= 2;
          break;
        case 'right':
          pivotCol += 2;
          break;
      }
      
      // Find Blinky's position (assuming first ghost is Blinky)
      const blinkyRow = 11; // Default if we can't find Blinky
      const blinkyCol = 13;
      
      // Calculate the vector from Blinky to the pivot point and double it
      const vectorRow = pivotRow - blinkyRow;
      const vectorCol = pivotCol - blinkyCol;
      
      return {
        row: pivotRow + vectorRow,
        col: pivotCol + vectorCol
      };
    
    case 'clyde':
      // Clyde targets Pacman directly when far away, but targets scatter corner when close
      const distance = Math.sqrt(
        Math.pow(ghostPosition.col - pacmanPosition.col, 2) + 
        Math.pow(ghostPosition.row - pacmanPosition.row, 2)
      );
      
      if (distance > 8) {
        // If far from Pacman, target him directly
        return { row: pacmanPosition.row, col: pacmanPosition.col };
      } else {
        // If close to Pacman, go to scatter corner
        return { row: 31, col: 0 };
      }
    
    default:
      return { row: pacmanPosition.row, col: pacmanPosition.col };
  }
};
