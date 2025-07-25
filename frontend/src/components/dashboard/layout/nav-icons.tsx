import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChartPie as ChartPieIcon } from '@phosphor-icons/react/dist/ssr/ChartPie';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { PlugsConnected as PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { XSquare } from '@phosphor-icons/react/dist/ssr/XSquare';
import { PlayCircle as PlayIcon } from '@phosphor-icons/react/dist/ssr/PlayCircle';
import { Equalizer as EqualizerIcon } from '@phosphor-icons/react/dist/ssr/Equalizer';
import { Sliders as SlidersIcon } from '@phosphor-icons/react/dist/ssr/Sliders';
import { Waveform as WaveformIcon } from '@phosphor-icons/react/dist/ssr/Waveform';
////////////////////////////////////////////////
////////////////////////////////////////////////

export const navIcons = {
  'chart-pie': ChartPieIcon,
  'gear-six': GearSixIcon,
  'plugs-connected': PlugsConnectedIcon,
  'x-square': XSquare,
  'sliders': SlidersIcon,
  user: UserIcon,
  users: UsersIcon,
  'music': PlayIcon,
  'equalizer': EqualizerIcon,
  'waveform': WaveformIcon,
} as Record<string, Icon>;
