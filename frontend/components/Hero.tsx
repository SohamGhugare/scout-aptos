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
        <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-8 font-[family-name:var(--font-space-grotesk)] leading-tight">
          <span className="block text-white mb-2">Bet on Vibes</span>
          <span className="block bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
            Not on News
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-[family-name:var(--font-space-grotesk)]">
          Transform your real-world presence into valuable predictions. Scout the ground truth.
        </p>

        <Link href="/polls">
          <button className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-10 py-5 rounded-full transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.5)] font-[family-name:var(--font-space-grotesk)] text-lg group mx-auto">
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
          </button>
        </Link>

        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-20 h-20 border-2 border-green-500/30 rounded-full"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 border-2 border-emerald-500/30 rounded-full"></div>
      </div>
    </div>
  );
}
