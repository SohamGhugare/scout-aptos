'use client';

import Navbar from "@/components/Navbar";
import LocationPolls from "@/components/LocationPolls";
import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { X, CheckCircle, ExternalLink } from "lucide-react";

export default function PollsPage() {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [minutes, setMinutes] = useState('');
  const [hours, setHours] = useState('');
  const [days, setDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'success'>('uploading');
  const [transactionHash, setTransactionHash] = useState('');

  const handleCreatePoll = async () => {
    if (!connected || !account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!pollTitle.trim() || !option1.trim() || !option2.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Validate expiry time - at least one field must be filled
    const mins = parseInt(minutes) || 0;
    const hrs = parseInt(hours) || 0;
    const dys = parseInt(days) || 0;

    if (mins === 0 && hrs === 0 && dys === 0) {
      setError('Please set an expiry time for the poll');
      return;
    }

    // Calculate expiry timestamp
    const totalMilliseconds = (mins * 60 * 1000) + (hrs * 60 * 60 * 1000) + (dys * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + totalMilliseconds);

    try {
      setIsSubmitting(true);
      setError('');
      setShowCreateModal(false);
      setShowUploadDialog(true);
      setUploadStatus('uploading');

      // Get user's current location
      let location = null;
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 300000,
            });
          });

          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (geoError) {
          console.log('Could not get location:', geoError);
          // Continue without location
        }
      }

      // Convert coordinates to unsigned integers by adding offset
      // Latitude range: -90 to +90, offset by 90 -> 0 to 180
      // Longitude range: -180 to +180, offset by 180 -> 0 to 360
      const latitudeU64 = location
        ? Math.floor((location.latitude + 90) * 1000000)
        : 90000000; // Default to equator (0 + 90 offset)

      const longitudeU64 = location
        ? Math.floor((location.longitude + 180) * 1000000)
        : 180000000; // Default to prime meridian (0 + 180 offset)

      // Sign and submit transaction
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${process.env.NEXT_PUBLIC_MODULE_ADDRESS}::polls::create_poll`,
          typeArguments: [],
          functionArguments: [
            pollTitle.trim(),
            option1.trim(),
            option2.trim(),
            latitudeU64,  // u64: (latitude + 90) * 1000000
            longitudeU64, // u64: (longitude + 180) * 1000000
            Math.floor(Date.now() / 1000), // Created at timestamp (current time in seconds)
            Math.floor(expiresAt.getTime() / 1000), // Expires at timestamp (future time in seconds)
          ],
        },
      });

      // Set transaction hash and update status
      setTransactionHash(response.hash);
      setUploadStatus('success');

      // Reset form
      setPollTitle('');
      setOption1('');
      setOption2('');
      setMinutes('');
      setHours('');
      setDays('');
    } catch (error) {
      console.error('Error creating poll:', error);
      setError('Failed to create poll');
      setShowUploadDialog(false);
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

              {/* Expiry Time */}
              <div>
                <label className="text-white font-medium font-(family-name:--font-space-grotesk) text-sm mb-2 block">
                  Expiry Time
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="Minutes"
                      min="0"
                      className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk) text-center"
                    />
                    <p className="text-xs text-gray-400 text-center mt-1 font-(family-name:--font-space-grotesk)">Minutes</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="Hours"
                      min="0"
                      className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk) text-center"
                    />
                    <p className="text-xs text-gray-400 text-center mt-1 font-(family-name:--font-space-grotesk)">Hours</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      placeholder="Days"
                      min="0"
                      className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk) text-center"
                    />
                    <p className="text-xs text-gray-400 text-center mt-1 font-(family-name:--font-space-grotesk)">Days</p>
                  </div>
                </div>
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

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-black/90 border border-green-500/30 rounded-2xl p-8 w-full max-w-md text-center">
            <h2 className="text-3xl font-bold text-white font-(family-name:--font-space-grotesk) mb-6">
              {uploadStatus === 'uploading' ? 'Brewing...' : 'You did it!'}
            </h2>

            <div className="space-y-6">
              {uploadStatus === 'uploading' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                  <p className="text-gray-300 font-(family-name:--font-space-grotesk) text-lg">
                    Uploading...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <CheckCircle className="w-16 h-16 text-green-400" />
                  <p className="text-green-400 font-(family-name:--font-space-grotesk) text-lg font-semibold">
                    Uploaded Successfully
                  </p>
                  {transactionHash && (
                    <div className="space-y-2">
                      <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm">
                        Transaction Hash
                      </p>
                      <p className="text-white font-(family-name:--font-space-grotesk) text-sm font-mono bg-white/5 px-4 py-2 rounded-lg break-all">
                        {transactionHash.slice(0, 20)}...{transactionHash.slice(-20)}
                      </p>
                      <a
                        href={`https://explorer.aptoslabs.com/txn/${transactionHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-green-400 hover:text-green-300 font-(family-name:--font-space-grotesk) transition-colors underline"
                      >
                        <span>View Transaction</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowUploadDialog(false);
                      setTransactionHash('');
                    }}
                    className="mt-4 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-semibold px-8 py-3 rounded-full transition-all font-(family-name:--font-space-grotesk)"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
