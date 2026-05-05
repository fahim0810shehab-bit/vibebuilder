import { useTranslation } from 'react-i18next';
import { GRANT_TYPES } from '@/constant/auth';
import { Divider } from '@/components/core';
import { SsoSignin } from '../signin-sso';
import { SigninEmail } from '../signin-email';
import { useTheme } from '@/styles/theme/theme-provider';
import darklogo from '@/assets/images/construct_logo_dark.svg';
import lightlogo from '@/assets/images/construct_logo_light.svg';
import { Link, useLocation } from 'react-router-dom';
import { useGetLoginOptions, useGetSignupSettings } from '../../hooks/use-auth';

export const Signin = () => {
  const { data: loginOption, isLoading } = useGetLoginOptions();
  const { data: signupSettings } = useGetSignupSettings();

  const { theme } = useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const ssoError = location.state?.ssoError;

  const passwordGrantAllowed = !!loginOption?.allowedGrantTypes?.includes(GRANT_TYPES.password);
  const socialGrantAllowed =
    !!loginOption?.allowedGrantTypes?.includes(GRANT_TYPES.social) &&
    !!loginOption?.ssoInfo?.length;
  const oidcGrantAllowed = !!loginOption?.allowedGrantTypes?.includes(GRANT_TYPES.oidc);

  const isDivider = passwordGrantAllowed && (socialGrantAllowed || oidcGrantAllowed);

  const isBannerAllowedToVisible = [
    'localhost',
    'construct.seliseblocks.com',
    'stg-construct.seliseblocks.com',
    'dev-construct.seliseblocks.com',
  ].some((domain) => window.location.hostname === domain);

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out fill-mode-both">
      <div className="flex flex-col gap-6">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg md:hidden">
          V
        </div>
        
        <div className="space-y-1.5">
          <h2 className="text-3xl font-bold tracking-tight text-high-emphasis">
            Welcome back
          </h2>
          {(signupSettings?.isEmailPasswordSignUpEnabled || signupSettings?.isSSoSignUpEnabled) && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-light text-muted-foreground">
                {t('DONT_HAVE_ACCOUNT')}
              </span>
              <Link
                to={'/signup'}
                className="text-sm font-semibold text-primary hover:text-primary-600 transition-colors"
              >
                {t('SIGN_UP')}
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {ssoError && (
        <div className="rounded-xl bg-error-background/50 border border-error/20 p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
          <p className="text-xs font-medium text-error-high-emphasis">
            {ssoError}
          </p>
        </div>
      )}

      <div className={'w-full ' + (isBannerAllowedToVisible ? 'visible' : 'invisible h-0')}>
        <div className="rounded-xl bg-surface border border-border p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-xs font-normal text-medium-emphasis relative z-10 leading-relaxed">
            <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded-md font-bold text-[10px] uppercase tracking-wider mb-2">Demo Access</span><br/>
            Email: <span className="font-semibold text-high-emphasis">demo.construct@seliseblocks.com</span><br/>
            Pass: <span className="font-mono text-high-emphasis bg-white/50 px-1 rounded">H%FE*FYi5oTQ!VyT6TkEy</span>
          </p>
        </div>
      </div>
      
      <div className="w-full flex flex-col gap-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200 fill-mode-both">
          {passwordGrantAllowed && <SigninEmail />}
        </div>
        
        {isDivider && (
          <div className="relative py-2 animate-in fade-in duration-700 delay-300 fill-mode-both">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-medium tracking-widest">
                {t('AUTH_OR')}
              </span>
            </div>
          </div>
        )}
        
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-400 fill-mode-both">
          {socialGrantAllowed && loginOption && <SsoSignin loginOption={loginOption} />}
        </div>
        
        {!passwordGrantAllowed && !socialGrantAllowed && !isLoading && (
          <div className="text-center p-8 border border-dashed border-border rounded-2xl bg-muted/30 animate-in fade-in zoom-in-95 duration-500">
            <p className="text-sm text-foreground font-semibold">
              No sign-in methods available
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto leading-relaxed">
              Please check your project configuration in the Blocks Cloud.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
