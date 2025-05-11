"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { createClient } from '@/lib/supabase/client'; // <-- TODO: Ensure this path is correct


// --- TODO: Import or get user information (e.g., from context or session) ---
// Example: You might need to fetch user session data here if not available globally
// import { useUser } from '@/contexts/user-context';

// Constants for validation
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit (adjust as needed)
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/flac'];

// Zod schema for form validation
const songSchema = z.object({
  title: z.string().min(1, 'Song title is required'),
  // Based on your schema 'artist' and 'genre' are arrays of text (_text)
  // For simplicity, we take a single string and will wrap it in an array on submit.
  // Could enhance later to allow comma-separated values.
  artist: z.string().min(1, 'Artist name is required'),
  genre: z.string().min(1, 'Genre is required'),
  audioFile: z // FileList validation
    .custom<FileList>() // Use custom validation for FileList
    .refine((files) => files && files.length === 1, 'Audio file is required.') // Check if one file is selected
    .refine((files) => files && files[0]?.size <= MAX_FILE_SIZE, `Max file size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`) // Check file size
    .refine((files) => files && ACCEPTED_AUDIO_TYPES.includes(files[0]?.type), 'Invalid file type. Please upload MP3, OGG, WAV, AAC, or FLAC.') // Check file type
});

type SongFormData = z.infer<typeof songSchema>;

interface UploadSongModalProps {
  open: boolean;
  onClose: () => void;
  showSuccessToast: boolean;
  setShowSuccessToast: (showSuccessToast: boolean) => void;
  projectId: string; // Pass the project ID to associate the song
  onUploadSuccess: () => void; // Callback to refresh data after successful upload
}

export function UploadSongModal({ open, onClose, projectId, onUploadSuccess, showSuccessToast, setShowSuccessToast }: UploadSongModalProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const supabase = createClient(); // Initialize Supabase client

  // --- TODO: Get user object ---
  // Example using a hypothetical session/context hook:
  // const { user } = useUserSession();
  // For now, let's assume we can get the user ID directly or fetch it
  const [userId, setUserId] = useState<string | null>(null);

  React.useEffect(() => {
    // Fetch user ID when component mounts or when needed
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        console.log('Supabase auth response:', JSON.stringify(data));
        
        if (error) {
          console.error('Error fetching user:', error.message);
          setSubmitError('Authentication error: ' + error.message);
          return;
        }
        
        if (data?.user?.id) {
          console.log('User ID successfully retrieved:', data.user.id);
          setUserId(data.user.id);
        } else {
          console.error('No user ID found in response');
          setSubmitError('Could not get user information. Please try again.');
        }
      } catch (error) {
        console.error('Exception fetching user:', error);
        setSubmitError('Authentication error occurred');
      }
    };

    
    
    if (open) {
      // Reset error state when opening modal
      setSubmitError(null);
      fetchUser();
    }
  }, [open, supabase]);


  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<SongFormData>({
    resolver: zodResolver(songSchema),
    defaultValues: {
      title: '',
      artist: '',
      genre: '',
      // FileList needs careful default handling, often leaving it undefined is best
    },
  });

  const onSubmit = async (data: SongFormData) => {
    // Check user ID and show a more helpful error message
    if (!userId) {
      console.error('No user ID available for form submission');
      setSubmitError("Could not get user information. Please ensure you're logged in and try again.");
      return;
    }
     if (!supabase) {
      setSubmitError("Database connection not available.");
      return;
    }

    
    setSubmitError(null);

    const file = data.audioFile[0];
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    // Schema: songs / user_id / project_id / filename.ext
    const filePath = `songs/${userId}/${projectId}/${uniqueFileName}`;

    try {
      // 1. Upload audio file to Supabase Storage bucket named 'songs'
      await console.log('supabase.storage:', supabase.storage);
      const { error: uploadError } = await supabase.storage
        .from('songsbucket') // Ensure this bucket exists and has appropriate policies
        .upload(filePath, file);
      console.log('Upload error:', uploadError);
      if (uploadError) {
        // Provide more specific error feedback if possible
        throw new Error(`Storage Error: ${uploadError.message || 'Failed to upload file.'}`);
      }
      console.log('File uploaded successfully:', filePath);

      // 2. Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('songsbucket')
        .getPublicUrl(filePath);

      // 3. Insert song metadata into Supabase 'songs' table
      console.log('userId:', userId);
      console.log('Data:', data);
      const songDataToInsert = {
        user_id: userId,
        project_id: null,
        title: data.title,
        artist: [data.artist],
        genre: [data.genre],
        src: urlData.publicUrl,
        img: null,
      };

      console.log('Attempting to insert song with data:', JSON.stringify(songDataToInsert));

      const { error: insertError } = await supabase
        .from('songs') // Your table name
        .insert(songDataToInsert);

      if (insertError) {
        // Attempt to clean up the uploaded file if DB insert fails
        console.error('Database insert error:', insertError);
        
        // Handle specific error cases
        let errorMessage = 'Failed to save song details.';
        
        // Check for RLS policy violation
        if (insertError.code === '42501' || 
            insertError.message.includes('policy') || 
            insertError.message.includes('violates row-level security')) {
          errorMessage = `Permission denied: You don't have access to upload songs to this project. This might be because:
          1. You're not the owner of this project
          2. The database security policies are restricting this action
          3. Your account doesn't have sufficient permissions`;
        }
        
        console.warn('Database insert failed, attempting to remove uploaded file:', filePath);
        await supabase.storage.from('songs').remove([filePath]);
        throw new Error(`Database Error: ${errorMessage}`);
      }

      console.log('Song data inserted successfully');
      
      setShowSuccessToast(true);

      // Success!
      onUploadSuccess(); // Trigger data refresh in the parent component
      handleClose();     // Close the modal

    } catch (error) {
      console.error('Upload failed:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred during upload.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resets form and calls the onClose prop
  const handleClose = () => {
    if (isSubmitting) return; // Don't close if submitting
    reset(); // Reset form fields
    setSubmitError(null); // Clear errors
    setSelectedFileName(null);
    onClose(); // Call the onClose passed from parent
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload New Song</DialogTitle>
      {/* Use handleSubmit from react-hook-form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers> {/* Add dividers for better spacing */}
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          {/* Use Controller for MUI TextField integration */}
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                margin="dense"
                label="Song Title"
                type="text"
                fullWidth
                required
                error={!!errors.title}
                helperText={errors.title?.message}
                disabled={isSubmitting}
                sx={{ mb: 2 }} // Add margin bottom
              />
            )}
          />
          <Controller
            name="artist"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                margin="dense"
                label="Artist Name"
                type="text"
                fullWidth
                required
                error={!!errors.artist}
                helperText={errors.artist?.message}
                disabled={isSubmitting}
                sx={{ mb: 2 }}
              />
            )}
          />
          <Controller
            name="genre"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                margin="dense"
                label="Genre"
                type="text"
                fullWidth
                required
                error={!!errors.genre}
                helperText={errors.genre?.message}
                disabled={isSubmitting}
                sx={{ mb: 2 }}
              />
            )}
          />
          {/* File Input */}
          <Box sx={{ mt: 1 }}>
             <Button
                variant="outlined"
                component="label" // Makes the button act like a label for the hidden input
                disabled={isSubmitting}
                fullWidth
             >
                Choose Audio File*
                {/* Use register for the file input, keep it hidden */}
                <input
                    type="file"
                    
                    hidden
                    accept={ACCEPTED_AUDIO_TYPES.join(',')}
                    {...register("audioFile", {
                        onChange: (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                console.log('e:', e.target.files);
                                setSelectedFileName(file.name);
                            }
                        }
                    })}
                />
             </Button>
            {/* Display File Input Errors */}
            {errors.audioFile && (
              <Typography color="error" variant="caption" display="block" sx={{ mt: 1 }}>
                {/* Access message safely */}
                {typeof errors.audioFile.message === 'string' ? errors.audioFile.message : 'Invalid file input'}
              </Typography>
            )}
            {selectedFileName && (
              <Typography 
        color="primary" 
        variant="body2" 
        display="block" 
        sx={{ mt: 1, textAlign: 'center' }}
    >
        Selected: {selectedFileName}
    </Typography>
)}
          </Box>

        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Upload Song'}
          </Button>

        </DialogActions>
      </form>
 
    </Dialog>
  );
}