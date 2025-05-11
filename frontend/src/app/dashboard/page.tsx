import * as React from 'react';
import type { Metadata } from 'next';
import { config } from '@/config';
import { MusicGrid } from '@/components/dashboard/MusicGrid';
export const metadata = { title: `Overview | Dashboard | ${config.site.name}` } satisfies Metadata;
export default function Page(): React.JSX.Element {
  return (
    <MusicGrid />
  );
}
