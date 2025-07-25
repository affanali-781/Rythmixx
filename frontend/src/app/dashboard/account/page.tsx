'use client';

import * as React from 'react';
// import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';


import { SongsGrid } from '@/components/dashboard/account/songs-grid';
import { AccountInfo } from '@/components/dashboard/account/account-info';


// export const metadata = { title: `Account | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {



  return (
    <Stack spacing={3}>
      <div>
        <Typography sx={{ color: 'white' }} variant="h4">Account</Typography>
      </div>
      <Grid container spacing={3}>
        <Grid lg={4} md={6} xs={12}>
          <AccountInfo />
        </Grid>
        <Grid lg={8} md={6} xs={12}>
          <SongsGrid />
        </Grid>
      </Grid>
    </Stack>
  );
}
