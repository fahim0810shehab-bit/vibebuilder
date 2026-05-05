import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import bgAuthLight from '@/assets/images/bg_auth_light.svg';
import bgAuthDark from '@/assets/images/bg_auth_dark.svg';
import { useGetLoginOptions } from '@/modules/auth/hooks/use-auth';
import { useAuthState } from '@/state/client-middleware';
import { useTheme } from '@/styles/theme/theme-provider';
import { ExtensionBanner, LanguageSelector, ThemeSwitcher } from '@/components/core';

export const AuthLayout = () => {
  const { isLoading, error: loginOptionsError } = useGetLoginOptions();
  const navigate = useNavigate();
  const { isMounted, isAuthenticated } = useAuthState();
  const { theme } = useTheme();

  useEffect(() => {
    // Don't redirect if we're on the MFA verification page
    if (isAuthenticated && !window.location.pathname.includes('/verify-mfa')) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (!isMounted) return null;

  const getBackgroundImage = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? bgAuthDark : bgAuthLight;
    }
    return theme === 'dark' ? bgAuthDark : bgAuthLight;
  };

  const is404Error = (error: any) => {
    return (
      error?.message?.includes('HTTP 404') ||
      error?.message?.includes('HTTP 403') ||
      error?.message?.includes('HTTP 406') ||
      error?.message?.includes('HTTP 424') ||
      error?.response?.status === 404 ||
      error?.response?.status === 403 ||
      error?.response?.status === 406 ||
      error?.response?.status === 424 ||
      error?.status === 404 ||
      error?.status === 403 ||
      error?.status === 406 ||
      error?.status === 424
    );
  };

  const is500Error = (error: any) => {
    const status = error?.response?.status || error?.status;
    if (status && status >= 500 && status < 600) {
      return true;
    }

    if (error?.message) {
      const httpMatch = error.message.match(/HTTP (\d{3})/);
      if (httpMatch) {
        const statusFromMessage = parseInt(httpMatch[1], 10);
        return statusFromMessage >= 500 && statusFromMessage < 600;
      }
    }

    return false;
  };

  const renderAuthContent = () => {
    if (is404Error(loginOptionsError)) {
      return (
        <div className="w-full max-w-xl mx-auto">
          <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-8 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 to-transparent"></div>
            <div className="relative z-10">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-900 tracking-tight">
                  Incorrect Project Key
                </h2>
                <div className="space-y-3 text-red-700">
                  <p className="text-base leading-relaxed">
                    It seems your project is not set up in the Blocks Cloud.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Please create a project at{' '}
                    <a
                      href="https://cloud.seliseblocks.com"
                      className="font-semibold underline decoration-red-400 underline-offset-2 hover:decoration-red-600"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      cloud.seliseblocks.com
                    </a>
                    , then update your{' '}
                    <code className="inline-flex items-center px-2 py-1 rounded-md bg-red-200/60 text-red-800 font-mono text-xs border border-red-300/50">
                      .env
                    </code>{' '}
                    configuration in Construct accordingly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (is500Error(loginOptionsError)) {
      return (
        <div className="w-full max-w-xl mx-auto">
          <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-8 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 to-transparent"></div>
            <div className="relative z-10">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-orange-100 p-3">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-orange-900 tracking-tight">
                  Services Temporarily Unavailable
                </h2>
                <div className="space-y-3 text-orange-700">
                  <p className="text-base leading-relaxed">
                    The services are temporarily unavailable.
                  </p>
                  <p className="text-base leading-relaxed font-semibold">
                    Everything will be back to normal soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (loginOptionsError) {
      return (
        <div className="w-full max-w-xl mx-auto">
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-8 shadow-xl">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold text-foreground">
                Connection Issue
              </h2>
              <p className="text-sm text-muted-foreground">
                We're having trouble connecting to the authentication services.
                Please check your internet connection and try again.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Retry Loading
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <Outlet />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Initializing secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col min-h-screen bg-background text-foreground selection:bg-primary/20">
      <ExtensionBanner />
      <div className="flex w-full flex-1 relative overflow-hidden">
        {/* Atmospheric Background Layer */}
        <div className="hidden md:block w-[40%] relative overflow-hidden bg-[#0a0a0b]">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_50%,#7c3aed_0%,transparent_50%)] blur-[120px] animate-pulse" />
            <div className="absolute top-[20%] right-[10%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_50%_50%,#3b82f6_0%,transparent_50%)] blur-[100px]" />
          </div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          
          <div className="relative z-10 flex flex-col items-start justify-center h-full px-12 lg:px-20">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-8 shadow-[0_0_40px_rgba(124,58,237,0.5)]">
              V
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-[1.1]">
              Build your vibe.<br/>
              <span className="text-primary-300">Fast. Beautiful.</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md font-light leading-relaxed">
              Join thousands of creators building high-performance SaaS platforms with VibeBuilder.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center w-full px-6 sm:px-20 md:w-[60%] md:px-[10%] lg:px-[12%] 2xl:px-[15%] relative">
          <div className="absolute top-6 right-8 flex items-center gap-4">
            <ThemeSwitcher />
            <LanguageSelector />
          </div>
          
          <div className="w-full max-w-md">
            <div className="mb-10 block md:hidden">
               <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg">V</div>
            </div>
            {renderAuthContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
