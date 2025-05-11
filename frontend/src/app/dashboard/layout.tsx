"use client"
import * as React from 'react';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import GlobalStyles from '@mui/material/GlobalStyles';
import AudioPlayer from 'react-modern-audio-player';
import type { AudioPlayerProps, InitialStates } from 'react-modern-audio-player';

import { AuthGuard } from '@/components/auth/auth-guard';
import { MainNav } from '@/components/dashboard/layout/main-nav';
import { MusicProvider, useMusic } from '@/contexts/music-context';
import { Typography } from '@mui/material';

interface LayoutProps {
  children: React.ReactNode;
}

function DashboardContent({ children }: LayoutProps): React.JSX.Element {
  const { playList, isLoading, error, activeTrack } = useMusic();

  const [playerKey, setPlayerKey] = useState<number>(0);

  useEffect(() => {
    if (activeTrack !== null) {
      console.log("Updating player key due to activeTrack change:", activeTrack);
      setPlayerKey(prevKey => prevKey + 1);
    }
  }, [activeTrack]);

  const audioInitialState: InitialStates | undefined = activeTrack !== null
    ? { curPlayId: activeTrack }
    : undefined;

  return (
    <AuthGuard>
      <GlobalStyles
        styles={{
          body: {
            '--MainNav-height': '64px',
            '--MainNav-zIndex': 1000,
            '--MobileNav-width': '320px',
            '--MobileNav-zIndex': 1100,
          },
        }}
      />
      <Box
        sx={{
          // bgcolor: 'var(--mui-palette-background-default)',
          // bgcolor: 'red',
          // backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)), url(/assets/wallpaper.jpg)',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgb(37 37 37)), url(/assets/wall.avif)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '100%',
        }}
      >
        <MainNav />
        <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column' }}>
          <main>
            <Container  maxWidth="xl" sx={{ py: '64px', pb: { xs: '80px', lg: '80px' } }}>
              {children}
            </Container>
          </main>
        </Box>
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            bgcolor: 'background.paper',
            // bgcolor: 'red',
            // borderTop: '1px solid',
            borderColor: 'divider',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isLoading ? (
            <Typography sx={{ p: 2, textAlign: 'center' }}>Loading music...</Typography>
          ) : error ? (
            <Typography color="error" sx={{ p: 2, textAlign: 'center' }}>
              Error loading music: {error.message}
            </Typography>
          ) : playList.length > 0 ? (
            <AudioPlayer
              key={playerKey}
              playList={playList}
              audioInitialState={audioInitialState}
              activeUI={{
                all: true,
                progress: 'bar',
              }}
            />
          ) : (
            <Typography sx={{ p: 2, textAlign: 'center' }}>Playlist is empty.</Typography>
          )}
        </Box>
      </Box>
    </AuthGuard>
  );
}

export default function Layout({ children }: LayoutProps): React.JSX.Element {
  return (
    <MusicProvider>
      <DashboardContent>{children}</DashboardContent>
    </MusicProvider>
  );
}
