'use client';

import Link from 'next/link';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { connect, account, connected, wallets, network } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState('');
  const [inputUsername, setInputUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  useEffect(() => {
    if (connected && account?.address) {
      checkUser(account.address.toString());
    } else {
      setUsername('');
    }
  }, [connected, account]);

  const checkUser = async (walletAddress: string) => {
    try {
      setIsCheckingUser(true);
      const response = await fetch('/api/user/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (data.exists) {
        setUsername(data.username);
      } else {
        setShowUsernameModal(true);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleCreateUser = async () => {
    if (!account?.address) return;

    setUsernameError('');

    try {
      const response = await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: account.address.toString(),
          username: inputUsername,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUsername(data.username);
        setShowUsernameModal(false);
        setInputUsername('');
      } else {
        setUsernameError(data.error || 'Failed to create username');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setUsernameError('Failed to create username');
    }
  };

  const handleConnect = async (walletName: string) => {
    try {
      connect(walletName);
      setShowWalletModal(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatUsername = (username: string) => {
    // Truncate username on mobile if longer than 10 characters
    if (typeof window !== 'undefined' && window.innerWidth < 768 && username.length > 10) {
      return `@${username.slice(0, 10)}...`;
    }
    return `@${username}`;
  };

  return (
    <>
      <nav className="fixed top-3 md:top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-2 md:px-4">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 md:px-6 py-2 md:py-3 shadow-lg">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-xl md:text-2xl font-bold bg-linear-to-r from-green-400 to-green-500 bg-clip-text text-transparent font-(family-name:--font-space-grotesk)">
                Scout
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-2 md:gap-6">
              <button className="hidden md:block text-white hover:text-gray-300 transition-colors font-medium font-(family-name:--font-space-grotesk)">
                How it Works
              </button>
              <Link href="/polls" className="hidden md:block">
                <button className="text-white hover:text-gray-300 transition-colors font-medium font-(family-name:--font-space-grotesk)">
                  Polls
                </button>
              </Link>

              {/* Network Selector */}
              <button
                onClick={() => setShowNetworkModal(!showNetworkModal)}
                className="text-xs px-2 md:px-3 py-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors font-(family-name:--font-space-grotesk) font-medium"
              >
                {network?.name || 'Testnet'}
              </button>

              {/* Wallet Connect Button */}
              {!connected ? (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="bg-white hover:bg-gray-200 text-black font-semibold px-3 md:px-6 py-1.5 md:py-2 rounded-full transition-all shadow-md hover:shadow-lg font-(family-name:--font-space-grotesk) text-sm md:text-base"
                >
                  <span className="hidden md:inline">Connect Wallet</span>
                  <span className="md:hidden">Connect</span>
                </button>
              ) : (
                <Link href="/portfolio">
                  <button className="bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-semibold px-3 md:px-6 py-1.5 md:py-2 rounded-full transition-all shadow-md hover:shadow-lg font-(family-name:--font-space-grotesk) text-sm md:text-base">
                    {isCheckingUser ? (
                      'Loading...'
                    ) : username ? (
                      <>
                        <span className="hidden md:inline">@{username}</span>
                        <span className="inline md:hidden">{formatUsername(username)}</span>
                      </>
                    ) : (
                      formatAddress(account?.address?.toString() || '')
                    )}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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

      {/* Username Creation Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-black/90 border border-green-500/30 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-2">
                Choose Your Username
              </h2>
              <p className="text-gray-400 text-sm font-(family-name:--font-space-grotesk)">
                This will be your identity on Scout
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white font-medium font-(family-name:--font-space-grotesk) text-sm mb-2 block">
                  Username
                </label>
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                  placeholder="Enter username"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors font-(family-name:--font-space-grotesk)"
                  maxLength={20}
                />
                <p className="text-gray-500 text-xs mt-2 font-(family-name:--font-space-grotesk)">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              {usernameError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-(family-name:--font-space-grotesk)">
                    {usernameError}
                  </p>
                </div>
              )}

              <button
                onClick={handleCreateUser}
                disabled={!inputUsername.trim()}
                className="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-full transition-all font-(family-name:--font-space-grotesk)"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
