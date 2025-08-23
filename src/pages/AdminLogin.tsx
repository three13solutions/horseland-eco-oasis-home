import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    console.debug('[AdminLogin] Setting up auth check');

    // Helper function to check admin status with deferred Supabase calls
    const handleSession = (session: any) => {
      if (!session?.user) {
        console.debug('[AdminLogin] No session, stopping auth check');
        setAuthChecking(false);
        return;
      }

      console.debug('[AdminLogin] Session found, deferring admin check');
      // Defer admin profile check to avoid deadlock
      setTimeout(async () => {
        if (!mounted) return;
        
        try {
          const { data: profile, error: profileError } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
            
          if (!mounted) return;
          
          if (profile && !profileError) {
            console.debug('[AdminLogin] Admin profile found, redirecting');
            navigate('/admin', { replace: true });
          } else {
            console.debug('[AdminLogin] No admin profile found');
            setAuthChecking(false);
          }
        } catch (error) {
          console.error('[AdminLogin] Error checking admin profile:', error);
          if (mounted) setAuthChecking(false);
        }
      }, 0);
    };

    // Set up auth state listener (MUST be synchronous to avoid deadlocks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug('[AdminLogin] Auth state changed:', event, session?.user?.id);
      
      if (!mounted) return;
      handleSession(session);
    });

    // Check initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        if (error) {
          console.error('[AdminLogin] Session error:', error);
          setAuthChecking(false);
          return;
        }

        handleSession(session);
      })
      .catch((error) => {
        console.error('[AdminLogin] Error getting session:', error);
        if (mounted) setAuthChecking(false);
      });

    // Fallback timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[AdminLogin] Auth check timeout, stopping');
        setAuthChecking(false);
      }
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 border-white/20 shadow-elegant">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        // Check if user is an admin
        const { data: profile, error: profileError } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profile) {
          setError('Access denied. Admin privileges required.');
          await supabase.auth.signOut();
          return;
        }

        toast({
          title: "Login successful",
          description: `Welcome back, ${profile.role === 'admin' ? 'Admin' : 'Content Editor'}!`,
        });

        navigate('/admin');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/login`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setResetEmailSent(true);
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (err) {
      setError('Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 border-white/20 shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-serif text-foreground">Horseland Admin</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to access the content management system
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@horselandhotel.com"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleForgotPassword}
                disabled={resetLoading || !email}
                className="text-muted-foreground hover:text-foreground"
              >
                {resetLoading ? 'Sending...' : 'Forgot password?'}
              </Button>
            </div>

            {resetEmailSent && (
              <div className="text-center p-3 bg-green-50 rounded-md border border-green-200">
                <p className="text-sm text-green-700">
                  Password reset email sent! Check your inbox and follow the instructions to reset your password.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;