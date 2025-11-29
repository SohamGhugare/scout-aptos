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

  if (!connected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-24 md:pt-32 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white font-(family-name:--font-space-grotesk) mb-2">
              Portfolio
            </h1>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm md:text-base">
                {account?.address && (
                  <span className="text-green-400">{account.address.toString()}</span>
                )}
              </p>
              <button
                onClick={handleCopyAddress}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-(family-name:--font-space-grotesk) text-sm">Balance:</span>
              {loadingBalance ? (
                <span className="text-white font-(family-name:--font-space-grotesk)">Loading...</span>
              ) : (
                <>
                  <span className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk)">
                    {balance} <span className="text-lg text-green-400">APT</span>
                  </span>
                  <button
                    onClick={fetchBalance}
                    disabled={refreshing}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh balance"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-400 hover:text-white ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-full transition-all font-(family-name:--font-space-grotesk) font-medium"
          >
            Disconnect Wallet
          </button>
        </div>

        {/* Polls Created Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-4">
            Polls Created
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-400 font-(family-name:--font-space-grotesk)">
              No polls created yet
            </p>
          </div>
        </div>

        {/* Polls Participated Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-4">
            Polls Participated
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-400 font-(family-name:--font-space-grotesk)">
              No polls participated yet
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
