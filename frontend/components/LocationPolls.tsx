'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Plus, Loader2 } from 'lucide-react';
import { calculateDistance, u64ToLatitude, u64ToLongitude } from '@/lib/utils';

interface LocationPollsProps {
  onCreateClick?: () => void;
}

interface Poll {
  title: string;
  option1: string;
  option2: string;
  latitude: number;
  longitude: number;
  pollTime: number;
  expiryTime: number;
  creator: string;
  index: number;
  total_option1_stake?: number;
  total_option2_stake?: number;
  option1_votes_count?: number;
  option2_votes_count?: number;
  is_finalized?: boolean;
  winning_option?: number;
  userVote?: {
    hasVoted: boolean;
    stakeAmount?: number;
    option?: number;
  };
}

export default function LocationPolls({ onCreateClick }: LocationPollsProps) {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [location, setLocation] = useState<string>('your location');
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyPolls, setNearbyPolls] = useState<Poll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [votingPoll, setVotingPoll] = useState<{ creator: string; index: number; option: number } | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteStatus, setVoteStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [voteError, setVoteError] = useState('');
  const [voteTransactionHash, setVoteTransactionHash] = useState('');
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // End poll states
  const [showEndPollModal, setShowEndPollModal] = useState(false);
  const [endingPoll, setEndingPoll] = useState<{ creator: string; index: number } | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<number>(0);
  const [pollStats, setPollStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [endPollStatus, setEndPollStatus] = useState<'idle' | 'loading' | 'confirming' | 'submitting' | 'success' | 'error'>('idle');
  const [endPollError, setEndPollError] = useState('');
  const [endPollTxHash, setEndPollTxHash] = useState('');

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getLocation = async () => {
      if (!('geolocation' in navigator)) {
        console.log('Geolocation not supported');
        setLoading(false);
        return;
      }

      try {
        // Set a shorter timeout to prevent long waits
        const timeoutId = setTimeout(() => {
          console.log('Location request taking too long, using default');
          setLoading(false);
        }, 3000); // 3 second timeout

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            clearTimeout(timeoutId);
            console.log('Location obtained:', position.coords);

            try {
              const { latitude, longitude } = position.coords;

              // Store user coordinates
              setUserCoords({ latitude, longitude });

              // Use reverse geocoding to get location name
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                {
                  headers: {
                    'User-Agent': 'Scout-App',
                  },
                }
              );

              if (!response.ok) {
                throw new Error('Failed to fetch location name');
              }

              const data = await response.json();
              console.log('Geocoding data:', data);

              // Extract city or town name
              const locationName =
                data.address?.city ||
                data.address?.town ||
                data.address?.village ||
                data.address?.suburb ||
                data.address?.county ||
                'your location';

              setLocation(locationName);
              setLoading(false);
            } catch (err) {
              console.error('Error fetching location name:', err);
              setLoading(false);
            }
          },
          (err) => {
            clearTimeout(timeoutId);
            console.error('Geolocation error:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);

            // Just use default location on any error
            setLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 300000, // Accept cached position up to 5 minutes old
          }
        );
      } catch (err) {
        console.error('Unexpected error:', err);
        setLoading(false);
      }
    };

    getLocation();
  }, []);

  // Fetch and filter nearby polls
  useEffect(() => {
    const fetchNearbyPolls = async () => {
      if (!userCoords) {
        setPollsLoading(false);
        return;
      }

      try {
        setPollsLoading(true);

        // Fetch all polls from MongoDB
        const response = await fetch('/api/polls/all');
        const data = await response.json();

        /* ==========================================
         * BLOCKCHAIN INTEGRATION (NOT HOOKED UP)
         * ==========================================
         * Below is an example of how to fetch polls directly from the Aptos blockchain
         * using the get_all_polls view function. This is currently commented out
         * as we're using MongoDB for better performance and off-chain caching.
         *
         * import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
         *
         * const config = new AptosConfig({ network: Network.TESTNET });
         * const aptos = new Aptos(config);
         * const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS!;
         *
         * // Fetch all polls from blockchain for a specific creator
         * const pollsFromBlockchain = await aptos.view({
         *   payload: {
         *     function: `${MODULE_ADDRESS}::polls::get_all_polls`,
         *     functionArguments: [creatorAddress], // Address of the poll creator
         *   },
         * });
         *
         * // The response will be an array of Poll structs with this structure:
         * // {
         * //   title: string,
         * //   option1: string,
         * //   option2: string,
         * //   latitude: u64,
         * //   longitude: u64,
         * //   poll_time: u64,
         * //   expiry_time: u64,
         * //   creator: address,
         * //   total_option1_stake: u64,
         * //   total_option2_stake: u64,
         * //   is_finalized: bool,
         * //   winning_option: u8,
         * // }
         *
         * // Note: To get ALL polls from ALL creators, you would need to:
         * // 1. Maintain an off-chain index of all poll creator addresses
         * // 2. Call get_all_polls for each creator
         * // 3. Combine the results
         * // This is why MongoDB is used for aggregation and querying
         * ========================================== */

        if (data.success && data.polls) {
          // Filter polls within 100m radius
          const filtered = data.polls.filter((poll: Poll) => {
            // Convert u64 coordinates back to decimal
            const pollLat = u64ToLatitude(poll.latitude);
            const pollLon = u64ToLongitude(poll.longitude);

            const distance = calculateDistance(
              userCoords.latitude,
              userCoords.longitude,
              pollLat,
              pollLon
            );

            // Show all polls within 100km: active, expired, and finalized
            // Creators can always see their expired polls to distribute rewards
            const now = Math.floor(Date.now() / 1000);
            const isActive = poll.expiryTime >= now;
            const isCreator = connected && account && poll.creator === account.address.toString();
            const isFinalized = poll.is_finalized;

            // Show poll if it's within distance and either active, finalized, or user is the creator
            return distance <= 100 && (isActive || isFinalized || isCreator);
          });

          // Check if user has voted on each poll
          if (connected && account) {
            /* ==========================================
             * BLOCKCHAIN INTEGRATION (NOT HOOKED UP)
             * ==========================================
             * Below is how to fetch user votes directly from blockchain
             * using the get_user_votes view function.
             *
             * // Fetch all votes for the current user from blockchain
             * const userVotesFromBlockchain = await aptos.view({
             *   payload: {
             *     function: `${MODULE_ADDRESS}::polls::get_user_votes`,
             *     functionArguments: [account.address.toString()],
             *   },
             * });
             *
             * // Returns array of Vote structs:
             * // {
             * //   voter: address,
             * //   poll_creator: address,
             * //   poll_index: u64,
             * //   option_voted: u8,
             * //   stake_amount: u64,
             * //   vote_time: u64,
             * // }
             *
             * // Then match votes to polls by comparing poll_creator and poll_index
             * ========================================== */

            const pollsWithVotes = await Promise.all(
              filtered.map(async (poll: Poll) => {
                try {
                  const voteResponse = await fetch('/api/votes/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      voter: account.address.toString(),
                      pollCreator: poll.creator,
                      pollIndex: poll.index,
                    }),
                  });
                  const voteData = await voteResponse.json();
                  return {
                    ...poll,
                    userVote: voteData.hasVoted ? voteData : { hasVoted: false },
                  };
                } catch (error) {
                  console.error('Error checking vote:', error);
                  return { ...poll, userVote: { hasVoted: false } };
                }
              })
            );
            setNearbyPolls(pollsWithVotes);
          } else {
            setNearbyPolls(filtered);
          }
        }
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        setPollsLoading(false);
      }
    };

    fetchNearbyPolls();
  }, [userCoords, connected, account]);

  const formatTimeRemaining = (expiryTime: number) => {
    const secondsRemaining = expiryTime - currentTime;

    if (secondsRemaining <= 0) return 'Expired';

    const days = Math.floor(secondsRemaining / (24 * 60 * 60));
    const hours = Math.floor((secondsRemaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((secondsRemaining % (60 * 60)) / 60);
    const seconds = secondsRemaining % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleVoteClick = (poll: Poll, option: number) => {
    if (!connected || !account) {
      alert('Please connect your wallet first');
      return;
    }

    // Check if user is trying to vote on their own poll
    if (poll.creator === account.address.toString()) {
      alert('You cannot vote on your own poll');
      return;
    }

    setVotingPoll({ creator: poll.creator, index: poll.index, option });
    setShowVoteModal(true);
    setVoteStatus('idle');
    setVoteError('');
    setVoteTransactionHash('');
  };

  const handleVoteSubmit = async () => {
    if (!votingPoll || !account) return;

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      setVoteStatus('error');
      setVoteError('Please enter a valid stake amount');
      return;
    }

    try {
      setIsVoting(true);
      setVoteStatus('submitting');
      setVoteError('');

      // Convert APT to Octas (1 APT = 100,000,000 Octas)
      const stakeInOctas = Math.floor(stake * 100000000);

      /* ==========================================
       * BLOCKCHAIN INTEGRATION - VOTE ON POLL
       * ==========================================
       * This transaction stakes APT tokens on a poll option.
       * The transaction calls the vote_on_poll entry function.
       *
       * Move Function Signature:
       * public entry fun vote_on_poll(
       *   voter: &signer,
       *   poll_creator: address,
       *   poll_index: u64,
       *   option: u8,
       *   stake_amount: u64,
       * )
       *
       * What happens on-chain:
       * 1. Validates the poll exists and is not expired
       * 2. Checks user hasn't already voted on this poll
       * 3. Transfers APT from voter to poll creator (escrow)
       * 4. Updates poll's total stake for the chosen option
       * 5. Records voter and stake in PollVoters for reward distribution
       * 6. Creates a Vote record in voter's VoteStore
       * 7. Emits a VoteCast event
       *
       * The vote is then cached in MongoDB for faster lookups.
       * ========================================== */

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${process.env.NEXT_PUBLIC_MODULE_ADDRESS}::polls::vote_on_poll`,
          typeArguments: [],
          functionArguments: [
            votingPoll.creator,
            votingPoll.index,
            votingPoll.option,
            stakeInOctas,
          ],
        },
      });

      setVoteTransactionHash(response.hash);

      // Save vote to MongoDB
      try {
        await fetch('/api/votes/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pollCreator: votingPoll.creator,
            pollIndex: votingPoll.index,
            voter: account.address.toString(),
            option: votingPoll.option,
            stakeAmount: stakeInOctas,
            transactionHash: response.hash,
          }),
        });
      } catch (dbError) {
        console.error('Error saving vote to database:', dbError);
      }

      setVoteStatus('success');

      // Refresh polls after short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error voting:', error);
      setVoteStatus('error');
      setVoteError(error instanceof Error ? error.message : 'Failed to submit vote');
    } finally {
      setIsVoting(false);
    }
  };

  const handleEndPollClick = async (poll: Poll) => {
    if (!account) return;

    setEndingPoll({ creator: poll.creator, index: poll.index });
    setShowEndPollModal(true);
    setEndPollStatus('idle');
    setSelectedWinner(0);
    setPollStats(null);
    setEndPollError('');
  };

  const handleWinnerSelection = async (option: number) => {
    if (!endingPoll) return;

    setSelectedWinner(option);
    setLoadingStats(true);
    setEndPollStatus('loading');

    try {
      // Fetch statistics for the selected winning option
      const response = await fetch('/api/polls/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollCreator: endingPoll.creator,
          pollIndex: endingPoll.index,
          winningOption: option,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPollStats(data.stats);
        setEndPollStatus('confirming');
      } else {
        setEndPollError('Failed to fetch statistics');
        setEndPollStatus('error');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setEndPollError('Failed to fetch statistics');
      setEndPollStatus('error');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleConfirmEndPoll = async () => {
    if (!endingPoll || !account || !selectedWinner) return;

    try {
      setEndPollStatus('submitting');
      setEndPollError('');

      /* ==========================================
       * BLOCKCHAIN INTEGRATION - FINALIZE POLL
       * ==========================================
       * This transaction finalizes a poll and distributes rewards to winners.
       * Only the poll creator can call this function.
       *
       * Move Function Signature:
       * public entry fun finalize_poll_and_distribute(
       *   host: &signer,
       *   poll_index: u64,
       *   winning_option: u8,
       * )
       *
       * What happens on-chain:
       * 1. Validates the caller is the poll creator
       * 2. Checks the poll hasn't already been finalized
       * 3. Marks the poll as finalized with the winning option
       * 4. Calculates the total pool (option1_stake + option2_stake)
       * 5. Retrieves all winners (voters who chose the winning option)
       * 6. Distributes rewards proportionally:
       *    reward = (winner_stake × total_pool) / total_winning_stake
       * 7. Transfers APT from poll creator to each winner
       * 8. Emits PollFinalized and RewardDistributed events
       *
       * Note: If no one voted for the winning option, the creator keeps all funds.
       * The finalization is then cached in MongoDB.
       * ========================================== */

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${process.env.NEXT_PUBLIC_MODULE_ADDRESS}::polls::finalize_poll_and_distribute`,
          typeArguments: [],
          functionArguments: [
            endingPoll.index,
            selectedWinner,
          ],
        },
      });

      setEndPollTxHash(response.hash);

      // Save finalization to MongoDB
      try {
        await fetch('/api/polls/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pollCreator: endingPoll.creator,
            pollIndex: endingPoll.index,
            winningOption: selectedWinner,
            transactionHash: response.hash,
          }),
        });
      } catch (dbError) {
        console.error('Error saving finalization to database:', dbError);
      }

      setEndPollStatus('success');

      // Refresh polls after short delay
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Error ending poll:', error);
      setEndPollStatus('error');
      setEndPollError(error instanceof Error ? error.message : 'Failed to end poll');
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-(family-name:--font-space-grotesk) text-white">
          {loading || pollsLoading ? (
            <span className="text-gray-400">Finding polls near you...</span>
          ) : nearbyPolls.length === 0 ? (
            <span className="text-white">
              No polls found.{' '}
              <span className="bg-linear-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                Be the first one to create
              </span>
            </span>
          ) : (
            <>
              <span className="text-white">{nearbyPolls.length} {nearbyPolls.length === 1 ? 'poll' : 'polls'} found around </span>
              <span className="bg-linear-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                {location}
              </span>
            </>
          )}
        </h1>
        {connected && onCreateClick && (
          <button
            onClick={onCreateClick}
            className="flex items-center justify-center gap-2 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-semibold px-4 md:px-6 py-2 md:py-3 rounded-full transition-all shadow-md hover:shadow-lg font-(family-name:--font-space-grotesk) shrink-0"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline">Create Poll</span>
            <span className="md:hidden">Create</span>
          </button>
        )}
      </div>

      {/* Poll Cards */}
      {!loading && !pollsLoading && nearbyPolls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {nearbyPolls.map((poll, index) => (
            <div
              key={index}
              className="group relative bg-linear-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-6 hover:border-green-500/60 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 backdrop-blur-sm"
            >
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-br from-green-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                {/* Poll Title */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <h3 className="text-xl md:text-2xl font-bold text-white font-(family-name:--font-space-grotesk) leading-tight">
                    {poll.title}
                  </h3>
                  {poll.is_finalized ? (
                    <span className="shrink-0 px-2.5 py-1 bg-gray-500/20 border border-gray-500/50 rounded-full text-gray-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                      POLL ENDED
                    </span>
                  ) : poll.expiryTime < currentTime ? (
                    <span className="shrink-0 px-2.5 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                      EXPIRED
                    </span>
                  ) : null}
                </div>

                {/* Progress Bar with Labels */}
                <div className="mb-6">
                  {(() => {
                    const option1Stake = poll.total_option1_stake || 0;
                    const option2Stake = poll.total_option2_stake || 0;
                    const totalStake = option1Stake + option2Stake;
                    const option1Percent = totalStake > 0 ? Math.round((option1Stake / totalStake) * 100) : 0;
                    const option2Percent = totalStake > 0 ? 100 - option1Percent : 0;

                    // Convert octas to APT for display (1 APT = 100,000,000 Octas)
                    const option1APT = (option1Stake / 100000000).toFixed(2);
                    const option2APT = (option2Stake / 100000000).toFixed(2);

                    return (
                      <>
                        <div className="flex h-3 rounded-full overflow-hidden shadow-lg mb-3 bg-black/30">
                          {totalStake > 0 ? (
                            <>
                              <div
                                className="bg-linear-to-r from-green-400 to-green-500 transition-all duration-500 ease-out"
                                style={{ width: `${option1Percent}%` }}
                              />
                              <div
                                className="bg-linear-to-r from-red-500 to-red-400 transition-all duration-500 ease-out"
                                style={{ width: `${option2Percent}%` }}
                              />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gray-700/50" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-linear-to-r from-green-400 to-green-500 shadow-md shadow-green-500/50 shrink-0" />
                              <span className="text-green-400 font-bold text-lg font-(family-name:--font-space-grotesk)">{option1Percent}%</span>
                              {poll.is_finalized && poll.winning_option === 1 && (
                                <span className="ml-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                  WINNER
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {poll.is_finalized && poll.winning_option === 2 && (
                                <span className="mr-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-xs font-semibold font-(family-name:--font-space-grotesk)">
                                  WINNER
                                </span>
                              )}
                              <span className="text-red-400 font-bold text-lg font-(family-name:--font-space-grotesk)">{option2Percent}%</span>
                              <div className="w-3 h-3 rounded-full bg-linear-to-r from-red-500 to-red-400 shadow-md shadow-red-500/50 shrink-0" />
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500 font-(family-name:--font-space-grotesk)">
                            <div className="flex items-center gap-1.5">
                              <span>{poll.option1_votes_count || 0} {(poll.option1_votes_count || 0) === 1 ? 'voter' : 'voters'}</span>
                              <span>•</span>
                              <span className="whitespace-nowrap">{option1APT} APT</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="whitespace-nowrap">{option2APT} APT</span>
                              <span>•</span>
                              <span>{poll.option2_votes_count || 0} {(poll.option2_votes_count || 0) === 1 ? 'voter' : 'voters'}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Option Buttons */}
                <div className="space-y-3 mb-5">
                  <div className="relative group/button">
                    <button
                      onClick={() => handleVoteClick(poll, 1)}
                      disabled={!connected || poll.creator === account?.address.toString() || poll.userVote?.hasVoted || poll.expiryTime < currentTime || poll.is_finalized}
                      className="w-full bg-linear-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border-2 border-green-500/50 hover:border-green-400/70 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 font-(family-name:--font-space-grotesk) shadow-lg shadow-green-500/10 hover:shadow-green-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {poll.option1}
                    </button>
                    {(poll.creator === account?.address.toString() || poll.userVote?.hasVoted || poll.expiryTime < currentTime || poll.is_finalized) && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/20 rounded-lg opacity-0 group-hover/button:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-10">
                        <p className="text-white text-xs font-(family-name:--font-space-grotesk)">
                          {poll.creator === account?.address.toString()
                            ? "You own this poll"
                            : poll.is_finalized
                              ? "Poll has ended"
                              : poll.expiryTime < currentTime
                                ? "Poll has expired"
                                : poll.userVote?.stakeAmount
                                  ? `Already staked ${(poll.userVote.stakeAmount / 100000000).toFixed(2)} APT`
                                  : "Already voted"
                          }
                        </p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
                      </div>
                    )}
                  </div>
                  <div className="relative group/button">
                    <button
                      onClick={() => handleVoteClick(poll, 2)}
                      disabled={!connected || poll.creator === account?.address.toString() || poll.userVote?.hasVoted || poll.expiryTime < currentTime || poll.is_finalized}
                      className="w-full bg-linear-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-2 border-red-500/50 hover:border-red-400/70 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 font-(family-name:--font-space-grotesk) shadow-lg shadow-red-500/10 hover:shadow-red-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {poll.option2}
                    </button>
                    {(poll.creator === account?.address.toString() || poll.userVote?.hasVoted || poll.expiryTime < currentTime || poll.is_finalized) && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/20 rounded-lg opacity-0 group-hover/button:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-10">
                        <p className="text-white text-xs font-(family-name:--font-space-grotesk)">
                          {poll.creator === account?.address.toString()
                            ? "You own this poll"
                            : poll.is_finalized
                              ? "Poll has ended"
                              : poll.expiryTime < currentTime
                                ? "Poll has expired"
                                : poll.userVote?.stakeAmount
                                  ? `Already staked ${(poll.userVote.stakeAmount / 100000000).toFixed(2)} APT`
                                  : "Already voted"
                          }
                        </p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Created by and Expires */}
                <div className="flex items-center justify-between text-gray-400 text-xs font-(family-name:--font-space-grotesk) pt-4 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                    <span className="text-gray-300">By {formatAddress(poll.creator)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-300">{formatTimeRemaining(poll.expiryTime)}</span>
                  </div>
                </div>

                {/* End Poll Button for Poll Creator */}
                {connected && account && poll.creator === account.address.toString() && !poll.is_finalized && (
                  <button
                    onClick={() => handleEndPollClick(poll)}
                    className={`w-full mt-4 border-2 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 font-(family-name:--font-space-grotesk) shadow-lg ${
                      poll.expiryTime < currentTime
                        ? 'bg-linear-to-r from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30 border-orange-500/50 hover:border-orange-400/70 shadow-orange-500/10 hover:shadow-orange-500/20'
                        : 'bg-linear-to-r from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 border-purple-500/50 hover:border-purple-400/70 shadow-purple-500/10 hover:shadow-purple-500/20'
                    }`}
                  >
                    {poll.expiryTime < currentTime ? '⚠️ Poll Expired - Distribute Rewards Now' : 'End Poll & Distribute Rewards'}
                  </button>
                )}

                {/* Finalized Badge */}
                {poll.is_finalized && (
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <p className="text-purple-400 font-semibold text-sm font-(family-name:--font-space-grotesk) text-center">
                      Poll Finalized - Option {poll.winning_option} Won
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vote Modal */}
      {showVoteModal && votingPoll && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-black/90 border border-green-500/30 rounded-2xl p-6 w-full max-w-md">
            {voteStatus === 'idle' || voteStatus === 'error' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk)">
                    Place Your Vote
                  </h2>
                  <button
                    onClick={() => {
                      setShowVoteModal(false);
                      setStakeAmount('');
                      setVotingPoll(null);
                      setVoteStatus('idle');
                      setVoteError('');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk) mb-2">
                      Voting for Option {votingPoll.option}
                    </p>
                    <p className="text-green-400 font-semibold text-lg font-(family-name:--font-space-grotesk)">
                      {votingPoll.option === 1
                        ? nearbyPolls.find(p => p.creator === votingPoll.creator && p.index === votingPoll.index)?.option1
                        : nearbyPolls.find(p => p.creator === votingPoll.creator && p.index === votingPoll.index)?.option2
                      }
                    </p>
                  </div>

                  {voteStatus === 'error' && voteError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm font-(family-name:--font-space-grotesk)">
                        {voteError}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-white font-medium font-(family-name:--font-space-grotesk) text-sm mb-2 block">
                      Stake Amount (APT)
                    </label>
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.1"
                      min="0"
                      step="0.01"
                      disabled={isVoting}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk) disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1 font-(family-name:--font-space-grotesk)">
                      Minimum: 0.01 APT
                    </p>
                  </div>

                  <button
                    onClick={handleVoteSubmit}
                    disabled={isVoting || !stakeAmount || parseFloat(stakeAmount) <= 0}
                    className="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-full transition-all font-(family-name:--font-space-grotesk)"
                  >
                    Submit Vote
                  </button>
                </div>
              </>
            ) : voteStatus === 'submitting' ? (
              <div className="text-center py-8">
                <h2 className="text-3xl font-bold text-white font-(family-name:--font-space-grotesk) mb-6">
                  Submitting Vote...
                </h2>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
                  <p className="text-gray-300 font-(family-name:--font-space-grotesk) text-lg">
                    Processing your vote on the blockchain
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <h2 className="text-3xl font-bold text-white font-(family-name:--font-space-grotesk) mb-6">
                  Vote Submitted!
                </h2>
                <div className="flex flex-col items-center gap-4">
                  <svg className="w-16 h-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-400 font-(family-name:--font-space-grotesk) text-lg font-semibold">
                    Your vote has been recorded successfully
                  </p>
                  {voteTransactionHash && (
                    <div className="space-y-2 mt-2">
                      <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm">
                        Transaction Hash
                      </p>
                      <p className="text-white font-(family-name:--font-space-grotesk) text-sm font-mono bg-white/5 px-4 py-2 rounded-lg break-all">
                        {voteTransactionHash.slice(0, 20)}...{voteTransactionHash.slice(-20)}
                      </p>
                      <a
                        href={`https://explorer.aptoslabs.com/txn/${voteTransactionHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-green-400 hover:text-green-300 font-(family-name:--font-space-grotesk) transition-colors underline text-sm"
                      >
                        <span>View Transaction</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk) mt-4">
                    Refreshing polls...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* End Poll Modal */}
      {showEndPollModal && endingPoll && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-black/90 border border-purple-500/30 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {endPollStatus === 'idle' ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk)">
                    End Poll & Distribute Rewards
                  </h2>
                  <button
                    onClick={() => {
                      setShowEndPollModal(false);
                      setEndingPoll(null);
                      setSelectedWinner(0);
                      setPollStats(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-gray-300 mb-6 font-(family-name:--font-space-grotesk)">
                  Select the winning option to calculate and distribute rewards to voters.
                </p>

                {endPollError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm font-(family-name:--font-space-grotesk)">{endPollError}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {nearbyPolls
                    .find((p) => p.creator === endingPoll.creator && p.index === endingPoll.index)
                    && (
                      <>
                        <button
                          onClick={() => handleWinnerSelection(1)}
                          className="w-full bg-linear-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border-2 border-green-500/50 hover:border-green-400/70 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 font-(family-name:--font-space-grotesk) text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg">
                              {
                                nearbyPolls.find(
                                  (p) => p.creator === endingPoll.creator && p.index === endingPoll.index
                                )?.option1
                              }
                            </span>
                            <span className="text-green-400 text-sm">Option 1</span>
                          </div>
                        </button>

                        <button
                          onClick={() => handleWinnerSelection(2)}
                          className="w-full bg-linear-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-2 border-red-500/50 hover:border-red-400/70 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 font-(family-name:--font-space-grotesk) text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg">
                              {
                                nearbyPolls.find(
                                  (p) => p.creator === endingPoll.creator && p.index === endingPoll.index
                                )?.option2
                              }
                            </span>
                            <span className="text-red-400 text-sm">Option 2</span>
                          </div>
                        </button>
                      </>
                    )}
                </div>
              </>
            ) : endPollStatus === 'loading' ? (
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-4">
                  Loading Statistics...
                </h2>
                <div className="flex justify-center">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              </div>
            ) : endPollStatus === 'confirming' && pollStats ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk)">
                    Confirm Distribution
                  </h2>
                  <button
                    onClick={() => {
                      setEndPollStatus('idle');
                      setSelectedWinner(0);
                      setPollStats(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Winning Option */}
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <p className="text-purple-400 font-semibold mb-2 font-(family-name:--font-space-grotesk)">
                      Winning Option
                    </p>
                    <p className="text-white text-xl font-bold font-(family-name:--font-space-grotesk)">
                      Option {selectedWinner}:{' '}
                      {
                        nearbyPolls.find(
                          (p) => p.creator === endingPoll.creator && p.index === endingPoll.index
                        )?.[selectedWinner === 1 ? 'option1' : 'option2']
                      }
                    </p>
                  </div>

                  {/* Total Pool */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-gray-400 text-sm mb-1 font-(family-name:--font-space-grotesk)">
                        Total Pool
                      </p>
                      <p className="text-white text-2xl font-bold font-(family-name:--font-space-grotesk)">
                        {(pollStats.totalPool / 100000000).toFixed(2)} APT
                      </p>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-gray-400 text-sm mb-1 font-(family-name:--font-space-grotesk)">
                        Winners
                      </p>
                      <p className="text-white text-2xl font-bold font-(family-name:--font-space-grotesk)">
                        {pollStats.winnersCount}
                      </p>
                    </div>
                  </div>

                  {/* Voting Stats */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-gray-400 text-sm mb-3 font-(family-name:--font-space-grotesk)">
                      Voting Breakdown
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-green-400 font-semibold font-(family-name:--font-space-grotesk)">
                          Option 1
                        </p>
                        <p className="text-white font-(family-name:--font-space-grotesk)">
                          {pollStats.option1VotesCount} votes
                        </p>
                        <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk)">
                          {(pollStats.totalOption1Stake / 100000000).toFixed(2)} APT
                        </p>
                      </div>
                      <div>
                        <p className="text-red-400 font-semibold font-(family-name:--font-space-grotesk)">
                          Option 2
                        </p>
                        <p className="text-white font-(family-name:--font-space-grotesk)">
                          {pollStats.option2VotesCount} votes
                        </p>
                        <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk)">
                          {(pollStats.totalOption2Stake / 100000000).toFixed(2)} APT
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reward Distribution */}
                  {pollStats.winnersCount > 0 ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl max-h-64 overflow-y-auto">
                      <p className="text-green-400 font-semibold mb-3 font-(family-name:--font-space-grotesk)">
                        Reward Distribution ({pollStats.winnersCount} winners)
                      </p>
                      <div className="space-y-2">
                        {pollStats.rewardsPerWinner.map((reward: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                          >
                            <span className="text-gray-300 text-sm font-mono">
                              {reward.voter.slice(0, 6)}...{reward.voter.slice(-4)}
                            </span>
                            <div className="text-right">
                              <p className="text-white font-semibold text-sm font-(family-name:--font-space-grotesk)">
                                {(reward.reward / 100000000).toFixed(4)} APT
                              </p>
                              <p className="text-gray-400 text-xs font-(family-name:--font-space-grotesk)">
                                Staked: {(reward.stake / 100000000).toFixed(2)} APT
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <p className="text-yellow-400 font-semibold font-(family-name:--font-space-grotesk)">
                        No winners for this option
                      </p>
                      <p className="text-gray-300 text-sm mt-1 font-(family-name:--font-space-grotesk)">
                        All funds will remain with the poll creator.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleConfirmEndPoll}
                  className="w-full bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-full transition-all font-(family-name:--font-space-grotesk)"
                >
                  Confirm & Distribute Rewards
                </button>
              </>
            ) : endPollStatus === 'submitting' ? (
              <div className="text-center py-8">
                <h2 className="text-3xl font-bold text-white font-(family-name:--font-space-grotesk) mb-6">
                  Finalizing Poll...
                </h2>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <p className="text-gray-300 font-(family-name:--font-space-grotesk) text-lg">
                    Distributing rewards on the blockchain
                  </p>
                </div>
              </div>
            ) : endPollStatus === 'success' ? (
              <div className="text-center py-8">
                <h2 className="text-3xl font-bold text-white font-(family-name:--font-space-grotesk) mb-6">
                  Poll Finalized!
                </h2>
                <div className="flex flex-col items-center gap-4">
                  <svg className="w-16 h-16 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-purple-400 font-(family-name:--font-space-grotesk) text-lg font-semibold">
                    Rewards distributed successfully!
                  </p>
                  {endPollTxHash && (
                    <div className="space-y-2 mt-2">
                      <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm">
                        Transaction Hash
                      </p>
                      <p className="text-white font-(family-name:--font-space-grotesk) text-sm font-mono bg-white/5 px-4 py-2 rounded-lg break-all">
                        {endPollTxHash.slice(0, 20)}...{endPollTxHash.slice(-20)}
                      </p>
                      <a
                        href={`https://explorer.aptoslabs.com/txn/${endPollTxHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 font-(family-name:--font-space-grotesk) transition-colors underline text-sm"
                      >
                        <span>View Transaction</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk) mt-4">
                    Refreshing polls...
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                  <p className="text-red-400 font-(family-name:--font-space-grotesk)">{endPollError}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEndPollModal(false);
                    setEndingPoll(null);
                    setEndPollStatus('idle');
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full transition-all font-(family-name:--font-space-grotesk)"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
