import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// Default = path relatif untuk produksi; localhost hanya dari .env.development (npm run dev).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Derived state
  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'admin';

  // Clear auth state and redirect to landing
  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // Login: POST /api/auth/login
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login gagal');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // Logout: clear token and redirect to landing page
  const logout = useCallback(() => {
    clearAuth();
    window.location.href = '/';
  }, [clearAuth]);

  // Validate token on mount by calling GET /api/auth/me
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearAuth();
        } else if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          clearAuth();
        }
      } catch {
        // Network error — clear auth state
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token, clearAuth]);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
