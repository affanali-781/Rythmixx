'use client';

import { useContext } from 'react';
import { UserContext, UserContextValue } from '@/contexts/user-context';
import { authClient } from '@/lib/auth/client';
import type { SignUpParams, SignInWithPasswordParams, ResetPasswordParams } from '@/lib/auth/client';

export const useAuth = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }

  const { user, error, isLoading, checkSession } = context;

  const signUp = async (params: SignUpParams) => {
    const result = await authClient.signUp(params);
    await checkSession?.();
    return result;
  };

  const signInWithPassword = async (params: SignInWithPasswordParams) => {
    const result = await authClient.signInWithPassword(params);
    await checkSession?.();
    return result;
  };

  const signInWithGoogle = async () => {
    const result = await authClient.signInWithOAuth({ provider: 'google' });
    await checkSession?.();
    return result;
  };

  const signInWithDiscord = async () => {
    const result = await authClient.signInWithOAuth({ provider: 'discord' });
    await checkSession?.();
    return result;
  };

  const resetPassword = async (params: ResetPasswordParams) => {
    return await authClient.resetPassword(params);
  };

  const updatePassword = async (password: string) => {
    const result = await authClient.updatePassword({ password });
    await checkSession?.();
    return result;
  };

  const signOut = async () => {
    const result = await authClient.signOut();
    await checkSession?.();
    return result;
  };

  return {
    user,
    error,
    isLoading,
    signUp,
    signInWithPassword,
    signInWithGoogle,
    signInWithDiscord,
    resetPassword,
    updatePassword,
    signOut,
    checkSession
  };
}; 