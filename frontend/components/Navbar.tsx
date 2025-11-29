'use client';

import Link from 'next/link';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useState } from 'react';

export default function Navbar() {
  const { connect, disconnect, account, connected, wallets, network } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const handleConnect = async (walletName: string) => {
    try {
      connect(walletName);
      setShowWalletModal(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = () => {
    try {
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-linear-to-r from-green-400 to-green-500 bg-clip-text text-transparent font-(family-name:--font-space-grotesk)">
                Scout
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <button className="text-white hover:text-gray-300 transition-colors font-medium font-(family-name:--font-space-grotesk)">
                How it Works
              </button>
              <Link href="/polls">
                <button className="text-white hover:text-gray-300 transition-colors font-medium font-(family-name:--font-space-grotesk)">
                  Polls
                </button>
              </Link>

              {/* Network Selector */}
              <button
                onClick={() => setShowNetworkModal(!showNetworkModal)}
                className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors font-(family-name:--font-space-grotesk) font-medium"
              >
                {network?.name || 'Testnet'}
              </button>

              {/* Wallet Connect Button */}
              {!connected ? (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="bg-white hover:bg-gray-200 text-black font-semibold px-6 py-2 rounded-full transition-all shadow-md hover:shadow-lg font-(family-name:--font-space-grotesk)"
                >
                  Connect Wallet
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-semibold px-6 py-2 rounded-full transition-all shadow-md hover:shadow-lg font-(family-name:--font-space-grotesk)"
                >
                  {account?.address ? formatAddress(account.address.toString()) : 'Connected'}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-black/90 border border-green-500/30 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk)">
                Connect Wallet
              </h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {wallets && wallets.length > 0 ? (
                wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet.name)}
                    className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-(family-name:--font-space-grotesk)"
                  >
                    {wallet.icon && (
                      <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded-lg" />
                    )}
                    <span className="text-white font-medium">{wallet.name}</span>
                  </button>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8 font-(family-name:--font-space-grotesk)">
                  No wallets detected. Please install a wallet extension.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Selection Modal */}
      {showNetworkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-black/90 border border-green-500/30 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk)">
                Select Network
              </h2>
              <button
                onClick={() => setShowNetworkModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  window.location.reload();
                  setShowNetworkModal(false);
                }}
                className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-(family-name:--font-space-grotesk) text-left"
              >
                <div className="text-white font-medium">Testnet</div>
                <div className="text-gray-400 text-sm">For testing and development</div>
              </button>

              <button
                onClick={() => {
                  window.location.reload();
                  setShowNetworkModal(false);
                }}
                className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-(family-name:--font-space-grotesk) text-left"
              >
                <div className="text-white font-medium">Mainnet</div>
                <div className="text-gray-400 text-sm">For production use</div>
              </button>
            </div>

            <p className="text-gray-400 text-xs mt-4 font-(family-name:--font-space-grotesk)">
              Note: Network switching requires page reload. Update the WalletProvider to change networks.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
