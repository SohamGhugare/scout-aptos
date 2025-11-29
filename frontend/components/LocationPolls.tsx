'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Plus } from 'lucide-react';
import { calculateDistance } from '@/lib/utils';

interface LocationPollsProps {
  onCreateClick?: () => void;
}

interface Poll {
  _id: string;
  title: string;
  options: Array<{
    id: number;
    text: string;
    votes: number;
    voters: string[];
  }>;
  createdBy: {
    walletAddress: string;
    username: string;
  };
  location: {
    latitude: number;
    longitude: number;
  } | null;
  totalVotes: number;
  createdAt: string;
  status: string;
}

export default function LocationPolls({ onCreateClick }: LocationPollsProps) {
  const { connected } = useWallet();
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
      if (!userCoords) {
        setPollsLoading(false);
        return;
      }

      try {
        setPollsLoading(true);
        const response = await fetch('/api/polls/list');
        const data = await response.json();

        if (data.success && data.polls) {
          // Filter polls within 100m radius
          const filtered = data.polls.filter((poll: Poll) => {
            if (!poll.location) return false;

            const distance = calculateDistance(
              userCoords.latitude,
              userCoords.longitude,
              poll.location.latitude,
              poll.location.longitude
            );

            return distance <= 100; // 100 meters
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
  }, [userCoords]);

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
    </div>
  );
}
