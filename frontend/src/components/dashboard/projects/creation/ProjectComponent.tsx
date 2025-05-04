import React, { useRef, useState, useEffect } from 'react';
import { Button, Box, Typography, Stack, Paper, IconButton, Slider, Tooltip, Tabs, Tab, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
// import DeleteIcon from '@mui/icons-material/Delete';
// import VolumeUpIcon from '@mui/icons-material/VolumeUp';
// import ContentCutIcon from '@mui/icons-material/ContentCut';
// import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
// import PlayArrowIcon from '@mui/icons-material/PlayArrow';
// import PauseIcon from '@mui/icons-material/Pause';

// We need these packages:
// npm install wavesurfer.js @wavesurfer/timeline @wavesurfer/regions

function ProjectComponent() {
  const [tracks, setTracks] = useState<{
    id: string;
    file: File;
    wavesurfer: any;
    volume: number;
    isMuted: boolean;
    isPlaying: boolean;
    regions: any[];
    selectedRegion: any | null;
  }[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterDuration, setMasterDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  
  // Track management functions
  const addTrack = (file: File) => {
    const trackId = `track-${Date.now()}`;
    setTracks(prevTracks => [...prevTracks, {
      id: trackId,
      file,
      wavesurfer: null,
      volume: 1.0,
      isMuted: false,
      isPlaying: false,
      regions: [],
      selectedRegion: null
    }]);
    
    if (!activeTrackId) {
      setActiveTrackId(trackId);
    }
  };
  
  const removeTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.wavesurfer) {
      track.wavesurfer.destroy();
    }
    
    setTracks(tracks.filter(t => t.id !== trackId));
    
    // If we removed the active track, select another one if available
    if (activeTrackId === trackId && tracks.length > 1) {
      const remainingTracks = tracks.filter(t => t.id !== trackId);
      if (remainingTracks.length > 0) {
        setActiveTrackId(remainingTracks[0].id);
      } else {
        setActiveTrackId(null);
      }
    }
  };

  // Initialize wavesurfer instances for each track
  useEffect(() => {
    // Use a new state update to avoid stale closures
    setTracks(currentTracks => {
      // Find tracks that need wavesurfer initialization
      const tracksToInit = currentTracks.filter(t => !t.wavesurfer);
      
      if (tracksToInit.length === 0) return currentTracks;
      
      // Create a copy to update
      const updatedTracks = [...currentTracks];
      
      // Initialize each track
      tracksToInit.forEach(track => {
        const container = document.getElementById(track.id);
        if (container) {
          // Start loading wavesurfer for this track
          import('wavesurfer.js').then(async ({ default: WaveSurfer }) => {
            // Import plugins
            const [
              { default: RegionsPlugin },
              { default: TimelinePlugin }
            ] = await Promise.all([
              import('wavesurfer.js/dist/plugins/regions'),
              import('wavesurfer.js/dist/plugins/timeline')
            ]);
            
            // Create WaveSurfer instance
        const ws = WaveSurfer.create({
              container,
          waveColor: '#4f4f8c',
          progressColor: '#383351',
          cursorColor: '#ffffff',
          barWidth: 2,
          barRadius: 3,
              height: 100,
          normalize: true,
          // channels: 1,

            });
            
            // Load the audio file first before adding plugins
            ws.loadBlob(track.file);
            
            // Add timeline plugin
            const timelinePlugin = ws.registerPlugin(TimelinePlugin.create({
              container: `#timeline-${track.id}`,
              primaryLabelInterval: 10,
              secondaryLabelInterval: 5,
              height: 30
            }));
            
            // Setup event listeners
        ws.on('ready', () => {
              // Update master duration if this is the longest track
              const trackDuration = ws.getDuration();
              if (trackDuration > masterDuration) {
                setMasterDuration(trackDuration);
              }
              
              // Add regions plugin only after the audio is loaded
              const regionsPlugin = ws.registerPlugin(RegionsPlugin.create({
                dragSelection: true,
                color: 'rgba(79, 79, 140, 0.3)'
              } as any));
              
              // Update our track with the wavesurfer instance
              setTracks(currentTracks => {
                const updatedTracks = [...currentTracks];
                const trackIndex = updatedTracks.findIndex(t => t.id === track.id);
                
                if (trackIndex === -1) return updatedTracks;
                
                // Store wavesurfer instance in track state
                updatedTracks[trackIndex].wavesurfer = ws;
                
                // Add event handlers for regions
                if (regionsPlugin) {
                  // Need to clear any previous event listeners to avoid duplicates
                  regionsPlugin.on('region-created', (region) => {
                    // Make a function to handle region creation
                    handleRegionCreated(track.id, region);
                  });
                  
                  regionsPlugin.on('region-clicked', (region) => {
                    handleRegionClicked(track.id, region);
                  });
                }
                
                return updatedTracks;
              });
        });

        ws.on('audioprocess', () => {
          setCurrentTime(ws.getCurrentTime());
        });
        });
        }
      });
      
      return updatedTracks;
    });
    
    // Cleanup function
    return () => {
      tracks.forEach(track => {
        if (track.wavesurfer) {
          track.wavesurfer.destroy();
        }
      });
    };
  }, [tracks.length]);

  // New region handling functions to avoid state update issues
  const handleRegionCreated = (trackId: string, region: any) => {
    setTracks(currentTracks => {
      const updatedTracks = [...currentTracks];
      const trackIndex = updatedTracks.findIndex(t => t.id === trackId);
      
      if (trackIndex === -1) return currentTracks;
      
      // Get the track and wavesurfer instance
      const track = updatedTracks[trackIndex];
      const ws = track.wavesurfer;
      
      if (!ws) return currentTracks;
      
      // Clear existing regions from the UI first
      const existingRegions = ws.getActivePlugins()
        .find((p: any) => p.constructor.name === 'RegionsPlugin')
        ?.getRegions();
      
      if (existingRegions) {
        Object.values(existingRegions).forEach((r: any) => {
          if (r !== region && typeof r.remove === 'function') {
            r.remove();
          }
        });
      }
      
      // Update the track state with the new region
      track.regions = [region];
      track.selectedRegion = region;
      
      return updatedTracks;
    });
  };
  
  const handleRegionClicked = (trackId: string, region: any) => {
    setTracks(currentTracks => {
      const updatedTracks = [...currentTracks];
      const trackIndex = updatedTracks.findIndex(t => t.id === trackId);
      
      if (trackIndex === -1) return currentTracks;
      
      updatedTracks[trackIndex].selectedRegion = region;
      return updatedTracks;
    });
    
    setActiveTrackId(trackId);
  };
  
  // Simplified region clearing that uses the wavesurfer API directly
  const clearRegionSelection = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track?.wavesurfer) return;
    
    // Get regions plugin from wavesurfer
    const regionsPlugin = track.wavesurfer.getActivePlugins()
      .find((p: any) => p.constructor.name === 'RegionsPlugin');
    
    if (!regionsPlugin) return;
    
    // Remove all regions using the plugin's API
    const regions = regionsPlugin.getRegions();
    Object.values(regions).forEach((region: any) => {
      if (typeof region.remove === 'function') {
        region.remove();
      }
    });
    
    // Update track state
    setTracks(tracks => {
      return tracks.map(t => 
        t.id === trackId 
          ? { ...t, regions: [], selectedRegion: null }
          : t
      );
    });
  };
  
  // New function to play a single track
  const playTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.wavesurfer) {
      // Pause other tracks to avoid cacophony
      tracks.forEach(t => {
        if (t.id !== trackId && t.wavesurfer) {
          t.wavesurfer.pause();
        }
      });
      
      track.wavesurfer.play();
      
      // Update track state
      setTracks(tracks => {
        return tracks.map(t => ({
          ...t,
          isPlaying: t.id === trackId
        }));
      });
      
      setIsPlaying(true);
      setActiveTrackId(trackId);
    }
  };
  
  // Play selected region of a track
  const playSelectedRegion = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.wavesurfer && track?.selectedRegion) {
      const region = track.selectedRegion;
      track.wavesurfer.play(region.start, region.end);
      
      setTracks(tracks => {
        return tracks.map(t => ({
          ...t,
          isPlaying: t.id === trackId
        }));
      });
      
      setIsPlaying(true);
      setActiveTrackId(trackId);
    }
  };

  // Global playback controls
  const playAllTracks = () => {
    // Synchronize all tracks to start from the same position
    const startTime = currentTime;
    
    tracks.forEach(track => {
      if (track.wavesurfer) {
        track.wavesurfer.setTime(startTime);
        track.wavesurfer.play();
      }
    });
    
    setIsPlaying(true);
  };
  
  const pauseAllTracks = () => {
    tracks.forEach(track => {
      if (track.wavesurfer) {
        track.wavesurfer.pause();
      }
    });
    
          setIsPlaying(false);
  };
  
  const stopAllTracks = () => {
    tracks.forEach(track => {
      if (track.wavesurfer) {
        track.wavesurfer.stop();
      }
    });
    
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  // Volume control
  const changeTrackVolume = (trackId: string, volume: number) => {
    const updatedTracks = [...tracks];
    const trackIndex = updatedTracks.findIndex(t => t.id === trackId);
    
    if (trackIndex !== -1) {
      updatedTracks[trackIndex].volume = volume;
      if (updatedTracks[trackIndex].wavesurfer) {
        updatedTracks[trackIndex].wavesurfer.setVolume(volume);
      }
      setTracks(updatedTracks);
    }
  };
  
  // Mute/unmute track
  const toggleMute = (trackId: string) => {
    const updatedTracks = [...tracks];
    const trackIndex = updatedTracks.findIndex(t => t.id === trackId);
    
    if (trackIndex !== -1) {
      const track = updatedTracks[trackIndex];
      track.isMuted = !track.isMuted;
      
      if (track.wavesurfer) {
        track.isMuted ? track.wavesurfer.setVolume(0) : track.wavesurfer.setVolume(track.volume);
      }
      
      setTracks(updatedTracks);
    }
  };
  
  // New editing functions
  const trimSelectedRegion = (trackId: string) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1 || !tracks[trackIndex].selectedRegion) return;
    
    const track = tracks[trackIndex];
    const region = track.selectedRegion;
    
    // We need to mix a new audio with only the selected part
    if (track.wavesurfer && track.file) {
      // Stop the track first
      track.wavesurfer.pause();
      
      // To properly trim audio, we would need to:
      // 1. Export the selected region as a new audio buffer
      // 2. Replace the current track with this new buffer
      // This requires additional implementation of audio processing
      
      // For now, we'll show an alert to indicate the feature
      alert(`This would trim the track to keep only the region from ${region.start.toFixed(2)}s to ${region.end.toFixed(2)}s`);
    }
  };
  
  const deleteSelectedRegion = (trackId: string) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1 || !tracks[trackIndex].selectedRegion) return;
    
    const track = tracks[trackIndex];
    const region = track.selectedRegion;
    
    // Similar to trimming, proper implementation would require audio processing
    alert(`This would remove the audio from ${region.start.toFixed(2)}s to ${region.end.toFixed(2)}s`);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        addTrack(files[i]);
      }
    }
  };

  // Format time display (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  // Export the mixed audio
  const exportMixedAudio = async () => {
    if (tracks.length === 0) return;
    
    // For multiple track export, we need Web Audio API
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    
    try {
      // Create buffer sources for each track
      const bufferPromises = tracks.map(async track => {
        if (!track.wavesurfer) return null;
        
        // Get audio data from each track
        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        return {
          buffer: audioBuffer,
          volume: track.volume,
          isMuted: track.isMuted
        };
      });
      
      const trackBuffers = await Promise.all(bufferPromises);
      const validBuffers = trackBuffers.filter(Boolean);
      
      if (validBuffers.length === 0) return;
      
      // Find the longest buffer duration
      const maxDuration = Math.max(...validBuffers.map(buffer => buffer!.buffer.duration));
      
      // Create an offline context for rendering
      const offlineContext = new OfflineAudioContext(
        2, // stereo
        audioContext.sampleRate * maxDuration,
        audioContext.sampleRate
      );
      
      // Mix all tracks
      validBuffers.forEach(trackData => {
        if (!trackData || trackData.isMuted) return;
        
        const source = offlineContext.createBufferSource();
        source.buffer = trackData.buffer;
        
        // Apply volume
        const gainNode = offlineContext.createGain();
        gainNode.gain.value = trackData.volume;
        
        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        
        source.start(0);
      });
      
      // Render the mixed audio
      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert the buffer to a WAV file
      const wavBlob = await bufferToWav(renderedBuffer);
      
      // Download the file
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'mixed-audio.wav';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error exporting audio:", error);
      alert("Failed to export audio. See console for details.");
    }
  };
  
  // Helper function to convert AudioBuffer to WAV
  const bufferToWav = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise(resolve => {
      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2;
      const result = new Float32Array(length);
      let offset = 0;
      
      // Extract channel data
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channel = buffer.getChannelData(i);
        for (let j = 0; j < channel.length; j++) {
          result[offset++] = channel[j];
        }
      }
      
      // Create WAV file
      const dataView = encodeWAV(result, buffer.sampleRate);
      const audioBlob = new Blob([dataView], { type: 'audio/wav' });
      resolve(audioBlob);
    });
  };
  
  // Helper function to encode Float32Array to WAV format
  const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 2, true); // stereo
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    // write PCM samples
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      index += 2;
    }
    
    return view;
  };
  
  // Helper to write a string to a DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const Input = styled('input')({
    display: 'none',
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Music Editor
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <label htmlFor="contained-button-file">
            <Input
              accept="audio/*"
              id="contained-button-file"
              multiple
              type="file"
              onChange={handleFileUpload}
            />
            <Button 
              variant="contained" 
              component="span"
              fullWidth
              color="primary"
            >
              Import Audio Files
            </Button>
          </label>
          
            <Typography variant="body2">
            {tracks.length} audio tracks loaded
          </Typography>
          
          <Stack direction="row" spacing={2}>
            <Button 
              variant="contained" 
              onClick={isPlaying ? pauseAllTracks : playAllTracks}
              color="primary"
            >
              {isPlaying ? 'Pause All' : 'Play All'}
            </Button>
            
            <Button 
              variant="outlined"
              onClick={stopAllTracks}
            >
              Stop
            </Button>
            
            <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
              {formatTime(currentTime)} / {formatTime(masterDuration)}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
      
      {tracks.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Tracks
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Editing Instructions:</strong> Click and drag on a waveform to select a region for editing. Use the buttons to play, trim, or delete selected regions.
          </Typography>
          
          {tracks.map((track) => (
            <Box 
              key={track.id} 
              sx={{ 
                mb: 3, 
                border: activeTrackId === track.id ? '2px solid #6a6ad8' : '1px solid #eee', 
                p: 2, 
                borderRadius: 1,
                backgroundColor: activeTrackId === track.id ? 'rgba(106, 106, 216, 0.05)' : 'transparent'
              }}
              onClick={() => setActiveTrackId(track.id)}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  {track.file.name}
                </Typography>
                
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Toggle Mute">
                    <IconButton 
                      size="small" 
                      onClick={() => toggleMute(track.id)}
                      color={track.isMuted ? "error" : "default"}
                    >
                      {/* <VolumeUpIcon /> */}
                      {track.isMuted ? "Unmute" : "Mute"}
                    </IconButton>
                  </Tooltip>
                  
                  <Slider
                    size="small"
                    value={track.volume}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(_, value) => changeTrackVolume(track.id, value as number)}
                    sx={{ width: 100 }}
                  />
                  
                  <Tooltip title="Play this track">
                    <Button
                      size="small"
                      onClick={() => playTrack(track.id)}
                      variant="outlined"
                    >
                      {/* <PlayArrowIcon /> */}
                      Play
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Remove track">
                    <IconButton 
                      size="small" 
                      onClick={() => removeTrack(track.id)}
                      color="error"
                    >
                      {/* <DeleteIcon /> */}
                      X
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              
              <Box id={`timeline-${track.id}`} sx={{ height: 30, mb: 1 }} />
              <Box 
                id={track.id} 
            sx={{ 
              width: '100%', 
                  height: 100,
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
                  mb: 1
                }}
              />
              
              {/* Edit controls that appear when a region is selected */}
              {track.selectedRegion && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Tooltip title="Play selected region">
                    <Button 
                      size="small" 
                      onClick={() => playSelectedRegion(track.id)}
                      variant="outlined"
                    >
                      {/* <PlayArrowIcon /> */}
                      Play Region
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Keep only the selected region">
            <Button 
                      size="small" 
                      onClick={() => trimSelectedRegion(track.id)}
                      variant="outlined"
            >
                      {/* <ContentCutIcon /> */}
                      Trim to Region
            </Button>
                  </Tooltip>
                  
                  <Tooltip title="Remove the selected region">
                    <Button 
                      size="small" 
                      onClick={() => deleteSelectedRegion(track.id)}
                      variant="outlined"
                      color="error"
                    >
                      {/* <DeleteSweepIcon /> */}
                      Delete Region
                    </Button>
                  </Tooltip>
                  
                  <Button 
                    size="small" 
                    onClick={() => clearRegionSelection(track.id)}
                    variant="text"
                  >
                    Clear Selection
                  </Button>
                </Stack>
              )}
              
              {!track.selectedRegion && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Click and drag on the waveform to select a region for editing
            </Typography>
              )}
            </Box>
          ))}
          
          <Divider sx={{ my: 2 }} />
          
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="success" 
              onClick={exportMixedAudio}
              disabled={tracks.length === 0}
              sx={{ mt: 2 }}
          >
              Export Mixed Audio
          </Button>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Exports all tracks mixed together with their current volume settings
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

export default ProjectComponent;