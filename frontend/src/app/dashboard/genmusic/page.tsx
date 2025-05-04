'use client';

import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MusicNotes } from '@phosphor-icons/react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

export default function GenMusicPage() {
    const [formData, setFormData] = useState({
        lyrics: '',
        tagsLyrics: 'lofi, chill', // Default tags
        lyricsInput: '',          // Initial input lyrics
        audioFile: null as File | null
    });
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFormData(prev => ({
                ...prev,
                audioFile: event.target.files![0]
            }));
        }
    };

    const handleGenerateLyrics = async () => {
        setLoading(true);
        setError(null);
        setDebugInfo('');
        setAudioUrl(null);
    
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('lrc', formData.lyricsInput || 'Default lyrics input');
            formDataToSend.append('text_prompt', formData.tagsLyrics || 'lofi, chill');
            formDataToSend.append('prompt_type', 'text');
            formDataToSend.append('seed', '42');
            formDataToSend.append('randomize_seed', 'false');
            formDataToSend.append('steps', '32');
            formDataToSend.append('cfg_strength', '4.0');
            formDataToSend.append('file_type', 'wav');
            formDataToSend.append('odeint_method', 'euler');
            formDataToSend.append('music_duration', '95s');
    
            if (formData.audioFile) {
                formDataToSend.append('audio_prompt', formData.audioFile);
                formDataToSend.set('prompt_type', 'audio');
            }
    
            console.log('Sending FormData:', [...formDataToSend.entries()]);
    
            const response = await fetch('/api/generate-music', {
                method: 'POST',
                body: formDataToSend,
            });
    
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setDebugInfo(`Generated audio is ready to play. Timestamp: ${new Date().toISOString()}`);
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${errorText}`);
            }
    
        } catch (err) {
            console.error('Error details:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate music');
        } finally {
            setLoading(false);
        }
    };
    


    // const handleGenerateLyrics = async () => {
    //     setLoading(true);
    //     setError(null);
    //     setDebugInfo('');
    
    //     try {
    //         // Build FormData
    //         const formDataToSend = new FormData();
    //         formDataToSend.append('tags_lyrics', formData.tagsLyrics);
    //         formDataToSend.append('lyrics_input', formData.lyricsInput || 'Default lyrics input');
    
    //         if (formData.audioFile) {
    //             formDataToSend.append('audio_prompt', formData.audioFile);
    //         }
    
    //         console.log('Sending FormData:', [...formDataToSend.entries()]);
    
    //         const response = await fetch('/api/generate-music', {
    //             method: 'POST',
    //             body: formDataToSend
    //         });
    
    //         // const responseText = await response.text();
    //         // console.log('Raw response:', responseText);
    
    //         // let responseData;
    //         // try {
    //         //     responseData = JSON.parse(responseText);
    //         // } catch (parseError) {
    //         //     console.error('Failed to parse response:', responseText);
    //         //     throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
    //         // }
    
    //         // setDebugInfo(JSON.stringify({
    //         //     request: Object.fromEntries(formDataToSend.entries()),
    //         //     response: responseData,
    //         //     status: response.status,
    //         //     timestamp: new Date().toISOString()
    //         // }, null, 2));

    //         if (response.headers.get('Content-Type')?.includes('audio')) {
    //             const audioBlob = await response.blob();
    //             const url = URL.createObjectURL(audioBlob);
    //             console.log("audioUrl:", url);
    //             setAudioUrl(url);
    //             return; // Skip the rest
    //         }
            
    //         // if (!response.ok) {
    //         //     const errorMsg = responseData.detail?.[0]?.msg ||
    //         //         responseData.error ||
    //         //         'Failed to generate lyrics';
    //         //     throw new Error(errorMsg);
    //         // }
    
    //         // if (typeof responseData === 'string') {
    //         //     setFormData(prev => ({
    //         //         ...prev,
    //         //         lyrics: responseData
    //         //     }));
    //         // } else {
    //         //     throw new Error('Unexpected response format');
    //         // }
    //     } catch (err) {
    //         console.error('Error details:', err);
    //         setError(err instanceof Error ? err.message : 'Failed to generate lyrics');
    //     } finally {
    //         setLoading(false);
    //     }
    // };


    useEffect(() => {
        return () => {
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
        };
      }, [audioUrl]);
      
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleGenerateLyrics();
    };

    return (
        <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
                <Card sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: '20px',
                    boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                            ? '0 5px 22px 0 rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.12)'
                            : '0 5px 22px 0 rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                }}>
                    <CardHeader
                        title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <MusicNotes size={32} />
                                <Typography variant="h4">Generate Music</Typography>
                            </Box>
                        }
                    />
                    <CardContent>
                        <Stack spacing={3}>
                            {/* Lyrics Input Field */}
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Lyrics Input:
                                </Typography>
                                <TextField
                                    multiline
                                    rows={4}
                                    fullWidth
                                    value={formData.lyricsInput}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lyricsInput: e.target.value }))}
                                    placeholder="Enter initial lyrics..."
                                    required
                                    sx={{
                                        backgroundColor: 'background.level1',
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: 'divider',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'primary.main',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Tags Input Field */}
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Lyrics Tags:
                                </Typography>
                                <TextField
                                    fullWidth
                                    value={formData.tagsLyrics}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        tagsLyrics: e.target.value
                                    }))}
                                    placeholder="Enter tags (e.g., lofi, chill, relaxing)"
                                    required
                                    sx={{
                                        backgroundColor: 'background.level1',
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: 'divider',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'primary.main',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Generated Lyrics Field */}
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Generated Lyrics (LRC Format):
                                </Typography>
                                <TextField
                                    multiline
                                    rows={6}
                                    fullWidth
                                    value={formData.lyrics}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lyrics: e.target.value }))}
                                    placeholder="Generated lyrics will appear here..."
                                    sx={{
                                        backgroundColor: 'background.level1',
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: 'divider',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'primary.main',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Audio File Upload */}
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Audio Prompt File (WAV):
                                </Typography>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    sx={{
                                        borderColor: 'divider',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                        },
                                    }}
                                >
                                    Choose file
                                    <input
                                        type="file"
                                        hidden
                                        accept=".wav"
                                        onChange={handleFileChange}
                                    />
                                </Button>
                                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                    {formData.audioFile ? formData.audioFile.name : 'No file chosen'}
                                </Typography>
                            </Box>

                            {/* Error Display */}
                            {error && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            {/* Debug Info */}
                            {debugInfo && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {debugInfo}
                                    </Typography>
                                </Alert>
                            )}
                        </Stack>
                    </CardContent>
                    {audioUrl && (
    <CardContent>
        <Typography variant="h6" gutterBottom>Generated Music:</Typography>
        <audio src={audioUrl} controls style={{ width: '100%' }} />
    </CardContent>
)}

                    <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading || !formData.lyricsInput || !formData.tagsLyrics}
                            sx={{ minWidth: 120 }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Generate'
                            )}
                        </Button>
                    </CardActions>
                </Card>
            </form>
        </Box>
    );
}
