"use client";

import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <h1 className="text-4xl font-bold text-yellow-400 mb-6">Pacman</h1>
      <p className="text-white mb-8 text-center max-w-md">
        A modern implementation of the classic Pacman game using Next.js,
        TypeScript, and Tailwind CSS.
      </p>
      <Link
        href="/game"
        className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
      >
        Play Game
      </Link>
    </main>
  );
}
