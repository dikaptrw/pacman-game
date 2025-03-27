import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <h1 className="text-4xl font-bold text-yellow-400 mb-8">Pacman Clone</h1>
      <Link
        href="/game"
        className="px-8 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors"
      >
        Play Game
      </Link>
    </main>
  );
}
