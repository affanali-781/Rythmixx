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
  const [trackId, setTrackId] = useState<string | null>(null);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();
  
  // Find the active track data
  const activeTrackData = activeTrack !== null ? playList.find(track => track.id === activeTrack) : null;

  // Set first track as active if none selected
  useEffect(() => {
    if (!activeTrack && playList.length > 0) {
      setActiveTrack(playList[0].id);
    }
  }, [activeTrack, playList, setActiveTrack]);

  // Add check for user
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
    <Box sx={{ width: '100%', height: 'calc(100vh - 200px)' }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
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
        </Stack>
      </Paper>

      <Paper 
        elevation={3} 
        sx={{ 
          height: 'calc(100% - 100px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
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
      </Paper>
      
      {/* Metadata Edit Dialog */}
      <Dialog 
        open={isFormOpen} 
        onClose={handleCloseForm} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: 'background.paper'
          }
        }}
      >
        <DialogTitle>Edit Track Metadata</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Image Upload */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <IconButton
                onClick={handleImageClick}
                sx={{
                  width: 200,
                  height: 200,
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  p: 0,
                  '&:hover': {
                    borderColor: 'primary.main'
                  }
                }}
              >
                {formData.imgPreview ? (
                  <Avatar
                    src={formData.imgPreview}
                    variant="square"
                    sx={{
                      width: '100%',
                      height: '100%'
                    }}
                  />
                ) : (
                  <AddPhotoAlternateIcon sx={{ fontSize: 40 }} />
                )}
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                Click to upload cover image
              </Typography>
            </Box>

            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              label="Artist"
              fullWidth
              value={formData.artist}
              onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
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