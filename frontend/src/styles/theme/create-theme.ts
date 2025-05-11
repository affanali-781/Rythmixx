import { experimental_extendTheme as extendTheme } from '@mui/material/styles';

import { colorSchemes } from './color-schemes';
import { components } from './components/components';
import { shadows } from './shadows';
import type { Theme } from './types';
import { typography } from './typography';

declare module '@mui/material/styles/createPalette' {
  interface PaletteRange {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  }

  interface Palette {
    neutral: PaletteRange;
  }

  interface PaletteOptions {
    neutral?: PaletteRange;
  }

  interface TypeBackground {
    level1: string;
    level2: string;
    level3: string;
  }
}

export function createTheme(): Theme {
  const theme = extendTheme({
    breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1440 } },
    components,
    colorSchemes: {
      light: {
        palette: {
          background: {
            default: '#ffffff',
            paper: '#ffffff',
            level1: '#f8f9fa',
            level2: '#f0f2f5',
            level3: '#e9ecef'
          },
          text: {
            primary: '#1a1a1a',
            secondary: '#666666'
          },
          // ... other color configurations
        }
      },
      dark: {
        palette: {
          background: {
            default: '#121212',
            paper: '#1e1e1e',
            level1: '#2d2d2d',
            level2: '#424242',
            level3: '#616161'
          },
          text: {
            primary: '#ffffff',
            secondary: '#b3b3b3'
          }
          // ... other color configurations
        }
      }
    },
    shadows,
    shape: { borderRadius: 8 },
    typography,
  });

  return theme;
}
