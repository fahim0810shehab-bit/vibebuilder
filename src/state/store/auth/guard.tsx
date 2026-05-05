import { useGetAccount } from '@/modules/profile/hooks/use-account';
import { useAuthStore } from '.';
import { useEffect, useRef } from 'react';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useNavigate, useLocation } from 'react-router-dom';

export const Guard = ({ children }: { children: React.ReactNode }) => {
  const { data, isSuccess, error } = useGetAccount();
  const { setUser, isAuthenticated, accessToken } = useAuthStore();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const location = useLocation();
  const lastErrorRef = useRef<any>(null);

  useEffect(() => {
    // 1. Redirect if definitely not authenticated
    if (!isAuthenticated && !accessToken) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    // 2. Handle API errors
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      handleError(error);
      return;
    }

    // 3. Hydrate user if missing but we have success
    if (isSuccess && data && !lastErrorRef.current) {
      setUser(data);
    }
  }, [data, isAuthenticated, accessToken, isSuccess, error, setUser, navigate, location.pathname, handleError]);

  if (!isAuthenticated && !accessToken) {
    return null;
  }

  return <>{children}</>;
};
