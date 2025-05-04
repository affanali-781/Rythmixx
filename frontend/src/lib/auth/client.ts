'use client';

import type { User } from '@/types/user';
import { createClient } from '@/lib/supabase/client';
import { any, boolean } from 'zod';

export interface SignUpParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignInWithOAuthParams {
  provider: 'google' | 'discord';
}

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
}

class AuthClient {
  private supabase = createClient();
  
  async signUp(params: SignUpParams): Promise<{ error?: string, needsEmailConfirmation?:any }> {
    const { email, password, firstName, lastName } = params;
    
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) {
      return { error: error.message };
    }

    // Supabase returns user data and a confirmationSentAt timestamp when email confirmation is required
    const needsEmailConfirmation = data?.user && !data.user.confirmed_at && data.user.confirmation_sent_at;

    return { 
      needsEmailConfirmation:any
    };
  }

  async signInWithOAuth(params: SignInWithOAuthParams): Promise<{ error?: string }> {
    const { provider } = params;
    
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  async signInWithPassword(params: SignInWithPasswordParams): Promise<{ error?: string }> {
    const { email, password } = params;
    
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  async resetPassword(params: ResetPasswordParams): Promise<{ error?: string }> {
    const { email } = params;
    
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  async updatePassword(params: { password: string }): Promise<{ error?: string }> {
    const { password } = params;
    
    const { error } = await this.supabase.auth.updateUser({
      password
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error) {
      return { error: error.message };
    }

    if (!user) {
      return { data: null };
    }

    return { 
      data: {
        id: user.id,
        email: user.email,
        name: user.user_metadata.first_name + ' ' + user.user_metadata.last_name,
        avatar: user.user_metadata.avatar_url
      } 
    };
  }

  async signOut(): Promise<{ error?: string }> {
    try {
      // First, clear local storage
      if (typeof window !== 'undefined') {
        // Clear any existing Supabase tokens
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-rythmix-auth-token');
      }

      // Then sign out with Supabase
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err) {
      console.error('Sign out error:', err);
      return { error: 'An error occurred during sign out' };
    }
  }
}

export const authClient = new AuthClient();

export { createClient };
