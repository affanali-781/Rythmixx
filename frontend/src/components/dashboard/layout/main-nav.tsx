'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';


import { usePopover } from '@/hooks/use-popover';
import { Logo } from '@/components/core/logo';
import { paths } from '@/paths';
import { isNavItemActive } from '@/lib/is-nav-item-active';
import type { NavItemConfig } from '@/types/nav';

import { MobileNav } from './mobile-nav';
import { UserPopover } from './user-popover';
import { navItems } from './config';
import { navIcons } from './nav-icons';

export function MainNav(): React.JSX.Element {
  const [openNav, setOpenNav] = React.useState<boolean>(false);
  const pathname = usePathname();
  const userPopover = usePopover<HTMLDivElement>();

  return (
    <React.Fragment>
      <Box
        component="header"
        sx={{
          // borderBottom: '1px solid var(--mui-palette-divider)',
          borderBottom: '#252525',
          // backgroundColor: 'var(--mui-palette-background-paper)',
          backgroundColor: 'black',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--mui-zIndex-appBar)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', px: 2 }}
        >
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            <IconButton
              onClick={(): void => {
                setOpenNav(true);
              }}
              sx={{ display: { lg: 'none' } }}
            >
              <ListIcon />
            </IconButton>
            <Box component={RouterLink} href={paths.dashboard.overview} sx={{ display: 'inline-flex', mr: 2 }}>
              {/* <Logo height={32} width={122} /> */}
              <Logo height={62} width={'auto'} />
            </Box>
            <Box 
              component="nav" 
              sx={{ 
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1
              }}
            >
              {navItems.map(({ key, ...itemProps }) => (
  <NavItem key={key} pathname={pathname} {...itemProps} />
))}
            </Box>
          </Stack>
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
            
            <Avatar
              onClick={userPopover.handleOpen}
              ref={userPopover.anchorRef}
              src="/assets/avatar.png"
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
        </Stack>
      </Box>
      <UserPopover anchorEl={userPopover.anchorRef.current} onClose={userPopover.handleClose} open={userPopover.open} />
      <MobileNav
        onClose={() => {
          setOpenNav(false);
        }}
        open={openNav}
      />
    </React.Fragment>
  );
}

// Helper component for nav items
function NavItem({ disabled, external, href, icon, matcher, pathname, title }: Omit<NavItemConfig, 'items'> & { pathname: string }): React.JSX.Element {
  const active = isNavItemActive({ disabled, external, href, matcher, pathname });
  const Icon = icon ? navIcons[icon] : null;

  return (
    <Box
      {...(href
        ? {
            component: external ? 'a' : RouterLink,
            href,
            target: external ? '_blank' : undefined,
            rel: external ? 'noreferrer' : undefined,
          }
        : { role: 'button' })}
      sx={{
        alignItems: 'center',
        borderRadius: 1,
        color: active ? 'primary.main' : 'white',
        cursor: 'pointer',
        display: 'flex',
        gap: 1,
        px: 2,
        py: 1,
        textDecoration: 'none',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        ...(disabled && {
          color: 'text.disabled',
          cursor: 'not-allowed',
        }),
        ...(active && { 
          bgcolor: 'action.selected'
        }),
      }}
    >
      {Icon && (
        <Icon
          fontSize="var(--icon-fontSize-md)"
          weight={active ? 'fill' : undefined}
        />
      )}
      <Typography
        component="span"
        sx={{ 
          fontSize: '0.875rem', 
          fontWeight: 500
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}
