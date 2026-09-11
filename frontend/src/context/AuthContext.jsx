import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'qc_auth';

/**
 * Reads the persisted auth state from localStorage.
 * Returns { token, user } or null.
 * Never stores passwords or hashes.
 */
function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorage(token, user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStorage()); // { token, user } | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Re-hydrate on mount (already done via useState initializer, but we verify the token)
  useEffect(() => {
    const persisted = readStorage();
    if (persisted?.token && persisted?.user) {
      setAuth(persisted);
    }
  }, []);

  const login = useCallback((token, user) => {
    writeStorage(token, user);
    setAuth({ token, user });
    setError(null);
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setAuth(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    isAuthenticated: !!auth?.token,
    role: auth?.user?.role ?? null,
    loading,
    error,
    setLoading,
    setError,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
