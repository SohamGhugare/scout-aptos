'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Plus } from 'lucide-react';
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
}

export default function LocationPolls({ onCreateClick }: LocationPollsProps) {
  const { connected, account } = useWallet();
  const [location, setLocation] = useState<string>('your location');
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyPolls, setNearbyPolls] = useState<Poll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(true);

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
      if (!userCoords || !account?.address) {
        setPollsLoading(false);
        return;
      }

      try {
        setPollsLoading(true);

        // Fetch polls from the connected user's address
        const response = await fetch('/api/polls/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: account.address.toString(),
          }),
        });

        const data = await response.json();

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

            // Also filter out expired polls
            const now = Math.floor(Date.now() / 1000);
            const isActive = poll.expiryTime >= now;

            return distance <= 100 && isActive;
          });

          setNearbyPolls(filtered);
        }
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        setPollsLoading(false);
      }
    };

    fetchNearbyPolls();
  }, [userCoords, account]);

  const formatTimeRemaining = (expiryTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = expiryTime - now;

    if (secondsRemaining <= 0) return 'Expired';

    const days = Math.floor(secondsRemaining / (24 * 60 * 60));
    const hours = Math.floor((secondsRemaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((secondsRemaining % (60 * 60)) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
                <h3 className="text-xl md:text-2xl font-bold text-white font-(family-name:--font-space-grotesk) mb-5 leading-tight">
                  {poll.title}
                </h3>

                {/* Progress Bar with Labels */}
                <div className="mb-6">
                  <div className="flex h-3 rounded-full overflow-hidden shadow-lg mb-3 bg-black/30">
                    <div
                      className="bg-linear-to-r from-green-400 to-green-500 transition-all duration-500 ease-out"
                      style={{ width: '50%' }}
                    />
                    <div
                      className="bg-linear-to-r from-red-500 to-red-400 transition-all duration-500 ease-out"
                      style={{ width: '50%' }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-linear-to-r from-green-400 to-green-500 shadow-md shadow-green-500/50" />
                      <span className="text-green-400 font-bold text-lg font-(family-name:--font-space-grotesk)">50%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold text-lg font-(family-name:--font-space-grotesk)">50%</span>
                      <div className="w-3 h-3 rounded-full bg-linear-to-r from-red-500 to-red-400 shadow-md shadow-red-500/50" />
                    </div>
                  </div>
                </div>

                {/* Option Buttons */}
                <div className="space-y-3 mb-5">
                  <button className="w-full bg-linear-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border-2 border-green-500/50 hover:border-green-400/70 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 font-(family-name:--font-space-grotesk) shadow-lg shadow-green-500/10 hover:shadow-green-500/20 hover:scale-105 active:scale-95">
                    {poll.option1}
                  </button>
                  <button className="w-full bg-linear-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-2 border-red-500/50 hover:border-red-400/70 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 font-(family-name:--font-space-grotesk) shadow-lg shadow-red-500/10 hover:shadow-red-500/20 hover:scale-105 active:scale-95">
                    {poll.option2}
                  </button>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
