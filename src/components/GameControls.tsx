"use client";

import React from "react";
import { GameState } from "@/types/game";

interface GameControlsProps {
  gameState: GameState;
  score: number;
  highScore: number;
  level: number;
  lives: number;
  isMobileDevice: boolean;
  soundsEnabled: boolean;
  onStartPause: () => void;
  onToggleSound: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  score,
  highScore,
  level,
  lives,
  isMobileDevice,
  soundsEnabled,
  onStartPause,
  onToggleSound,
}) => {
  return (
    <div className="absolute inset-0">
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

      <div className="mt-4 flex">
        {Array.from({ length: lives }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 bg-yellow-400 rounded-full mx-1"
          ></div>
        ))}
      </div>

      {/* Mobile touch controls */}
      {isMobileDevice && (
        <div className="mt-4 flex justify-center">
          <button
            className="px-4 py-2 bg-yellow-500 rounded-lg opacity-70 active:opacity-90"
            onClick={onStartPause}
          >
            {gameState === "playing" ? "Pause" : "Start"}
          </button>

          <button
            className="ml-4 px-4 py-2 bg-blue-600 rounded-lg opacity-70 active:opacity-90"
            onClick={onToggleSound}
          >
            {soundsEnabled ? "Mute" : "Unmute"}
          </button>
        </div>
      )}

      {/* Mobile instructions */}
      {isMobileDevice && (
        <div className="mt-2 text-white text-sm text-center">
          <p>Touch and drag in any direction to move Pacman</p>
        </div>
      )}

      {/* Game instructions for desktop */}
      {!isMobileDevice && (
        <div className="mt-4 text-white text-sm flex justify-between w-full max-w-md">
          <p>Controls: Arrow keys to move</p>
          <p>Space: Start/Pause</p>
          <p>M: {soundsEnabled ? "Mute" : "Unmute"}</p>
        </div>
      )}
    </div>
  );
};

export default GameControls;
