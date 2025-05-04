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
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Grid from '@mui/material/Unstable_Grid2';

const states = [
  { value: 'alabama', label: 'Alabama' },
  { value: 'new-york', label: 'New York' },
  { value: 'san-francisco', label: 'San Francisco' },
  { value: 'los-angeles', label: 'Los Angeles' },
] as const;

export function AccountDetailsForm(): React.JSX.Element {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Card sx={{ backgroundColor: 'black', color: 'white' }}>
        <CardHeader subheader="The information can be edited" title="Profile" />
        <Divider sx={{ borderColor: '#2b2b2b' }} />
        <CardContent>
          <Grid container spacing={3}>
            <Grid md={6} xs={12}>
              <FormControl required fullWidth sx={{ border: '0.5px solid #373737', borderRadius: '10px' }}>
                <InputLabel sx={{ color: 'white' }}>First name</InputLabel>
                <OutlinedInput sx={{ color: 'gray' }} defaultValue="Sofia" label="First name" name="firstName" />
              </FormControl>
            </Grid>
            <Grid md={6} xs={12}>
              <FormControl required fullWidth sx={{ border: '0.5px solid #373737', borderRadius: '10px' }}>
                <InputLabel sx={{ color: 'white' }}>Last name</InputLabel>
                <OutlinedInput sx={{ color: 'gray' }} defaultValue="Rivers" label="Last name" name="lastName" />
              </FormControl>
            </Grid>
            <Grid md={6} xs={12}>
              <FormControl required fullWidth sx={{ border: '0.5px solid #373737', borderRadius: '10px' }}>
                <InputLabel sx={{ color: 'white' }}>Email address</InputLabel>
                <OutlinedInput sx={{ color: 'gray' }} defaultValue="sofia@devias.io" label="Email address" name="email" />
              </FormControl>
            </Grid>
            <Grid md={6} xs={12}>
              <FormControl required fullWidth sx={{ border: '0.5px solid #373737', borderRadius: '10px' }}>
                <InputLabel sx={{ color: 'gray' }}>Phone number</InputLabel>
                <OutlinedInput sx={{ color: 'gray' }} label="Phone number" name="phone" type="tel" />
              </FormControl>
            </Grid>
            {/* <Grid md={6} xs={12}>
              <FormControl required fullWidth sx={{ border: '0.5px solid #373737',overflow: 'hidden', borderRadius: '10px' }}>
                <InputLabel sx={{ color: 'white' }}>State</InputLabel>
                <Select sx={{ color: 'white' }} defaultValue="New York" label="State" name="state" variant="outlined">
                  {states.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid> */}
            <Grid md={6} xs={12}>
              <FormControl required fullWidth sx={{ border: '0.5px solid #373737', borderRadius: '10px' }}>
                <InputLabel sx={{ color: 'gray' }}>City</InputLabel>
                <OutlinedInput label="City" />
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
        <Divider sx={{ borderColor: '#2b2b2b' }} />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained">Save details</Button>
        </CardActions>
      </Card>
    </form>
  );
}
