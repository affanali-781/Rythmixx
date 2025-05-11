'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import { Typography } from '@mui/material';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';





export function SongsGrid(): React.JSX.Element {
  const [tracks, setTracks] = useState<any[]>([]);
  const supabase = createClient();
  

  const handleDelete = async (id: string) => {
    try {
      // Delete the record from the database
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting song:', error);
        alert('Failed to delete song');
        return;
      }
      
      // Update local state to remove the deleted song
      setTracks(tracks.filter(track => track.id !== id));
      alert('Song deleted successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    }
  };

  
  useEffect(() => {
    const gettracks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: tracks } = await supabase.from('songs').select('*').eq('user_id', user.id);
      console.log("tracks ---> ", tracks);

      if(tracks && tracks.length > 0) {
        console.log("tracks ---> ", tracks);
        setTracks(tracks);
      }else{
        console.log("No tracks found");
      }
    }
    if (!user) {
      console.log("No user found");
    }
  }
  gettracks();
}, []);
  console.log("tracks ---> ", tracks);
  return (
    
      <Card sx={{ backgroundColor: 'black', color: 'white' }}>
        <CardHeader subheader="Songs uploaded by you" title="Songs" />
        <Divider sx={{ borderColor: '#2b2b2b' }} />
        <CardContent>
          <Grid container spacing={3}>
          {tracks.length > 0 ? (
              tracks.map((track) => (
                <Grid md={6} xs={12} key={track.id}>
                  <Card sx={{ backgroundColor: '#121212', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '180px', overflow: 'hidden' }}>
                      <img 
                        src={track.img} 
                        alt={track.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography sx={{ color: 'white', fontWeight: 'bold' }} variant="h6">{track.title}</Typography>
                      <Typography sx={{ color: '#aaa' }} variant="body2">
                        Artist: {track.artist.join(', ')}
                      </Typography>
                      <Typography sx={{ color: '#aaa' }} variant="body2">
                        Genre: {track.genre.join(', ')}
                      </Typography>
                      <Typography sx={{ color: '#aaa', fontSize: '0.8rem', mt: 1 }} variant="body2">
                        Added on: {new Date(track.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    <div style={{ padding: '0 16px 16px' }}>
                      <button 
                        onClick={() => handleDelete(track.id)}
                        style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        Delete Song
                      </button>
                    </div>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid md={12} xs={12}>
                <Typography sx={{ color: 'white' }} variant="h4">No songs uploaded</Typography>
              </Grid>
            )}
              </Grid>
        </CardContent>
        <Divider sx={{ borderColor: '#2b2b2b' }} />
        
      </Card>
 
  );
}
