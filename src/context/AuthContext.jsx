import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { clearClientAuthState, trySilentRefresh } from '../api';
import { getMe, login as loginApi, register as registerApi, googleAuth } from '../services/apiAuth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      if (!sessionStorage.getItem('access')) {
        // Fresh tab: sessionStorage is per-tab, but the browser may still
        // hold a valid httpOnly refresh cookie. Try a silent refresh before
        // declaring the user logged out; if it 401s we fall to catch below.
        await trySilentRefresh();
      }
      const user = await getMe();
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch {
      setCurrentUser(null);
      setIsAuthenticated(false);
      clearClientAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (data) => {
    const { access } = await loginApi(data);
    sessionStorage.setItem("access", access);
    await checkAuth();
  };

  const register = async (data) => {
    const { access } = await registerApi(data);
    sessionStorage.setItem("access", access);
    await checkAuth();
  };

  const loginWithGoogle = async (credential) => {
    const data = await googleAuth(credential);
    sessionStorage.setItem("access", data.access);
    await checkAuth();
    return { isNew: data.is_new === true };
  };

  const logout = async () => {
    try {
      await api.post("/api/accounts/auth/logout/");
    } catch (e) {
      console.error("Logout failed on server, clearing locally", e);
    } finally {
      clearClientAuthState();
      setCurrentUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, isLoading, login, register, loginWithGoogle, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
