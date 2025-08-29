
"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

export default function LoginPage() {
  const [lastLoginTime, setLastLoginTime] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This is safe to run on the client only.
    setLastLoginTime(
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
    
    const handleMouseMove = (e: MouseEvent) => {
      const card = cardRef.current;
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };

  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center animated-background px-4">
      <div ref={cardRef} className="w-full max-w-md glow-card rounded-xl p-px animate-in fade-in-50 slide-in-from-bottom-10 duration-1000">
        <div className="rounded-[calc(0.75rem-1px)] bg-card/80 backdrop-blur-sm">
          <div className="mb-8 flex flex-col items-center text-center pt-10">
            <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary animate-in fade-in-50 zoom-in-75 delay-300 duration-500">
              <Bot className="h-12 w-12" />
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tighter text-primary animate-in fade-in-50 slide-in-from-bottom-5 delay-500 duration-500">
              Robot Maestro
            </h1>
            <p className="mt-1 text-muted-foreground animate-in fade-in-50 slide-in-from-bottom-5 delay-700 duration-500">
              AI-powered Robot Framework Dashboard
            </p>
          </div>
          <div className="animate-in fade-in-50 slide-in-from-bottom-5 delay-900 duration-500">
            <LoginForm />
          </div>
          <div className="p-6 pt-2 text-center animate-in fade-in-50 slide-in-from-bottom-5 delay-1000 duration-500">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Register
              </Link>
            </p>
            {lastLoginTime && (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Last login: Today at {lastLoginTime} from your location.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
