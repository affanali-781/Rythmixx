'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';

export function UpdatePasswordForm(): React.JSX.Element {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    
    >
      <Card sx={{ backgroundColor: 'black', color: 'white' }}>
        <CardHeader subheader="Update password" title="Password" />
        <Divider sx={{ borderColor: '#2b2b2b' }} />
        <CardContent>
          <Stack spacing={3} sx={{ maxWidth: 'sm' }}>
            <FormControl sx={{ border: '0.5px solid #373737',overflow: 'hidden', borderRadius: '10px' }} fullWidth>
              <InputLabel sx={{ color: 'white' }}>Password</InputLabel>
              <OutlinedInput label="Password" name="password" type="password" />
            </FormControl>
            <FormControl sx={{ border: '0.5px solid #373737',overflow: 'hidden', borderRadius: '10px' }} fullWidth>
              <InputLabel sx={{ color: 'white' }}>Confirm password</InputLabel>
              <OutlinedInput label="Confirm password" name="confirmPassword" type="password" />
            </FormControl>
          </Stack>
        </CardContent>
        <Divider sx={{ borderColor: '#2b2b2b' }} />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained">Update</Button>
        </CardActions>
      </Card>
    </form>
  );
}
