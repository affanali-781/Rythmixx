export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in', signUp: '/auth/sign-up', resetPassword: '/auth/reset-password' },
  dashboard: {
    overview: '/dashboard',
    account: '/dashboard/account',
    projects: '/dashboard/projects',
    integrations: '/dashboard/integrations',
    settings: '/dashboard/settings',
    editor: '/dashboard/editor',
    genmusic: '/dashboard/genmusic',
  },
  errors: { notFound: '/errors/not-found' },
} as const;
///////////////////////////////////////////////////////////////