// File: ./Rythmix/frontend/src/components/dashboard/editor/EditorAdapter.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
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

  // Function to initialize the editor with user ID
  const initializeEditor = () => {
    if (!iframeRef.current?.contentWindow) return;
    
    console.log('Initializing editor with user ID:', userId);
    
    // Set user ID in the editor's window
    iframeRef.current.contentWindow.postMessage({
      type: 'SET_USER_ID',
      userId: userId
    }, '*');
  };

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('Editor iframe loaded, setting up...');
      // Wait a short moment to ensure the editor is fully initialized
      setTimeout(() => {
        initializeEditor();
      }, 100);
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [userId]);

  // Handle messages from the editor
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.source === 'react-devtools-bridge') return;

      const data = event.data;
      console.log('Received message from editor:', data);

      if (data?.type === 'EDITOR_READY') {
        setEditorReady(true);
        // Re-initialize when editor signals it's ready
        initializeEditor();
      } else if (data?.type === 'EDITOR_ERROR') {
        setError(data.message || 'Unknown editor error');
        setLoading(false);
      } else if (data?.type === 'EDITOR_LOADED') {
        console.log('Track loaded in editor:', data.name);
        setLoading(false);
      } else if (data?.type === 'EDITOR_SAVE') {
        console.log('Save initiated with:', { userId, trackName });
        
        try {
          setLoading(true);
          
          if (!data.audioData) {
            throw new Error('No audio data received');
          }
          if (!userId) {
            throw new Error('No user ID available');
          }

          // 1. Upload audio file
          const audioBlob = new Blob([data.audioData], { type: data.mimeType || 'audio/mp3' });
          const fileName = `${trackName || 'edited'}.${data.format || 'mp3'}`;
          // Use timestamp-based path instead of trackId for new uploads
          const audioPath = `audio/${userId}/${Date.now()}_${fileName}`;

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
          let imgUrl = data.img;
          if (data.newImage) {
            const imgExt = data.newImage.name.split('.').pop();
            // Use timestamp-based path instead of trackId for new uploads
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

          console.log('Creating database record with:', saveData);
          
          // Insert new record instead of updating
          const { data: insertData, error: insertError } = await supabase
            .from('songs')
            .insert([saveData])
            .select();
            
          if (insertError) {
            throw new Error(`Database insert failed: ${insertError.message}`);
          }

          console.log('Song created successfully:', insertData);
          setError(null);
          
          if (onSaveComplete && insertData?.[0]) {
            onSaveComplete(audioUrlData.publicUrl);
          }
          
        } catch (error) {
          console.error('Save failed:', error);
          setError(error instanceof Error ? error.message : 'Failed to save track');
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [trackId, trackName, onSaveComplete]);

  // Load track when trackSrc changes or editor becomes ready
  useEffect(() => {
    if (editorReady && trackSrc && iframeRef.current?.contentWindow) {
      console.log('Loading track in editor:', trackSrc);
      try {
        setLoading(true);
        iframeRef.current.contentWindow.postMessage({
          type: 'LOAD_AUDIO',
          src: trackSrc,
          name: trackName || 'Untitled Track'
        }, '*');
      } catch (err) {
        console.error('Error sending message to editor:', err);
        setError('Failed to communicate with the editor');
        setLoading(false);
      }
    }
  }, [editorReady, trackSrc, trackName]);

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
          src="/RythmixEditor/index.html"
          style={{ 
            width: '90%', 
            height: '90%', 
            border: 'none'
          }}
          title="Rythmix Audio Editor"
          allow="microphone"
        />
      </Box>
    </Box>
  );
};