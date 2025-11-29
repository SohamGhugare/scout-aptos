'use client';

import Navbar from "@/components/Navbar";
import LocationPolls from "@/components/LocationPolls";
import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { X, CheckCircle, ExternalLink, TrendingUp, Trophy, Coins } from "lucide-react";

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

  // Portfolio state
  const [activeTab, setActiveTab] = useState<'polls' | 'portfolio'>('polls');
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [portfolioView, setPortfolioView] = useState<'hosted' | 'participated'>('hosted');
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPortfolioData = async () => {
    if (!account) return;

    try {
      setLoadingPortfolio(true);
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account.address.toString() }),
      });

      const data = await response.json();
      if (data.success) {
        setPortfolioData(data);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  // Fetch portfolio data when switching to portfolio tab
  useEffect(() => {
    if (activeTab === 'portfolio' && connected && account) {
      fetchPortfolioData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, connected, account]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAPT = (amount: number) => {
    return (amount / 100000000).toFixed(4);
  };

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

      const latitudeU64 = location
        ? Math.floor((location.latitude + 90) * 1000000)
        : 90000000; 

      const longitudeU64 = location
        ? Math.floor((location.longitude + 180) * 1000000)
        : 180000000; 

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
            latitudeU64, 
            longitudeU64, 
            Math.floor(Date.now() / 1000),
            Math.floor(expiresAt.getTime() / 1000), 
          ],
        },
      });

      // Set transaction hash and update status
      setTransactionHash(response.hash);
      setUploadStatus('success');

      // Save poll to MongoDB
      try {
        await fetch('/api/polls/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pollTitle.trim(),
            option1: option1.trim(),
            option2: option2.trim(),
            latitude: latitudeU64,
            longitude: longitudeU64,
            pollTime: Math.floor(Date.now() / 1000),
            expiryTime: Math.floor(expiresAt.getTime() / 1000),
            creator: account.address.toString(),
            transactionHash: response.hash,
            total_option1_stake: 0,
            total_option2_stake: 0,
          }),
        });
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
      }

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
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-white/10">
            <button
              onClick={() => setActiveTab('polls')}
              className={`px-6 py-3 font-semibold font-(family-name:--font-space-grotesk) transition-all ${
                activeTab === 'polls'
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Nearby Polls
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-6 py-3 font-semibold font-(family-name:--font-space-grotesk) transition-all ${
                activeTab === 'portfolio'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My Portfolio
            </button>
          </div>

          {/* Polls Tab */}
          {activeTab === 'polls' && (
            <LocationPolls onCreateClick={() => setShowCreateModal(true)} />
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {!connected ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-(family-name:--font-space-grotesk)">
                    Please connect your wallet to view your portfolio
                  </p>
                </div>
              ) : loadingPortfolio ? (
                <div className="flex justify-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Portfolio View Toggle */}
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={() => setPortfolioView('hosted')}
                      className={`px-6 py-2.5 rounded-xl font-semibold font-(family-name:--font-space-grotesk) transition-all ${
                        portfolioView === 'hosted'
                          ? 'bg-purple-500/20 border-2 border-purple-500/50 text-purple-400'
                          : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 inline-block mr-2" />
                      Hosted Polls ({portfolioData?.hostedPolls?.length || 0})
                    </button>
                    <button
                      onClick={() => setPortfolioView('participated')}
                      className={`px-6 py-2.5 rounded-xl font-semibold font-(family-name:--font-space-grotesk) transition-all ${
                        portfolioView === 'participated'
                          ? 'bg-purple-500/20 border-2 border-purple-500/50 text-purple-400'
                          : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <Trophy className="w-4 h-4 inline-block mr-2" />
                      Participated Polls ({portfolioData?.participatedPolls?.length || 0})
                    </button>
                  </div>

                  {/* Hosted Polls View */}
                  {portfolioView === 'hosted' && (
                    <div className="space-y-4">
                      {portfolioData?.hostedPolls?.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-gray-400 font-(family-name:--font-space-grotesk)">
                            You haven't hosted any polls yet
                          </p>
                        </div>
                      ) : (
                        portfolioData?.hostedPolls?.map((poll: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white/5 border border-purple-500/30 rounded-2xl p-6 space-y-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-white font-(family-name:--font-space-grotesk) mb-2">
                                  {poll.title}
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 bg-white/10 rounded-full text-gray-300 text-xs font-(family-name:--font-space-grotesk)">
                                    {poll.totalVotes} votes
                                  </span>
                                  <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                    <Coins className="w-3 h-3 inline-block mr-1" />
                                    {formatAPT(poll.totalPool)} APT Pool
                                  </span>
                                  {poll.is_finalized ? (
                                    <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                      Finalized
                                    </span>
                                  ) : isMounted && poll.expiryTime < Math.floor(Date.now() / 1000) ? (
                                    <span className="px-2.5 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full text-orange-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                      Awaiting Distribution
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-blue-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                      Active
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white/5 rounded-xl p-4">
                                <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk) mb-1">
                                  Option 1: {poll.option1}
                                </p>
                                <p className="text-white font-semibold font-(family-name:--font-space-grotesk)">
                                  {poll.option1Votes} votes • {formatAPT(poll.totalOption1Stake)} APT
                                </p>
                              </div>
                              <div className="bg-white/5 rounded-xl p-4">
                                <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk) mb-1">
                                  Option 2: {poll.option2}
                                </p>
                                <p className="text-white font-semibold font-(family-name:--font-space-grotesk)">
                                  {poll.option2Votes} votes • {formatAPT(poll.totalOption2Stake)} APT
                                </p>
                              </div>
                            </div>

                            {poll.is_finalized && (
                              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Trophy className="w-5 h-5 text-green-400" />
                                  <h4 className="text-green-400 font-semibold font-(family-name:--font-space-grotesk)">
                                    Winning Option: {poll.winning_option === 1 ? poll.option1 : poll.option2}
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-gray-300 text-sm font-(family-name:--font-space-grotesk)">
                                    <span className="text-white font-semibold">{poll.winners.length}</span> winners received rewards
                                  </p>
                                  <p className="text-gray-400 text-xs font-(family-name:--font-space-grotesk)">
                                    Finalized: {formatTimestamp(poll.finalized_at?._seconds || Math.floor(Date.now() / 1000))}
                                  </p>
                                  {poll.finalization_tx_hash && (
                                    <a
                                      href={`https://explorer.aptoslabs.com/txn/${poll.finalization_tx_hash}?network=testnet`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-400 hover:text-green-300 text-xs font-(family-name:--font-space-grotesk) inline-flex items-center gap-1"
                                    >
                                      View Transaction <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>

                                {poll.winners.length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    <p className="text-gray-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                      Top Winners:
                                    </p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {poll.winners.slice(0, 5).map((winner: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between text-xs bg-white/5 rounded-lg p-2"
                                        >
                                          <span className="text-gray-300 font-(family-name:--font-space-grotesk) font-mono">
                                            {winner.voter.slice(0, 8)}...{winner.voter.slice(-6)}
                                          </span>
                                          <span className="text-green-400 font-semibold font-(family-name:--font-space-grotesk)">
                                            +{formatAPT(winner.reward)} APT
                                          </span>
                                        </div>
                                      ))}
                                      {poll.winners.length > 5 && (
                                        <p className="text-gray-500 text-xs text-center font-(family-name:--font-space-grotesk)">
                                          +{poll.winners.length - 5} more winners
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Participated Polls View */}
                  {portfolioView === 'participated' && (
                    <div className="space-y-4">
                      {portfolioData?.participatedPolls?.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-gray-400 font-(family-name:--font-space-grotesk)">
                            You haven't participated in any polls yet
                          </p>
                        </div>
                      ) : (
                        portfolioData?.participatedPolls?.map((item: any, index: number) => {
                          const poll = item.poll;
                          const vote = item.vote;
                          const won = item.won;
                          const reward = item.reward;

                          return (
                            <div
                              key={index}
                              className={`bg-white/5 border rounded-2xl p-6 space-y-4 ${
                                poll.is_finalized
                                  ? won
                                    ? 'border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent'
                                    : 'border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent'
                                  : 'border-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-white font-(family-name:--font-space-grotesk) mb-2">
                                    {poll.title}
                                  </h3>
                                  <div className="flex gap-2 flex-wrap">
                                    {poll.is_finalized ? (
                                      won ? (
                                        <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                          <Trophy className="w-3 h-3 inline-block mr-1" />
                                          You Won!
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                          Lost
                                        </span>
                                      )
                                    ) : isMounted && poll.expiryTime < Math.floor(Date.now() / 1000) ? (
                                      <span className="px-2.5 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full text-orange-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                        Awaiting Results
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-blue-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                        Active
                                      </span>
                                    )}
                                    <span className="px-2.5 py-1 bg-white/10 rounded-full text-gray-300 text-xs font-(family-name:--font-space-grotesk)">
                                      Staked: {formatAPT(vote.stakeAmount)} APT
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white/5 rounded-xl p-4">
                                <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk) mb-2">
                                  Your Vote
                                </p>
                                <p className="text-white font-semibold font-(family-name:--font-space-grotesk) text-lg">
                                  {vote.option === 1 ? poll.option1 : poll.option2}
                                </p>
                              </div>

                              {poll.is_finalized && (
                                <div className={`rounded-xl p-4 border ${
                                  won
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-red-500/10 border-red-500/30'
                                }`}>
                                  <div className="space-y-2">
                                    <p className={`font-semibold font-(family-name:--font-space-grotesk) ${
                                      won ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      Winning Option: {poll.winning_option === 1 ? poll.option1 : poll.option2}
                                    </p>
                                    {won && reward > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Coins className="w-5 h-5 text-green-400" />
                                        <p className="text-white font-semibold font-(family-name:--font-space-grotesk) text-lg">
                                          Reward: +{formatAPT(reward)} APT
                                        </p>
                                      </div>
                                    )}
                                    {won && (
                                      <p className="text-gray-400 text-xs font-(family-name:--font-space-grotesk)">
                                        Profit: +{formatAPT(reward - vote.stakeAmount)} APT ({((reward / vote.stakeAmount - 1) * 100).toFixed(2)}%)
                                      </p>
                                    )}
                                    {!won && (
                                      <p className="text-gray-400 text-xs font-(family-name:--font-space-grotesk)">
                                        Your stake of {formatAPT(vote.stakeAmount)} APT was lost
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {vote.transactionHash && (
                                <a
                                  href={`https://explorer.aptoslabs.com/txn/${vote.transactionHash}?network=testnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-400 hover:text-purple-300 text-xs font-(family-name:--font-space-grotesk) inline-flex items-center gap-1"
                                >
                                  View Vote Transaction <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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
