'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent font-[family-name:var(--font-orbitron)]">
              Scout
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <button className="text-white hover:text-gray-300 transition-colors font-medium font-[family-name:var(--font-inter)]">
              How it Works
            </button>
            <Link href="/polls">
              <button className="text-white hover:text-gray-300 transition-colors font-medium font-[family-name:var(--font-inter)]">
                Polls
              </button>
            </Link>
            <button className="bg-white hover:bg-gray-200 text-black font-semibold px-6 py-2 rounded-full transition-all shadow-md hover:shadow-lg font-[family-name:var(--font-inter)]">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
