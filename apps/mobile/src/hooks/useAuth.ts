import { useAuthContext } from '../context/AuthContext';

/**
 * Convenience hook for accessing auth context
 * Provides easy access to auth state and functions
 */
export function useAuth() {
  return useAuthContext();
}
