import { LoginForm } from '@/components/auth/login-form';
import { Bot } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
            <Bot className="h-12 w-12" />
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-primary">
            Robot Maestro
          </h1>
          <p className="mt-1 text-muted-foreground">
            robot dashboard
          </p>
        </div>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Last login: Today at{' '}
          {new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          from your location.
        </p>
      </div>
    </div>
  );
}
