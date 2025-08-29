import { RegisterForm } from '@/components/auth/register-form';
import { Bot } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
            <Bot className="h-12 w-12" />
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tighter text-primary">
            Create an Account
          </h1>
          <p className="mt-1 text-muted-foreground">
            Join Robot Maestro to start orchestrating your tests.
          </p>
        </div>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
