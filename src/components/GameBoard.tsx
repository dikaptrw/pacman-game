"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { GameSettings, Cell } from "@/types/game";
import { createMaze, countDots } from "@/utils/maze";
import { usePacman } from "@/hooks/usePacman";
import { useGhost } from "@/hooks/useGhost";
import { useGameState } from "@/hooks/useGameState";
import { useSounds } from "@/hooks/useSounds";
import { useTouchControls } from "@/hooks/useTouchControls";
import GameRenderer from "@/components/GameRenderer";
import useDevice from "@/hooks/useDevice";
import GamePlayer from "./GamePlayer";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "@firebase/firestore";
import db from "@/utils/firestore";
import { ENV } from "@/constants";

// Game settings
const gameSettings: GameSettings = {
  cellSize: 16,
  pacmanMoveTime: 200, // ms per cell
  ghostMoveTime: 250, // ms per cell
  frightenedGhostMoveTime: 400, // ms per cell
  powerModeDuration: 8000,
  minDragDistance: 10,
  highScoreStorageKey: "pacmanHighScore",
  highScorePlayerStorageKey: "pacmanHighScorePlayer",
  pacmanLives: 3,
};

const GameBoard: React.FC = () => {
  const { isMobile } = useDevice();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameBoardRef = useRef<HTMLDivElement>(null);

  // Initialize maze
  const [maze, setMaze] = React.useState<Cell[][]>(createMaze());
  const [dotsRemaining, setDotsRemaining] = React.useState<number>(
    countDots(createMaze())
  );

  // Initialize score
  const [score, setScore] = React.useState<number>(0);
  const [highScore, setHighScore] = React.useState<number>(0);
  const [highScorePlayer, setHighScorePlayer] = React.useState<string>("");
  const [playerName, setPlayerName] = React.useState<string>("");
  const collectionRef = useMemo(() => {
    return collection(db, "dikaptrw-profile", ENV, "games");
  }, []);
  const docRef = useMemo(() => {
    return doc(collectionRef, process.env.NEXT_PUBLIC_PAC_MAN_GAME_DOC_ID);
  }, [collectionRef]);

  // Use custom hooks
  const { soundsEnabled, playSound, stopSound, toggleSounds } = useSounds();

  const {
    gameState,
    setGameState,
    level,
    powerMode,
    setPowerMode,
    powerModeTimer,
    setPowerModeTimer,
    visualEffects,
    lastTimeRef,
    animationFrameRef,
    addVisualEffect,
    startGhostModeCycling,
    nextLevel,
    resetGame,
  } = useGameState();

  const {
    ghosts,
    setGhosts,
    ghostsEaten,
    setGhostsEaten,
    moveGhosts,
    resetGhostPositions,
    toggleGhostMode,
    resetGhosts,
  } = useGhost({
    maze,
    gameState,
    pacmanPosition: { row: 0, col: 0 }, // Will be updated in the game loop
    pacmanDirection: "none", // Will be updated in the game loop
    ghostMoveTime: gameSettings.ghostMoveTime,
    frightenedGhostMoveTime: gameSettings.frightenedGhostMoveTime,
    level,
    powerMode,
  });

  const {
    pacman,
    setPacman,
    movePacman,
    handleKeyDown,
    resetPacman,
    areMovingBetweenSameCells,
    decreaseLives,
    resetPacmanPosition,
  } = usePacman({
    maze,
    gameState,
    pacmanMoveTime: gameSettings.pacmanMoveTime,
    addVisualEffect,
    setDotsRemaining,
    setScore,
    setPowerMode,
    setGhosts,
    setGhostsEaten,
    setMaze,
    playSound,
    stopSound,
    ghostsEaten,
    level,
    powerModeTimer,
    setPowerModeTimer,
    frightenedGhostMoveTime: gameSettings.frightenedGhostMoveTime,
    ghostMoveTime: gameSettings.ghostMoveTime,
    powerModeDuration: gameSettings.powerModeDuration,
    pacmanLives: gameSettings.pacmanLives,
  });

  const { isMobileDevice, setupTouchListeners } = useTouchControls({
    minDragDistance: gameSettings.minDragDistance,
    onDirectionChange: (direction) => {
      setPacman((prev) => ({ ...prev, nextDirection: direction }));
    },
    onGameAction: () => {
      handleGameControls();
    },
  });

  // Set up touch event listeners
  useEffect(() => {
    if (canvasRef.current) {
      return setupTouchListeners(canvasRef.current);
    }
  }, [setupTouchListeners]);

  // Handle game start
  const handleStartGame = useCallback(() => {
    setGameState("playing");
    playSound("start");
    startGhostModeCycling(toggleGhostMode);
  }, [playSound, setGameState, startGhostModeCycling, toggleGhostMode]);

  // Handle game reset
  const handleResetGame = useCallback(() => {
    resetGame();
    resetPacman();
    resetGhosts();
    setMaze(createMaze());
    setDotsRemaining(countDots(createMaze()));
    setScore(0);
  }, [resetGame, resetPacman, resetGhosts]);

  // Handle game pause
  const handlePauseGame = useCallback(() => {
    setGameState("paused");
  }, [setGameState]);

  // Handle game controls
  const handleGameControls = useCallback(() => {
    if (gameState === "ready" || gameState === "paused") {
      handleStartGame();
    } else if (gameState === "playing") {
      handlePauseGame();
    } else if (gameState === "game-over") {
      handleResetGame();
    }
  }, [gameState, handlePauseGame, handleResetGame, handleStartGame]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyboardInput = (e: KeyboardEvent) => {
      // Game controls
      if (e.key === " " || e.key === "Enter") {
        handleGameControls();
        return;
      }

      // Toggle sound with 'M' key
      if (e.key === "m" || e.key === "M") {
        toggleSounds();
        return;
      }

      // Movement controls
      handleKeyDown(e);
    };

    window.addEventListener("keydown", handleKeyboardInput);
    return () => {
      window.removeEventListener("keydown", handleKeyboardInput);
    };
  }, [
    gameState,
    handleKeyDown,
    playSound,
    resetGame,
    resetPacman,
    resetGhosts,
    setGameState,
    startGhostModeCycling,
    toggleGhostMode,
    toggleSounds,
    handleGameControls,
  ]);

  // Handle high score update on firestore
  const updateHighScoreFirestore = useCallback(
    ({
      highScore,
      highScorePlayer,
    }: {
      highScore: number;
      highScorePlayer: string;
    }) => {
      getDoc(docRef).then((res) => {
        if (res.exists()) {
          updateDoc(docRef, {
            highScore: Math.floor(highScore),
            playerName: highScorePlayer,
          });
        } else {
          setDoc(docRef, {
            highScore: Math.floor(highScore),
            playerName: highScorePlayer,
          });
        }
      });
    },
    [docRef]
  );

  // Check for collisions between Pacman and ghosts
  const checkGhostCollisions = useCallback(() => {
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
          pacman.direction !== "none" &&
          ghost.direction !== "none" &&
          pacman.direction === getOppositeDirection(ghost.direction) &&
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
                    speed: gameSettings.ghostMoveTime * (1 - level * 0.05),
                  }
                : g
            )
          );
        } else {
          // Pacman loses a life
          playSound("death");

          // Add death visual effect
          addVisualEffect("death", pacman.position);

          decreaseLives();

          if (pacman.lives <= 1) {
            // Game over
            setGameState("game-over");

            // Update high score if needed
            if (score > highScore) {
              if (process.env.NEXT_PUBLIC_HIGH_SCORE_MODE === "firestore") {
                updateHighScoreFirestore({
                  highScore: score,
                  highScorePlayer: playerName,
                });
              } else {
                // Save high score to local storage
                localStorage.setItem(
                  gameSettings.highScoreStorageKey,
                  score.toString()
                );
                localStorage.setItem(
                  gameSettings.highScorePlayerStorageKey,
                  playerName.toString()
                );
              }
              setHighScore(score);
              setHighScorePlayer(playerName);
            }
          } else {
            // Reset positions but continue game
            setTimeout(() => {
              resetPacmanPosition();
              resetGhostPositions();
              setGameState("ready");
            }, 1000);

            setGameState("paused");
          }
        }
      }
    });
  }, [
    addVisualEffect,
    areMovingBetweenSameCells,
    decreaseLives,
    ghosts,
    ghostsEaten,
    highScore,
    level,
    pacman,
    playSound,
    resetGhostPositions,
    resetPacmanPosition,
    score,
    setGameState,
    setGhosts,
    setGhostsEaten,
    playerName,
    updateHighScoreFirestore,
  ]);

  // Helper function to get the opposite direction
  const getOppositeDirection = (
    direction: "up" | "down" | "left" | "right" | "none"
  ): "up" | "down" | "left" | "right" | "none" => {
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

  // Check if level is complete (all dots eaten)
  useEffect(() => {
    if (dotsRemaining === 0 && gameState === "playing") {
      // Level complete
      setGameState("win");

      // Advance to next level after a delay
      setTimeout(() => {
        nextLevel();
        resetPacmanPosition();
        resetGhosts();
        setMaze(createMaze());
        setDotsRemaining(countDots(createMaze()));
      }, 3000);
    }
  }, [
    dotsRemaining,
    gameState,
    nextLevel,
    resetGhosts,
    resetPacmanPosition,
    setGameState,
  ]);

  // Load high score from localStorage on mount
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_HIGH_SCORE_MODE === "firestore") {
      getDoc(docRef).then((res) => {
        const data = res.data();

        if (data) {
          setHighScore(data.highScore);
          setHighScorePlayer(data.playerName);
        }
      });

      // Listen for changes in the Firestore document
      const unsubscribe = onSnapshot(docRef, (data) => {
        setHighScore(data.data()?.highScore || highScore);
        setHighScorePlayer(data.data()?.playerName || highScorePlayer);
      });

      // Cleanup the listener when the component unmounts
      return () => unsubscribe();
    } else {
      const storedHighScore = localStorage.getItem(
        gameSettings.highScoreStorageKey
      );
      const storedHighScorePlayer = localStorage.getItem(
        gameSettings.highScorePlayerStorageKey
      );

      setHighScore(storedHighScore ? parseInt(storedHighScore, 10) : highScore);
      setHighScorePlayer(storedHighScorePlayer || highScorePlayer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [
    gameState,
    maze,
    ghosts,
    pacman,
    movePacman,
    moveGhosts,
    checkGhostCollisions,
    animationFrameRef,
    lastTimeRef,
  ]);

  return (
    <div className="relative flex flex-col items-center" ref={gameBoardRef}>
      <div className="mb-4 flex w-full justify-between items-center">
        <div className="text-white">
          <span className="mr-4">
            LEVEL: <span className="text-yellow-400">{level}</span>
          </span>
        </div>
        <div className="text-white">
          <span className="mr-4">1UP</span>
          <span id="score">{score}</span>
        </div>
        <div className="text-white">
          <span className="mr-2">HIGH SCORE:</span>
          <span className="text-yellow-400">{highScore}</span>
          {highScorePlayer && (
            <span className="text-xs pl-1">({highScorePlayer})</span>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="border-2 border-white"
        width={448}
        height={496}
      />

      <GameRenderer
        canvasRef={canvasRef}
        maze={maze}
        pacman={pacman}
        ghosts={ghosts}
        visualEffects={visualEffects}
        gameState={gameState}
        score={score}
        highScore={highScore}
        level={level}
        cellSize={gameSettings.cellSize}
        isMobileDevice={isMobileDevice}
        soundsEnabled={soundsEnabled}
      />

      <div className="flex items-center justify-between w-full mt-4">
        <GamePlayer
          handleStartGame={handleStartGame}
          playerName={playerName}
          setPlayerName={setPlayerName}
          isPlaying={gameState === "playing"}
        />

        <div className="flex">
          {Array.from({ length: pacman.lives }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 bg-yellow-400 rounded-full mx-1"
            ></div>
          ))}
        </div>
      </div>

      <div className="mt-3.5 text-white text-sm flex justify-between w-full max-w-md">
        <p>
          {isMobile
            ? "Controls: Swipe screen to move"
            : "Controls: Arrow keys to move"}
        </p>
        <p>{isMobile ? "Touch: Start the game" : "Space: Start/Pause"}</p>

        {!isMobile && <p>M: {soundsEnabled ? "Mute" : "Unmute"}</p>}
      </div>
    </div>
  );
};

export default GameBoard;
