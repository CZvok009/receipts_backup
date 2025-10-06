// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false
  });

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setAuthState({
          user: null,
          loading: false,
          isAuthenticated: false
        });
        return;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setAuthState({
          user: result.user,
          loading: false,
          isAuthenticated: true
        });
      } else {
        localStorage.removeItem('authToken');
        document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
        setAuthState({
          user: null,
          loading: false,
          isAuthenticated: false
        });
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false
      });
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('authToken', result.token);
        // Set cookie for middleware
        document.cookie = `authToken=${result.token}; path=/; max-age=86400; SameSite=Lax`;
        setAuthState({
          user: result.user,
          loading: false,
          isAuthenticated: true
        });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signin = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('authToken', result.token);
        // Set cookie for middleware
        document.cookie = `authToken=${result.token}; path=/; max-age=86400; SameSite=Lax`;
        setAuthState({
          user: result.user,
          loading: false,
          isAuthenticated: true
        });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

         const logout = () => {
           localStorage.removeItem('authToken');
           // Remove cookie for middleware
           document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
           setAuthState({
             user: null,
             loading: false,
             isAuthenticated: false
           });
           // Redirect to login page after logout
           if (typeof window !== 'undefined') {
             window.location.href = '/login';
           }
         };

  return {
    ...authState,
    login,
    signin,
    logout,
    checkAuth
  };
}
