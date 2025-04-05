// Direction type for Pacman movement
export type Direction = "up" | "down" | "left" | "right" | "none";

// Game state type
export type GameState = "ready" | "playing" | "paused" | "game-over" | "win";

// Grid position interface
export interface GridPosition {
  row: number;
  col: number;
}

// Pacman character interface
export interface Pacman {
  position: GridPosition;
  direction: Direction;
  nextDirection: Direction;
  mouthOpen: boolean;
  mouthAngle: number;
  lives: number;
  isMoving: boolean;
  moveProgress: number;
}

// Ghost types and modes
export type GhostType = "blinky" | "pinky" | "inky" | "clyde" | "sue";
export type GhostMode = "chase" | "scatter" | "frightened";

// Ghost interface with grid position
export interface GridGhost {
  type: GhostType;
  position: GridPosition;
  direction: Direction;
  mode: GhostMode;
  speed: number;
  targetPosition: GridPosition;
  isMoving: boolean;
  moveProgress: number;
}

// Visual effect interface
export interface VisualEffect {
  type: "score" | "ghost" | "powerPellet" | "death";
  position: GridPosition;
  value?: number;
  duration: number;
  startTime: number;
}

// Touch position for drag detection
export interface TouchPosition {
  x: number;
  y: number;
}

// Cell types for maze
export type CellType = "empty" | "wall" | "dot" | "powerPellet";

// Cell interface for maze
export interface Cell {
  type: CellType;
}

// Game settings interface
export interface GameSettings {
  cellSize: number;
  pacmanMoveTime: number;
  ghostMoveTime: number;
  frightenedGhostMoveTime: number;
  powerModeDuration: number;
  minDragDistance: number;
  highScoreStorageKey: string;
  highScorePlayerStorageKey: string;
  pacmanLives: number;
}
