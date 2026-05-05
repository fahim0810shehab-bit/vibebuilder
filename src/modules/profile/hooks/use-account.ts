import { useAuthStore } from '@/state/store/auth';

export const useGetAccount = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Mock successful response if authenticated, even if user object is null (will hydrate later)
  return { 
    data: user, 
    isLoading: false, 
    isSuccess: isAuthenticated, 
    error: null 
  };
};

export const useAccount = () => {
  const user = useAuthStore((state) => state.user);
  return { user };
};

export default useGetAccount;
