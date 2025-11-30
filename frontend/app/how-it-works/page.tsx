'use client';

import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

export default function HowItWorks() {
  const router = useRouter();

  const steps = [
    {
      number: '01',
      title: 'Ask a Fun Question',
      description: 'Think of something people argue about in real life',
      examples: [
        'Will the hackathon start on time?',
        'Will my friend get a Hinge match today?',
        'Will the café run out of Maggi again?',
        'Will someone fall asleep during the demo?',
      ],
      footer: 'Type it out. Choose YES or NO. Set a time for when it ends.',
    },
    {
      number: '02',
      title: 'People Place Their Bets',
      description: 'Your friends (and randoms) pick a side and stake some APT tokens',
      points: [
        'It can be a small bet — even just a few cents',
        "It's like arguing, but with money on the line",
      ],
    },
    {
      number: '03',
      title: 'The Pool Grows',
      description: 'Every bet adds to the prize pool',
      points: [
        'We take a small 5% fee',
        'Most of that goes to you (the person who created the question)',
        'The rest helps run the platform',
      ],
    },
    {
      number: '04',
      title: "Time's Up — What Happened?",
      description: 'When time runs out, we check the real outcome',
      points: [
        'The winning side splits the prize money',
        'The losing side? Better luck next time',
      ],
    },
    {
      number: '05',
      title: 'You Get Paid for Hosting',
      description: 'The more people bet on your question, the more you earn',
      points: [
        'If your prediction gets popular, you get rewarded',
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-black relative overflow-hidden">
      {/* Animated background orbs - matching homepage */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-float-slower" />
      </div>

      <Navbar />

      <main className="relative z-10 pt-24 md:pt-32 px-4 md:px-8 max-w-4xl mx-auto pb-16">
        {/* Header */}
        <div className="text-center mb-16 md:mb-24">
          <h1 className="text-4xl md:text-6xl font-bold text-white font-(family-name:--font-space-grotesk) mb-4">
            How It Works
          </h1>
          <p className="text-gray-400 text-base md:text-lg font-(family-name:--font-space-grotesk) max-w-xl mx-auto">
            Five simple steps to turn your predictions into profit
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-16 md:space-y-24">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step number */}
              <div className="flex items-start gap-6 md:gap-8">
                <div className="shrink-0">
                  <div className="text-6xl md:text-7xl font-bold text-green-500/20 font-(family-name:--font-space-grotesk)">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-white font-(family-name:--font-space-grotesk) mb-3">
                    {step.title}
                  </h2>
                  <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-base md:text-lg mb-6">
                    {step.description}
                  </p>

                  {/* Examples */}
                  {step.examples && (
                    <div className="space-y-2 mb-6">
                      {step.examples.map((example, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 text-gray-500 font-(family-name:--font-space-grotesk) text-sm md:text-base"
                        >
                          <span className="text-green-500 mt-0.5">→</span>
                          <span>"{example}"</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Points */}
                  {step.points && (
                    <div className="space-y-2">
                      {step.points.map((point, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 text-gray-400 font-(family-name:--font-space-grotesk) text-sm md:text-base"
                        >
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  {step.footer && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <p className="text-green-400 font-(family-name:--font-space-grotesk) text-sm md:text-base">
                        {step.footer}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute left-8 top-20 w-px h-24 bg-white/10" />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-24 md:mt-32 text-center">
          <button
            onClick={() => router.push('/polls')}
            className="px-8 py-4 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-semibold rounded-full font-(family-name:--font-space-grotesk) text-base md:text-lg transition-all duration-300 hover:scale-105"
          >
            Start Creating Polls
          </button>
        </div>
      </main>
    </div>
  );
}
