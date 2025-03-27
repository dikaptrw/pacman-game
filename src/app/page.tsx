import React from "react";
import GameBoard from "@/components/GameBoard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="scale-[65%] sm:scale-100">
        <GameBoard />
      </div>
    </main>
  );
}
