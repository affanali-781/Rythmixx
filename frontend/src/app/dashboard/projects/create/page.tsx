'use client';
import React from 'react';
import { Typography, Box, Container } from '@mui/material';
import { config } from '@/config';
import ProjectComponent from '@/components/dashboard/projects/creation/ProjectComponent';

export default function CreateProjectPage(): React.JSX.Element {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">Create New Project</Typography>
        <Typography variant="body2" color="text.secondary">
          Create and edit your audio project
        </Typography>
      </Box>
      
      <ProjectComponent />
    </Container>
  );
} 