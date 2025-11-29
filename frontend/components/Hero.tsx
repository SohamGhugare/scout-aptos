'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-green-500/20 rounded-full blur-[120px] animate-[float-slow_20s_ease-in-out_infinite]"></div>
      <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] bg-emerald-500/20 rounded-full blur-[150px] animate-[float-slower_25s_ease-in-out_infinite]"></div>

      <div className="relative z-10">
        {/* Powered by Aptos Badge */}
        <div className="relative inline-flex items-center gap-2 px-6 py-3 bg-black/70 backdrop-blur-md border border-green-500/40 rounded-full mb-10 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full blur-sm"></div>
          <span className="relative text-base font-medium text-gray-200 font-[family-name:var(--font-space-grotesk)]">
            Powered by <span className="text-green-400 font-bold">Aptos</span>
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-8 font-[family-name:var(--font-space-grotesk)] leading-tight">
          <span className="block text-white mb-2">Bet on Vibes</span>
          <span className="block bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
            Not on News
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-[family-name:var(--font-space-grotesk)]">
          Transform your real-world presence into valuable predictions.<br />
          Scout the ground truth.
        </p>

        <Link href="/polls">
          <button className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-semibold px-10 py-5 rounded-xl transition-all font-[family-name:var(--font-space-grotesk)] text-lg group mx-auto">
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
          </button>
        </Link>

        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-20 h-20 border-2 border-green-500/30 rounded-full"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 border-2 border-emerald-500/30 rounded-full"></div>
      </div>

      {/* Live Polls indicator at bottom */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <span className="text-base font-semibold text-gray-300 font-[family-name:var(--font-space-grotesk)]">
            Live Polls
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-6 h-6 text-green-500 animate-bounce"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
  );
}
