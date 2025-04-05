import { cn } from "@/utils";
import { useCallback, useEffect, useRef, useState } from "react";

export interface GamePlayerProps {
  className?: string;
  playerName?: string;
  isPlaying?: boolean;
  setPlayerName?: (val: string) => void;
  handleStartGame?: () => void;
}

export const DEFAULT_PLAYER_NAME = "Anonym";
const MAX_PLAYER_NAME_LENGTH = 10;

function GamePlayer({
  className,
  playerName,
  isPlaying,
  setPlayerName,
  handleStartGame,
}: GamePlayerProps) {
  const hiddenSpanRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(0);

  const savePlayerName = useCallback(() => {
    if (isPlaying && !!playerName) return;
    setPlayerName?.(playerName || DEFAULT_PLAYER_NAME);
  }, [playerName, setPlayerName, isPlaying]);

  useEffect(() => {
    if (hiddenSpanRef.current) {
      setWidth(hiddenSpanRef.current.offsetWidth - 5);
    }
  }, [playerName]);

  useEffect(() => {
    if (isPlaying && !playerName) {
      savePlayerName();
    }
  }, [isPlaying, playerName, savePlayerName]);

  const handleInputOnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Limit length client-side for immediate feedback
      const value = e.target.value;
      if (value.length <= MAX_PLAYER_NAME_LENGTH) {
        setPlayerName?.(value);
      }
    },
    [setPlayerName]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation(); // Prevent game controls from firing
      if (e.key === "Enter") {
        savePlayerName();
        handleStartGame?.();
        e.currentTarget.blur(); // Remove focus after Enter
      }
    },
    [savePlayerName, handleStartGame]
  );

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.stopPropagation(); // Prevent clicks from affecting game
      savePlayerName();
    },
    [savePlayerName]
  );

  return (
    <label className={cn("flex items-center gap-3 flex-1", className)}>
      {/* hidden span for input width calculation */}
      <span
        ref={hiddenSpanRef}
        className="absolute invisible whitespace-pre px-2"
      >
        {playerName || " "}
      </span>

      <span>Player name:</span>

      <input
        ref={inputRef}
        className="min-w-[50px] px-1 border-b focus:outline-none"
        type="text"
        style={{ width }}
        value={playerName}
        disabled={isPlaying}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        onChange={handleInputOnChange}
      />
    </label>
  );
}

export default GamePlayer;
