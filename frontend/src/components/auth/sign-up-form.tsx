'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';

const schema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required' }),
  lastName: zod.string().min(1, { message: 'Last name is required' }),
  email: zod.string().min(1, { message: 'Email is required' }).email(),
  password: zod.string().min(6, { message: 'Password should be at least 6 characters' }),
  terms: zod.boolean().refine((value) => value, 'You must accept the terms and conditions'),
});

type Values = zod.infer<typeof schema>;

const defaultValues = { firstName: '', lastName: '', email: '', password: '', terms: false } satisfies Values;

export function SignUpForm(): React.JSX.Element {
  const router = useRouter();

  const { checkSession } = useUser();

  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [signupSuccess, setSignupSuccess] = React.useState<boolean>(false);
  const [signupEmail, setSignupEmail] = React.useState<string>('');


  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setIsPending(true);

      const { error, needsEmailConfirmation } = await authClient.signUp(values);

      if (error) {
        setError('root', { type: 'server', message: error });
        setIsPending(false);
        return;
      }
      if (needsEmailConfirmation) {
        // Store the email for showing in the success message
        setSignupEmail(values.email);
        setSignupSuccess(true);
        setIsPending(false);
      } else {
      // Refresh the auth state
      await checkSession?.();

      // UserProvider, for this case, will not refresh the router
      // After refresh, GuestGuard will handle the redirect
      router.refresh();
      }
    },
    [checkSession, router, setError]
  );

   // If sign-up was successful and needs email verification, show success message
   if (signupSuccess) {
    return (
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4" color="white">Verification Email Sent</Typography>
          <Typography color="text.secondary" variant="body2">
            We've sent a verification link to <strong>{signupEmail}</strong>.
          </Typography>
        </Stack>
        
        <Alert severity="success" sx={{backgroundColor: '#1a1a1a', color: 'text.secondary'}}>
          Please check your email and click the verification link to complete your registration.
        </Alert>
        
        <Button component={RouterLink} href={paths.auth.signIn} variant="contained">
          Return to Sign In
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" color="white">Sign up</Typography>
        <Typography color="text.secondary" variant="body2">
          Already have an account?{' '}
          <Link component={RouterLink} href={paths.auth.signIn} underline="hover" variant="subtitle2">
            Sign in
          </Link>
        </Typography>
      </Stack>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <FormControl error={Boolean(errors.firstName)}>
                <InputLabel style={{color: 'white'}}>First name</InputLabel>
                <OutlinedInput {...field} sx={{backgroundColor: '#1a1a1a', color: 'text.secondary'}} label="First name" />
                {errors.firstName ? <FormHelperText>{errors.firstName.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <FormControl error={Boolean(errors.firstName)}>
                <InputLabel style={{color: 'white'}}>Last name</InputLabel>
                <OutlinedInput {...field} sx={{backgroundColor: '#1a1a1a', color: 'text.secondary'}} label="Last name" />
                {errors.firstName ? <FormHelperText>{errors.firstName.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <FormControl error={Boolean(errors.email)}>
                <InputLabel style={{color: 'white'}}>Email address</InputLabel>
                <OutlinedInput {...field} label="Email address" type="email" sx={{backgroundColor: '#1a1a1a', color: 'text.secondary'}} />
                {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormControl error={Boolean(errors.password)}>
                <InputLabel style={{color: 'white'}}>Password</InputLabel>
                <OutlinedInput {...field} label="Password" type="password" sx={{backgroundColor: '#1a1a1a', color: 'text.secondary'}} />
                {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
              </FormControl>
            )}
          />
          <Controller
            control={control}
            name="terms"
            render={({ field }) => (
              <div>
                <FormControlLabel
                  control={<Checkbox {...field} />}
                  label={
                    <React.Fragment>
                      <Typography style={{color: 'white'}}>I have read the <Link>terms and conditions</Link></Typography>
                      
                    </React.Fragment>
                  }
                />
                {errors.terms ? <FormHelperText error>{errors.terms.message}</FormHelperText> : null}
              </div>
            )}
          />
          {errors.root ? <Alert color="error">{errors.root.message}</Alert> : null}
          <Button disabled={isPending} type="submit" variant="contained">
            Sign up
          </Button>
        </Stack>
      </form>
      <Alert color="warning" sx={{backgroundColor: '#1a1a1a', color: 'text.secondary'}}>Created users are not persisted</Alert>
    </Stack>
  );
}
