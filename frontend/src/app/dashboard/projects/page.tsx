// NO "use client" directive here (removed completely)
import * as React from 'react';
import type { Metadata } from 'next';
import dayjs from 'dayjs';

import { config } from '@/config';
import type { Project } from '@/components/dashboard/projects/projects-table';
import { ProjectPageClient } from '@/components/dashboard/projects/project-page-client';

// Metadata can stay in the Server Component
export const metadata = { title: `Projects | Dashboard | ${config.site.name}` } satisfies Metadata;

// Sample data - You can use server-side data fetching here if needed
const projects = [
  {
    id: 'PROJ-001',
    name: 'Alcides Antonio',
    avatar: '/assets/avatar-10.png',
    email: 'alcides.antonio@devias.io',
    phone: '908-691-3242',
    address: { city: 'Madrid', country: 'Spain', state: 'Comunidad de Madrid', street: '4158 Hedge Street' },
    createdAt: dayjs().subtract(2, 'hours').toDate(),
  },
  // You can keep your other projects in the array
] satisfies Project[];

// Simple server component that passes data to the client component
export default function Page(): React.JSX.Element {
  return <ProjectPageClient initialProjects={projects} />;
}

