import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

export const navItems = [
  { key: 'music', title: 'Music', href: paths.dashboard.overview, icon: 'music' },
  { key: 'project', title: 'Project', href: paths.dashboard.projects, icon: 'equalizer' },
  { key: 'genmusic', title: 'Generate Music', href: paths.dashboard.genmusic, icon: 'waveform' },
  // { key: 'integrations', title: 'Integrations', href: paths.dashboard.integrations, icon: 'plugs-connected' },
  { key: 'settings', title: 'Settings', href: paths.dashboard.settings, icon: 'gear-six' },
  { key: 'account', title: 'Account', href: paths.dashboard.account, icon: 'user' },
  // { key: 'error', title: 'Error', href: paths.errors.notFound, icon: 'x-square' },
  { key: 'editor', title: 'Audio Editor', href: paths.dashboard.editor, icon: 'sliders' },

] satisfies NavItemConfig[];
// this page is for handling navbar