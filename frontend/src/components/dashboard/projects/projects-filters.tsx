import * as React from 'react';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

export function ProjectsFilters(): React.JSX.Element {
  return (
    <Card sx={{ px: 2, py: 1, background: 'black' }}>
      <OutlinedInput
        
        defaultValue=""
        fullWidth
        placeholder="Search project"
        startAdornment={
          <InputAdornment position="start" sx={{ color: 'white' }}>
            <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
          </InputAdornment>
        }
        sx={{ maxWidth: '500px', color: 'white' }}
      />
    </Card>
  );
}
