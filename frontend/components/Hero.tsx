'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [pollCount, setPollCount] = useState<number>(0);

  useEffect(() => {
    const fetchPollCount = async () => {
      try {
        const response = await fetch('/api/polls/count');
        const data = await response.json();
        if (data.success) {
          setPollCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching poll count:', error);
      }
    };

    fetchPollCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPollCount, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute -top-20 md:-top-32 -left-20 md:-left-32 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-green-500/20 rounded-full blur-[80px] md:blur-[120px] animate-[float-slow_20s_ease-in-out_infinite]"></div>
      <div className="absolute -bottom-20 md:-bottom-32 -right-20 md:-right-32 w-[350px] md:w-[700px] h-[350px] md:h-[700px] bg-emerald-500/20 rounded-full blur-[100px] md:blur-[150px] animate-[float-slower_25s_ease-in-out_infinite]"></div>

      <div className="relative z-10 mt-16 md:mt-0">
        {/* Powered by Aptos Badge */}
        <div className="relative inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-black/70 backdrop-blur-md border border-green-500/40 rounded-full mb-6 md:mb-10 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <div className="absolute inset-0 bg-linear-to-r from-green-500/10 to-emerald-500/10 rounded-full blur-sm"></div>
          <span className="relative text-sm md:text-base font-medium text-gray-200 font-(family-name:--font-space-grotesk)">
            Powered by <span className="text-green-400 font-bold">Aptos</span>
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-6 md:mb-8 font-(family-name:--font-space-grotesk) leading-tight px-4">
          <span className="block text-white mb-2">Bet on Moments</span>
          <span className="block bg-linear-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
            Not on News
          </span>
        </h1>

        <p className="text-gray-400 text-base md:text-lg lg:text-xl mb-8 md:mb-12 max-w-2xl mx-auto font-(family-name:--font-space-grotesk) px-4">
          Transform your real-world presence into valuable predictions.<br />
          Scout the ground truth.
        </p>

        <Link href="/polls">
          <button className="flex items-center gap-2 md:gap-3 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-semibold px-8 md:px-10 py-4 md:py-5 rounded-xl transition-all font-(family-name:--font-space-grotesk) text-base md:text-lg group mx-auto">
            Get Started
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-2 transition-transform duration-300" />
          </button>
        </Link>

        {/* Decorative elements - hidden on mobile */}
        <div className="hidden md:block absolute -top-10 -left-10 w-20 h-20 border-2 border-green-500/30 rounded-full"></div>
        <div className="hidden md:block absolute -bottom-10 -right-10 w-32 h-32 border-2 border-emerald-500/30 rounded-full"></div>
      </div>

      {/* Live Polls indicator at bottom */}
      <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2.5 md:w-3 h-2.5 md:h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-2.5 md:w-3 h-2.5 md:h-3 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <span className="text-sm md:text-base font-semibold text-gray-300 font-(family-name:--font-space-grotesk)">
            {pollCount > 0 ? `${pollCount} Live Polls` : 'Live Polls'}
          </span>
        </div>
      </div>
    </div>
  );
}
