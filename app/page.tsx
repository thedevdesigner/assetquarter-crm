import { cookies } from 'next/headers'; // Note: 'next/headers'
import { redirect } from 'next/navigation';
import { Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    'use server';
    const username = formData.get('username');
    const password = formData.get('password');

    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'password123';

    if (username === adminUser && password === adminPass) {
      // Set secure HTTP-only session cookie
      (await cookies()).set({
        name: 'admin_session',
        value: 'authenticated',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week session
      });

      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border rounded-2xl shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Restricted Access</h1>
          <p className="text-sm text-muted-foreground">Enter your master credentials to access the property pipeline</p>
        </div>

        <form action={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input 
                name="username" 
                type="text" 
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Admin username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input 
                name="password" 
                type="password" 
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 font-semibold text-base">
            Access Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
}