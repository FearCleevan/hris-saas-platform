import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your HRISPH account.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-16">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-1 font-bold text-2xl mb-8">
        <span className="text-[#0038a8]">HRIS</span>
        <span className="text-[#ce1126]">PH</span>
      </Link>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-extrabold text-foreground mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in to your HRISPH account
        </p>

        <LoginForm />

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#0038a8] dark:text-blue-400 font-medium hover:underline">
              Start your 14-day free trial
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-sm">
        By signing in, you agree to our{' '}
        <Link href="/terms-of-service" className="hover:underline">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
