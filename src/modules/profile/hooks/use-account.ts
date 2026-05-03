import { useAuthStore } from '@/state/store/auth';

export const useGetAccount = () => {
  const user = useAuthStore((state) => state.user);
  return { data: user, isLoading: false };
};

export const useAccount = () => {
  const user = useAuthStore((state) => state.user);
  return { user };
};

export default useGetAccount;
