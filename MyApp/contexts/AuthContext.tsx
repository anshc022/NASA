import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  language: string;
  level: number;
  xp: number;
  coins: number;
  welcome_bonus_claimed: boolean;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  claimWelcomeBonus: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      if (token) {
        try {
          const userData = await authAPI.getCurrentUser();
          setUser({
            ...userData,
            coins: userData.coins ?? 0,
            welcome_bonus_claimed: userData.welcome_bonus_claimed ?? false,
            level: userData.level ?? 1,
            xp: userData.xp ?? 0,
          });
        } catch (apiError) {
          // Token is invalid, clear it
          console.error('Invalid token, clearing authentication:', apiError);
          await SecureStore.deleteItemAsync('jwt_token');
          setUser(null);
        }
      } else {
        // No token found
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      await SecureStore.deleteItemAsync('jwt_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await authAPI.login(usernameOrEmail, password);
      await SecureStore.setItemAsync('jwt_token', response.access_token);
      setUser({
        ...response.user,
        coins: response.user.coins ?? 0,
        welcome_bonus_claimed: response.user.welcome_bonus_claimed ?? false,
        level: response.user.level ?? 1,
        xp: response.user.xp ?? 0,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const signup = async (data: any) => {
    try {
      const response = await authAPI.signup(data);
      await SecureStore.setItemAsync('jwt_token', response.access_token);
      setUser({
        ...response.user,
        coins: response.user.coins ?? 0,
        welcome_bonus_claimed: response.user.welcome_bonus_claimed ?? false,
        level: response.user.level ?? 1,
        xp: response.user.xp ?? 0,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Signup failed');
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    setUser(null);
    // The AuthGuard will handle redirecting to splash/login
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const claimWelcomeBonus = async () => {
    try {
      const response = await authAPI.claimWelcomeBonus();
      setUser((prev) =>
        prev
          ? {
              ...prev,
              coins: response.total_coins,
              welcome_bonus_claimed: true,
            }
          : prev
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Unable to claim welcome bonus');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUser,
        claimWelcomeBonus,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
