"use client";

import React, { useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import Link from "next/link";

export default function GamePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="mb-4 flex w-full justify-between">
        <Link href="/" className="text-white hover:text-yellow-400">
          &larr; Back
        </Link>
        <div className="text-white">
          <span className="mr-4">1UP</span>
          <span id="score">0</span>
        </div>
      </div>
      <GameBoard />
    </div>
  );
}
