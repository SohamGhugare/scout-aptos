'use client';

import Navbar from "@/components/Navbar";
import LocationPolls from "@/components/LocationPolls";
import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { X, CheckCircle } from "lucide-react";

export default function PollsPage() {
  const { connected, account } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleCreatePoll = async () => {
    if (!connected || !account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!pollTitle.trim() || !option1.trim() || !option2.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/polls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: account.address.toString(),
          title: pollTitle.trim(),
          options: [option1.trim(), option2.trim()],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form and close modal
        setPollTitle('');
        setOption1('');
        setOption2('');
        setShowCreateModal(false);

        // Show success toast
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);

        // TODO: Refresh polls list
      } else {
        setError(data.error || 'Failed to create poll');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      setError('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-black">
      <Navbar />
      <main className="pt-32 px-4">
        <div className="max-w-6xl mx-auto py-12">
          <LocationPolls onCreateClick={() => setShowCreateModal(true)} />
        </div>
      </main>

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-black/90 border border-green-500/30 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk)">
                Create New Poll
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Poll Title */}
              <div>
                <label className="text-white font-medium font-(family-name:--font-space-grotesk) text-sm mb-2 block">
                  Poll Title
                </label>
                <input
                  type="text"
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="C'mon, be creative.."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk)"
                  maxLength={200}
                />
              </div>

              {/* Option 1 */}
              <div>
                <label className="text-white font-medium font-(family-name:--font-space-grotesk) text-sm mb-2 block">
                  Option 1
                </label>
                <input
                  type="text"
                  value={option1}
                  onChange={(e) => setOption1(e.target.value)}
                  placeholder="First option"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk)"
                  maxLength={100}
                />
              </div>

              {/* Option 2 */}
              <div>
                <label className="text-white font-medium font-(family-name:--font-space-grotesk) text-sm mb-2 block">
                  Option 2
                </label>
                <input
                  type="text"
                  value={option2}
                  onChange={(e) => setOption2(e.target.value)}
                  placeholder="Second option"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk)"
                  maxLength={100}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-(family-name:--font-space-grotesk)">
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleCreatePoll}
                disabled={isSubmitting || !pollTitle.trim() || !option1.trim() || !option2.trim()}
                className="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-full transition-all font-(family-name:--font-space-grotesk)"
              >
                {isSubmitting ? 'Creating...' : 'Create Poll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-100 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-4 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-white font-(family-name:--font-space-grotesk) font-medium">
                Poll created successfully!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
