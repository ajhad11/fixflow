import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('fixflow_user');
    const token = localStorage.getItem('fixflow_access_token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse stored user", err);
        localStorage.removeItem('fixflow_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login/', { email, password });
    const { access, refresh, user: userData } = response.data;

    localStorage.setItem('fixflow_access_token', access);
    localStorage.setItem('fixflow_refresh_token', refresh);
    localStorage.setItem('fixflow_user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('fixflow_access_token');
      localStorage.removeItem('fixflow_refresh_token');
      localStorage.removeItem('fixflow_user');
      setUser(null);
    }
  };

  const hasRole = (...allowedRoles) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
