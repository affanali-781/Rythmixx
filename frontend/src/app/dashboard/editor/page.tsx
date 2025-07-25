// File: ./Rythmix/frontend/src/app/dashboard/editor/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Stack, 
  Snackbar, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Chip,
  IconButton,
  Avatar,
  CircularProgress
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useMusic } from '@/contexts/music-context';
import { useUser } from '@/contexts/user-context';
import { EditorAdapter } from '@/components/dashboard/editor/EditorAdapter';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Available genres for the dropdown
const availableGenres = [
  'Pop', 'Rock', 'Hip Hop', 'Jazz', 'Classical', 'Electronic', 
  'R&B', 'Country', 'Folk', 'Blues', 'Metal', 'Reggae'
];

interface FormData {
  title: string;
  artist: string;
  img: File | null;
  imgPreview: string;
  genres: string[];
  projectId?: string;
}

interface SaveData {
  title: string;
  artist: string[];
  genre: string[];
  img: string | null;
  project_id: string | null;
  src: string;
  user_id: string;
}

export default function EditorPage() {
  const { user } = useUser();
  const { activeTrack, playList, fetchMusic, setActiveTrack } = useMusic();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    artist: '',
    img: null,
    imgPreview: '',
    genres: [],
    projectId: undefined
  });
  const userId = user?.id;
  console.log('userId', userId);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const [cursors, setCursors] = useState<{ [key: string]: { x: number, y: number } }>({});

  const supabase = createClient();
  
  // Find the active track data
  const activeTrackData = activeTrack !== null ? playList.find(track => track.id === activeTrack) : null;

  // Set first track as active if none selected
  useEffect(() => {
    if (!activeTrack && playList.length > 0) {
      setActiveTrack(playList[0].id);
    }
  }, [activeTrack, playList, setActiveTrack]);


  useEffect(() => {
    // if there's no track or we're not broadcasting, bail out
    if ( !isBroadcasting) {
      // cleanup if we're turning off
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
        setCollaborators([]);
      }
      return;
    }

    // 1) Create & subscribe to the presence channel
    const channel = supabase
    .channel('presence:editor:test', {
      config: { broadcast: { self: true } }
    })
    .on('presence', { event: 'sync' }, () => {
      console.log('SYNC', channel.presenceState());
      setCollaborators(Object.values(channel.presenceState()).flat());
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('JOIN', newPresences);
      setCollaborators(prev => [...prev, ...newPresences]);
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('LEAVE', leftPresences);
      setCollaborators(prev =>
        prev.filter(p => !leftPresences.find(lp => lp.xid === p.xid))
      );
    })
    .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
      setCursors(prev => ({
        ...prev,
        [payload.userId]: { x: payload.x, y: payload.y }
      }));
    })
    .subscribe(status => console.log('SUBSCRIBE STATUS', status));

  presenceChannelRef.current = channel;

  // 2) Announce yourself on that same channel
  channel.track({
    xid: user?.id,
    name: user?.name,
    avatar_url: user?.avatarUrl
  });

  // 3) Cleanup when you stop broadcasting
  return () => {
    console.log('UNSUBSCRIBE');
    channel.unsubscribe();
    presenceChannelRef.current = null;
    setCollaborators([]);
  };
}, [isBroadcasting, user?.id, user?.name, user?.avatarUrl]);

  // Add check for user
  //Chaudary Gujjar 
  useEffect(() => {
    if (!user) {
      router.push(paths.auth.signIn);
    }
  }, [user, router]);

  useEffect(() => {
    // Log user data when component mounts
    console.log('Current user:', user);
  }, [user]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.source === 'react-devtools-bridge') return;

      const data = event.data;
      console.log('Received editor message:', data);

      if (data?.type === 'EDITOR_SAVE') {
        try {
          setLoading(true);

          if (!data.audioData || !userId) {
            throw new Error('Missing required data for save');
          }

          // 1. First upload the audio file
          const audioBlob = new Blob([data.audioData], { type: data.mimeType || 'audio/mp3' });
          const fileName = `${trackName || 'edited'}.${data.format || 'mp3'}`;
          const audioPath = `audio/${userId}/${Date.now()}_${fileName}`;

          // Upload to songsbucket
          const { error: audioUploadError } = await supabase.storage
            .from('songsbucket')
            .upload(audioPath, audioBlob, {
              cacheControl: '3600',
              upsert: true
            });

          if (audioUploadError) {
            throw new Error(`Audio upload failed: ${audioUploadError.message}`);
          }

          // Get audio URL
          const { data: audioUrlData } = supabase.storage
            .from('songsbucket')
            .getPublicUrl(audioPath);

          // 2. Handle image if provided
          let imgUrl = data.img;
          if (data.newImage) {
            const imgExt = data.newImage.name.split('.').pop();
            const imgPath = `covers/${userId}/${Date.now()}.${imgExt}`;

            const { error: imgUploadError } = await supabase.storage
              .from('cover-images')
              .upload(imgPath, data.newImage, {
                cacheControl: '3600',
                upsert: true
              });

            if (imgUploadError) {
              throw new Error(`Image upload failed: ${imgUploadError.message}`);
            }

            const { data: imgUrlData } = supabase.storage
              .from('cover-images')
              .getPublicUrl(imgPath);

            imgUrl = imgUrlData.publicUrl;
          }

          // 3. Create new record in database
          const saveData = {
            title: data.title || trackName || 'Untitled',
            artist: Array.isArray(data.artist) ? data.artist : [data.artist || 'Unknown Artist'],
            genre: Array.isArray(data.genre) ? data.genre : [data.genre || 'Unknown Genre'],
            img: imgUrl,
            project_id: data.project_id || null,
            src: audioUrlData.publicUrl,
            user_id: userId
          };

          console.log('Creating new song record:', saveData);

          // Insert new record
          const { data: insertData, error: insertError } = await supabase
            .from('songs')
            .insert([saveData])
            .select();

          if (insertError) {
            throw new Error(`Database insert failed: ${insertError.message}`);
          }

          // Update trackId with the newly created record's ID
          if (insertData?.[0]?.id) {
            setTrackId(insertData[0].id);
          }

          setNotification({
            message: 'Track saved successfully!',
            type: 'success'
          });

        } catch (error) {
          console.error('Save failed:', error);
          setNotification({
            message: error instanceof Error ? error.message : 'Failed to save track',
            type: 'error'
          });
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userId, trackName]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!presenceChannelRef.current) return;
  
      presenceChannelRef.current.send({
        type: 'broadcast',
        event: 'cursor-move',
        payload: {
          x: e.clientX,
          y: e.clientY,
          userId: user?.id,
        },
      });
    };
  
    if (isBroadcasting) {
      window.addEventListener('mousemove', handleMouseMove);
    }
  
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isBroadcasting, user?.id]);

  console.log('EditorPage rendering with user:', { 
    userId, 
    user,
    hasUser: !!user,
    hasUserId: !!userId 
  });

  useEffect(() => {
    if (userId) {
      console.log('User ID available in EditorPage:', userId);
    } else {
      console.warn('No user ID available in EditorPage');
    }
  }, [userId]);

  console.log('Editor parameters:', {
    userId,
    trackSrc: activeTrackData?.src,
    trackName: activeTrackData?.name,
    trackId: activeTrackData?.uuid
  });

  useEffect(() => {
    console.log('User context:', {
      user,
      userId,
      hasUser: !!user,
      hasUserId: !!userId
    });
  }, [user, userId]);

  if (!user || !userId) {
    console.log('No user available, returning null');
    return null;
  }

  // Handle form open
  const handleOpenForm = () => {
    if (activeTrackData) {
      setFormData({
        title: activeTrackData.name,
        artist: activeTrackData.artist,
        img: null,
        imgPreview: activeTrackData.img,
        genres: activeTrackData.genre,
        projectId: activeTrackData.projectId
      });
    }
    setIsFormOpen(true);
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        img: file,
        imgPreview: previewUrl
      }));
    }
  };

  // Handle image click to open file dialog
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      if (!activeTrackData?.uuid) {
        throw new Error('No active track');
      }

      // Get all the metadata
      const metadata = {
        userId: user?.id,
        trackId: activeTrackData.uuid,
        title: formData.title,
        artist: formData.artist,
        genres: formData.genres,
        projectId: formData.projectId,
        img: formData.imgPreview
      };

      console.log('Sending metadata to editor:', metadata);

      // Send metadata to editor iframe
      const editorIframe = document.querySelector('iframe');
      if (editorIframe?.contentWindow) {
        editorIframe.contentWindow.postMessage({
          type: 'UPDATE_METADATA',
          metadata: metadata
        }, '*');
      }

      // Update UI
      setNotification({
        message: 'Metadata updated successfully!',
        type: 'success'
      });
      
      handleCloseForm();
      
    } catch (error) {
      console.error('Error updating metadata:', error);
      setNotification({
        message: 'Failed to update metadata',
        type: 'error'
      });
    }
  };

  // Handle form close
  const handleCloseForm = () => {
    setIsFormOpen(false);
    // Clean up any object URLs to prevent memory leaks
    if (formData.imgPreview && formData.imgPreview !== activeTrackData?.img) {
      URL.revokeObjectURL(formData.imgPreview);
    }
  };

  // Handle going back to music library
  const handleBackToLibrary = () => {
    router.push(paths.dashboard.overview);
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification(null);
  };

  console.log('EditorPage state:', {
    hasUser: !!user,
    userId,
    userEmail: user?.email
  });

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 200px)', bgcolor: '#000', color: '#fff',position: 'relative' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#121212', color: '#fff', }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Audio Editor
            </Typography>
  
            {activeTrackData ? (
              <Typography variant="subtitle1">
                Editing: {activeTrackData.name} by {activeTrackData.artist}
              </Typography>
            ) : (
              <Typography variant="subtitle1" color="text.secondary">
                {playList.length > 0 ? 'Selecting track...' : 'No tracks available'}
              </Typography>
            )}
  
            {/* Debug info - remove in production */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Active Track ID: {activeTrack}<br />
              Playlist Length: {playList.length}
            </Typography>
          </Box>
  
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenForm}
              disabled={!activeTrackData}
            >
              Edit Metadata
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleBackToLibrary}
            >
              Back to Library
            </Button>
          </Stack>
          <Stack direction="row" spacing={2}>
          <Button
  variant="contained"
  onClick={() => setIsBroadcasting(true)}
  disabled={isBroadcasting}
>
  Start Broadcasting
</Button>
<Button
  variant="outlined"
  onClick={() => setIsBroadcasting(false)}
  disabled={!isBroadcasting}
>
  Stop Broadcasting
</Button>
          </Stack>
          <Box sx={{ position: 'absolute', top: 46, right: 46 }}>
        <Typography variant="caption" color="text.secondary">
          Collaborators ({collaborators.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          {collaborators.map(c => (
            <Avatar
              key={c.xid}
              src={c.avatar_url}
              alt={c.name}
              sx={{ width: 32, height: 32 }}
            />
          ))}
        </Stack>
      </Box>
        </Stack>

      </Paper>
  
      <Paper
        elevation={3}
        sx={{
          height: 'calc(100% - 100px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#121212',
          color: '#fff'
        }}
      >
        <EditorAdapter
          userId={userId}
          trackSrc={activeTrackData?.src}
          trackName={activeTrackData?.name}
          trackId={activeTrackData?.uuid}
          onSaveComplete={() => {
            // Optionally refresh the music list after save
            // fetchMusic();
          }}
        />
        {Object.entries(cursors).map(([userId, pos]) => {
  if (userId === user.id) return null; // don't show your own cursor

  const userInfo = collaborators.find(c => c.xid === userId);
  if (!userInfo) return null;

  return (
    <div
      key={userId}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '12px'
      }}
    >
      {userInfo.name}
    </div>
  );
})}

      </Paper>
  
      {/* Metadata Edit Dialog (image upload removed) */}
      <Dialog
        open={isFormOpen}
        onClose={handleCloseForm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: '#121212',
            color: '#fff'
          }
        }}
      >
        <DialogTitle>Edit Track Metadata</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }}
              InputLabelProps={{ style: { color: '#ccc' } }}
            />
            <TextField
              label="Artist"
              fullWidth
              value={formData.artist}
              onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
              InputProps={{ style: { color: '#fff' } }}
              InputLabelProps={{ style: { color: '#ccc' } }}
            />
            <Autocomplete
              multiple
              options={availableGenres}
              value={formData.genres}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, genres: newValue }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Genres"
                  placeholder="Select genres"
                  InputProps={{
                    ...params.InputProps,
                    style: { color: '#fff' }
                  }}
                  InputLabelProps={{ style: { color: '#ccc' } }}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.title || !formData.artist}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
  
      {/* Notification */}
      <Snackbar
        open={notification !== null}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification && (
          <Alert
            onClose={handleCloseNotification}
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
  
      {/* Loading indicator */}
      {loading && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999
        }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
  
  
}