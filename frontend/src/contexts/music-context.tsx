"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/auth/client';
// Assume you have a configured Supabase client instance
// import { supabase } from '@/lib/supabase'; 

// Define the shape of a single track
interface Track {
  id: number;
  uuid: string;
  name: string;
  artist: string;
  img: string;
  src: string;
  genre: string[];

  // Add any other relevant fields from your Supabase table
}

// Define the shape of the context value
interface MusicContextType {
  playList: Track[];
  activeTrack: number | null;
  setActiveTrack: (id: number | null) => void;
  isLoading: boolean;
  error: Error | null;
  fetchMusic: () => Promise<void>; // Function to trigger fetching
}

// Create the context with a default value
const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Define the props for the provider component
interface MusicProviderProps {
  children: ReactNode;
}

// Create the provider component
export const MusicProvider: React.FC<MusicProviderProps> = ({ children }) => {
  const [playList, setPlayList] = useState<Track[]>([
    {
        name: 'Sample Track 1',
        img: 'frontend/public/assets/cover.png',
        uuid: "jshjhjkas",
        src: '/assets/songs/gorila-315977.mp3',
        genre: ['music'],
        artist: 'Artist A',
        id: 1,
      },
      {
        name: 'Sample Track 2',
        artist: 'Artist B',
        uuid: "jshjhjkas",
        img: '/assets/image-2.png',
        src: '/assets/sample-audio-2.mp3',
        genre: ['music'],
        id:2,
      },

  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTrack, setActiveTrack] = useState<number | null>(null);

  const supabase = createClient();

  const fetchMusic = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch songs from Supabase
      const { data, error } = await supabase
        .from('songs')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        // Map the database fields to your Track interface
        const formattedData = data.map((song,i )=> ({
          id: i,
          uuid: song.id,
          name: song.title, // Note the mapping from 'title' to 'name'
          artist: Array.isArray(song.artist) ? song.artist[0] : song.artist, // Handle array
          img: song.img || '/assets/placeholder-image.png', // Fallback image
          src: song.src,
          genre: Array.isArray(song.genre) ? song.genre : [song.genre],
        }));
        
        setPlayList(formattedData);
        console.log("Fetched songs:", formattedData);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch music'));
      console.error("Error fetching songs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch music when the component mounts
  useEffect(() => {
    fetchMusic();
  }, []);

  // Value provided by the context
  const value = {
    playList,
    isLoading,
    error,
    fetchMusic,
    activeTrack,
    setActiveTrack,
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

// Custom hook to use the MusicContext
export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}; 