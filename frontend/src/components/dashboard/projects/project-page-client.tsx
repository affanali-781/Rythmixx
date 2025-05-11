'use client'; // Mark this component as a Client Component

import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// Import client-safe versions or ensure icons don't break server rendering if used differently
import { Plus as PlusIcon } from '@phosphor-icons/react';
import { Upload as UploadIcon } from '@phosphor-icons/react';
// Remove DownloadIcon if not used here, or ensure it's client-safe

// Import ProjectComponent
import ProjectComponent from '@/components/dashboard/projects/creation/ProjectComponent';

// Import child components used in the client logic
import { ProjectsFilters } from '@/components/dashboard/projects/projects-filters'; // Adjust path if needed
import { ProjectsTable } from '@/components/dashboard/projects/projects-table'; // Adjust path if needed
import type { Project } from '@/components/dashboard/projects/projects-table'; // Adjust path if needed
import { UploadSongModal } from '@/components/dashboard/projects/upload-song'; // Adjust path if needed
import { createClient } from '@/lib/supabase/client'; // Add this import
import Snackbar from '@mui/material/Snackbar';
import { Alert, CircularProgress } from '@mui/material';

// Helper function - can stay here or be moved to a utils file
function applyPagination(rows: Project[], page: number, rowsPerPage: number): Project[] {
  // Basic client-side pagination example
  return rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}

// Define props if the Server Component needs to pass data down
interface ProjectPageClientProps {
  initialProjects: Project[]; // Receive initial data from the server component
}

export function ProjectPageClient({ initialProjects }: ProjectPageClientProps): React.JSX.Element {
  // All the state and handlers are moved here
  const [page, setPage] = React.useState(0); // Add state for pagination if needed
  const [rowsPerPage, setRowsPerPage] = React.useState(5); // Add state for pagination
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  // TODO: Update this logic based on how a project is actually selected for upload
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(initialProjects?.[0]?.id ?? null); // Default to first project ID

  const handleOpenModal = async () => {
    if (!selectedProjectId) {
      // Consider using a more integrated notification system (e.g., Snackbar)
      alert("Please select a project to upload to.");
      // TODO: Implement project selection UI if needed (e.g., a dropdown, or clicking a button on a specific project row)
      return;
    }
    
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      // Verify user is authenticated before opening modal
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data?.user?.id) {
        console.error('Authentication error:', error?.message || 'No user ID found');
        setErrorMsg('Please log in before uploading a song');
        return;
      }
      
      // Check if user has permission to upload to this project
    //   const userId = data.user.id;
    //   const { data: projectData, error: projectError } = await supabase
    //     .from('projects')
    //     .select('owner')
    //     .eq('id', selectedProjectId)
    //     .single();
      
    //   if (projectError) {
    //     console.error('Error fetching project:', projectError);
    //     setErrorMsg('Could not verify project access');
    //     return;
    //   }
      
    //   if (projectData?.owner !== userId) {
    //     console.error('Permission denied: User does not own this project');
    //     setErrorMsg('You do not have permission to upload to this project');
    //     return;
    //   }
      
      // User is authenticated and owns the project, open the modal
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setErrorMsg('Authentication error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleUploadSuccess = () => {
    console.log("Upload successful! TODO: Refresh project/song data");
    // Implement data fetching/state update logic here
    // For example, refetch the initialProjects list
    handleCloseModal(); // Close modal on success
  };

  // Use the passed initialProjects. Pagination logic is client-side here.
  // For server-side pagination, you'd handle page/rowsPerPage changes and fetch new data.
  const paginatedProjects = applyPagination(initialProjects, page, rowsPerPage);

  // TODO: Add handlers for changing page and rowsPerPage for the ProjectsTable if implementing full pagination

  return (
    <Stack spacing={3}>
      {/* Header Section */}
      <Stack direction="row" spacing={3}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4" sx={{color: 'white'}}>Projects</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button 
              onClick={handleOpenModal} 
              color="inherit" 
              startIcon={<UploadIcon color='white' />}
              disabled={isLoading}
              sx={{color: 'white'}}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" />  : 'Upload Song'}
            </Button>
            {errorMsg && (
              <Typography color="error" variant="caption">
                {errorMsg}
              </Typography>
            )}
            {/* Add other buttons like Download if needed */}
          </Stack>
        </Stack>
        <div>
          <Button 
            startIcon={<PlusIcon />} 
            onClick={() => {
              // Here we could either:
              // 1. Navigate to a project creation page
              window.location.href = '/dashboard/projects/create';
              // 2. Or implement a modal to show the ProjectComponent
            }} 
            variant="contained"
          >
            Create Project
          </Button>
        </div>
      </Stack>

      {/* Filters and Table */}
      <ProjectsFilters /> {/* Add filter state management here if needed */}
      <ProjectsTable
        count={initialProjects.length} // Total count for pagination
        page={page}
        rows={paginatedProjects} // Display paginated rows
        rowsPerPage={rowsPerPage}
        // Pass handlers for onPageChange, onRowsPerPageChange if implementing table pagination controls
      />

      {/* Modal Rendering - logic remains the same */}
      <UploadSongModal
        open={isModalOpen}
        showSuccessToast={showSuccessToast}
        setShowSuccessToast={setShowSuccessToast}
        onClose={handleCloseModal}
        projectId={selectedProjectId ?? ''} // Pass state
        onUploadSuccess={handleUploadSuccess}
      />
           <Snackbar
  open={showSuccessToast}
  autoHideDuration={6000}
  onClose={() => setShowSuccessToast(false)}
  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
>
  <Alert   
    onClose={() => setShowSuccessToast(false)} 
    severity="success" 
    sx={{ width: '100%' }}
  >
    Song uploaded successfully!
  </Alert>
</Snackbar>
    </Stack>
  );
}