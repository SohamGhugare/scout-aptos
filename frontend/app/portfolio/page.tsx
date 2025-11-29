'use client';

import Navbar from '@/components/Navbar';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw, Trophy, Coins, ExternalLink } from 'lucide-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export default function Portfolio() {
  const { connected, disconnect, account } = useWallet();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState('');
  const [loadingUsername, setLoadingUsername] = useState(true);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  const fetchUsername = async () => {
    if (account?.address) {
      try {
        setLoadingUsername(true);
        const response = await fetch('/api/user/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: account.address.toString() }),
        });

        const data = await response.json();

        if (data.exists) {
          setUsername(data.username);
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      } finally {
        setLoadingUsername(false);
      }
    }
  };

  const fetchBalance = async () => {
    if (account?.address) {
      try {
        setRefreshing(true);
        const config = new AptosConfig({ network: Network.TESTNET });
        const aptos = new Aptos(config);

        const resources = await aptos.account.getAccountAPTAmount({
          accountAddress: account.address,
        });

        // Convert from Octas to APT (1 APT = 100,000,000 Octas)
        const aptBalance = (resources / 100000000).toFixed(4);
        setBalance(aptBalance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('0.0000');
      } finally {
        setLoadingBalance(false);
        setRefreshing(false);
      }
    }
  };

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
      console.log('Portfolio data received:', data);
      if (data.success) {
        setPortfolioData(data);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchUsername();
    fetchPortfolioData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAPT = (amount: number) => {
    return (amount / 100000000).toFixed(4);
  };

  const handleDisconnect = () => {
    disconnect();
    router.push('/');
  };

  const handleCopyAddress = async () => {
    if (account?.address) {
      await navigator.clipboard.writeText(account.address.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    // Show first 6 and last 4 characters on mobile, full on desktop
    return window.innerWidth < 768
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  };

  if (!connected) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-black">
      <Navbar />
      <main className="pt-20 md:pt-32 px-4 md:px-8 max-w-7xl mx-auto pb-8">
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-white font-(family-name:--font-space-grotesk) mb-4 md:mb-6">
            Portfolio
          </h1>

          {/* Wallet Info Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 mb-4">
            {/* Username */}
            {username && (
              <div className="mb-4">
                <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-xs md:text-sm mb-2">
                  Username
                </p>
                <p className="text-green-400 font-(family-name:--font-space-grotesk) text-lg md:text-2xl font-bold">
                  @{username}
                </p>
              </div>
            )}

            {/* Address */}
            <div className="mb-4">
              <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-xs md:text-sm mb-2">
                Wallet Address
              </p>
              <div className="flex items-center gap-2">
                <p className="text-green-400 font-(family-name:--font-space-grotesk) text-sm md:text-base font-medium break-all md:break-normal">
                  {account?.address && (
                    <span className="hidden md:inline">{account.address.toString()}</span>
                  )}
                  {account?.address && (
                    <span className="md:hidden">{formatAddress(account.address.toString())}</span>
                  )}
                </p>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Balance */}
            <div>
              <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-xs md:text-sm mb-2">
                Balance
              </p>
              {loadingBalance ? (
                <span className="text-white font-(family-name:--font-space-grotesk)">Loading...</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl md:text-3xl font-bold text-white font-(family-name:--font-space-grotesk)">
                    {balance} <span className="text-base md:text-xl text-green-400">APT</span>
                  </span>
                  <button
                    onClick={fetchBalance}
                    disabled={refreshing}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh balance"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-400 hover:text-white ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="w-full md:w-auto px-6 py-2.5 md:py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-full transition-all font-(family-name:--font-space-grotesk) font-medium text-sm md:text-base"
          >
            Disconnect Wallet
          </button>
        </div>

        {/* Polls Created Section */}
        <div className="mb-6 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-3 md:mb-4">
            Polls Hosted ({portfolioData?.hostedPolls?.length || 0})
          </h2>
          {loadingPortfolio ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : portfolioData?.hostedPolls?.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 text-center">
              <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm md:text-base">
                No polls hosted yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolioData?.hostedPolls?.map((poll: any, index: number) => (
                <div
                  key={index}
                  className="bg-white/5 border border-purple-500/30 rounded-2xl p-4 md:p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-white font-(family-name:--font-space-grotesk) mb-2">
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
                        ) : poll.expiryTime < Math.floor(Date.now() / 1000) ? (
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <span className="text-gray-300 font-mono truncate">
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
              ))}
            </div>
          )}
        </div>

        {/* Polls Participated Section */}
        <div className="mb-6 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-3 md:mb-4">
            Polls Participated ({portfolioData?.participatedPolls?.length || 0})
          </h2>
          {loadingPortfolio ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : portfolioData?.participatedPolls?.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 text-center">
              <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm md:text-base">
                No polls participated yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolioData?.participatedPolls?.map((item: any, index: number) => {
                const poll = item.poll;
                const vote = item.vote;
                const won = item.won;
                const reward = item.reward;

                return (
                  <div
                    key={index}
                    className={`bg-white/5 border rounded-2xl p-4 md:p-6 space-y-4 ${
                      poll.is_finalized
                        ? won
                          ? 'border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent'
                          : 'border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-white font-(family-name:--font-space-grotesk) mb-2">
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
                          ) : poll.expiryTime < Math.floor(Date.now() / 1000) ? (
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
                      <p className="text-white font-semibold font-(family-name:--font-space-grotesk) text-base md:text-lg">
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
                              <p className="text-white font-semibold font-(family-name:--font-space-grotesk) text-base md:text-lg">
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
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
