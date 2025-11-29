'use client';

import Navbar from '@/components/Navbar';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export default function Portfolio() {
  const { connected, disconnect, account } = useWallet();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

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

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

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
            Polls Created
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm md:text-base">
              No polls created yet
            </p>
          </div>
        </div>

        {/* Polls Participated Section */}
        <div className="mb-6 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-3 md:mb-4">
            Polls Participated
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm md:text-base">
              No polls participated yet
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
