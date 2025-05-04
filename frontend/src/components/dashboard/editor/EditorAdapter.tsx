"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert, CircularProgress, Snackbar } from '@mui/material';
//import { createClient } from '@/lib/supabase/client';
import { createClient } from '@/lib/auth/client';


interface EditorAdapterProps {
  trackSrc?: string;
  trackName?: string;
  trackId?: string;
  userId: string;
  onSaveComplete?: (newUrl: string) => void;
}

export const EditorAdapter: React.FC<EditorAdapterProps> = ({ 
  trackSrc, 
  trackName, 
  trackId,
  userId,
  onSaveComplete 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Handle messages from the editor iframe
    const handleMessage = async (event: MessageEvent) => {
      // Ignore React DevTools messages
      if (event.data.source === 'react-devtools-bridge') {
        return;
      }

      const data = event.data;
      console.log('Received editor message:', data);

      if (data?.type === 'EDITOR_READY') {
        setEditorReady(true);
        setError(null);
        console.log('Editor is ready, initializing with:', {
          userId,
          trackSrc,
          trackName,
          trackId
        });

        // Initialize the editor with all necessary data
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'INIT_EDITOR',
            userId,
            trackSrc,
            trackName,
            trackId
          }, '*');
        }
      } else if (data?.type === 'EDITOR_SAVE') {
        console.log('Save initiated with:', { trackId, userId, trackName });
        
        try {
          setLoading(true);
          
          if (!data.audioData) {
            throw new Error('No audio data received');
          }
          if (!userId) {
            throw new Error('No user ID available');
          }
          if (!trackId) {
            throw new Error('No track ID available');
          }

          // 1. Upload audio file
          const audioBlob = new Blob([data.audioData], { type: data.mimeType || 'audio/mp3' });
          const fileName = `${trackName || 'edited'}.${data.format || 'mp3'}`;
          const audioPath = `audio/${trackId}/${Date.now()}_${fileName}`;

          console.log('Uploading audio to:', audioPath);

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
          let imgUrl = data.img; // Use existing image if no new one
          if (data.newImage) {
            const imgExt = data.newImage.name.split('.').pop();
            const imgPath = `covers/${trackId}/${Date.now()}.${imgExt}`;

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

          // 3. Update database record
          const saveData = {
            title: data.title || trackName || 'Untitled',
            artist: Array.isArray(data.artist) ? data.artist : [data.artist || 'Unknown Artist'],
            genre: Array.isArray(data.genre) ? data.genre : [data.genre || 'Unknown Genre'],
            img: imgUrl,
            project_id: data.project_id || null,
            src: audioUrlData.publicUrl,
            user_id: userId
          };

          console.log('Updating database with:', saveData);
          
          // Update the song record
          const { error: updateError } = await supabase
            .from('songs')
            .update(saveData)
            .eq('id', trackId);
            
          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }

          console.log('Song updated successfully');
          setNotification({
            message: 'Track saved successfully!',
            type: 'success'
          });
          
          if (onSaveComplete) {
            onSaveComplete(audioUrlData.publicUrl);
          }
          
        } catch (err) {
          console.error('Save process failed:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to save track';
          setError(errorMessage);
          setNotification({
            message: `Error: ${errorMessage}`,
            type: 'error'
          });
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [trackId, trackName, userId, onSaveComplete]);

  // Add notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10
        }}>
          <Box sx={{ 
            bgcolor: 'background.paper', 
            p: 3, 
            borderRadius: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Processing audio...</Typography>
          </Box>
        </Box>
      )}
      
      <Box sx={{ flexGrow: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <iframe 
          ref={iframeRef}
          src="/RythmixEditor/src/index.html"
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none'
          }}
          title="Rythmix Audio Editor"
          allow="microphone"
        />
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification && (
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};
