"use client";

import React from 'react';
import { useMusic } from '@/contexts/music-context';
import Grid from '@mui/material/Unstable_Grid2'; // Using Grid v2
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export function MusicGrid(): React.JSX.Element {
  // 1. Get data from context
  const { playList, isLoading, error, setActiveTrack } = useMusic();

  // 7. Click handler (placeholder for now)
  const handleTrackSelect = (trackId: number) => {
    console.log(`Track selected in Grid: ${trackId}`);
    // Call the context function to update the active track ID
    setActiveTrack(trackId);
  };

  // 2. Handle Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 3. Handle Error state
  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>
        Error loading music: {error.message}
      </Typography>
    );
  }

  // Handle case where playlist is empty after loading
  if (!playList || playList.length === 0) {
    return (
      <Typography sx={{ textAlign: 'center', mt: 4 }}>
        No music found.
      </Typography>
    );
  }
  console.log("playList:", playList);
  // 4. Render the grid if data is loaded
  return (
    <Grid container spacing={3}>
      {playList.map((track) => (
        // 5. Grid item for each track
        <Grid key={track.id} xs={12} sm={6} md={4} lg={3}>
          {/* 5 & 6. Clickable Card for the track */}
          <div style={{height: '300px', width: '100%'}}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'rgba( 255, 255, 255, 0.25 )',
              boxShadow: '0 8px 32px 0 rgba( 31, 38, 135, 0.37 )',
              backdropFilter: 'blur( 3.5px )',
              WebkitBackdropFilter: 'blur( 3.5px )',
              borderRadius: '10px',
              border: '1px solid rgba( 255, 255, 255, 0.18 )',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }
            }}
          >
            <CardActionArea 
              onClick={() => handleTrackSelect(track.id)} 
              sx={{ 
                flexGrow: 1,
                borderRadius: '16px',
              }}
            >
              <CardMedia
                component="img"
                height="190"
                image={track.img && !track.img.startsWith('blob:') 
                  ? track.img 
                  : '/assets/placeholder-image.png'}
                alt={track.name}
                sx={{ 
                  objectFit: 'cover',
                  borderTopLeftRadius: '16px',
                  borderTopRightRadius: '16px',
                }}
              />
              <CardContent sx={{ 
                background: 'linear-gradient(to bottom, rgba(30, 30, 35, 0.5), rgba(30, 30, 35, 0.8))',
                backdropFilter: 'blur(5px)',
              }}>
                <Typography gutterBottom variant="h6" component="div" noWrap sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {track.name}
                </Typography>
                <Typography variant="body2" color="rgba(255, 255, 255, 0.6)" noWrap>
                  {track.artist}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
          </div>
        </Grid>
      ))}
    </Grid>
  );
}

// Optional: Export as default if it's the main export of the file
// export default MusicGrid;
