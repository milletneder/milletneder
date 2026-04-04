'use client';

import PhoneAuthForm from './PhoneAuthForm';
import FirebaseAuthForm from './FirebaseAuthForm';

type AuthMethod = 'email' | 'phone';

interface AuthFormProps {
  method: AuthMethod;
  onAuthenticated: (tokenOrPhone: string, extraData?: { password?: string }) => void;
  onDirectLogin?: (token: string) => void;
  onBack?: () => void;
  loginOnly?: boolean;
  onRegistrationNeeded?: () => void;
}

export default function AuthForm({ method, ...props }: AuthFormProps) {
  if (method === 'phone') {
    return <PhoneAuthForm {...props} />;
  }
  return <FirebaseAuthForm method={method} {...props} />;
}
