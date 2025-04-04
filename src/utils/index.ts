import { Cell, Direction, GridPosition } from "@/types/game";
import { getCell, isWalkable } from "./maze";

// Check if a move is valid in the specified direction
export const canMove = (
  position: GridPosition,
  direction: Direction,
  maze: Cell[][]
): boolean => {
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
