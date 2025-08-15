import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bearerToken, setBearerToken] = useState(null); // token from extension flow

  const fetchWithAuth = async (path, opts = {}) => {
    const headers = opts.headers || {};
    const base = 'http://localhost:8000';
    if (bearerToken) {
      return fetch(`${base}${path}`, {
        ...opts,
        credentials: 'omit',
        headers: { ...headers, Authorization: `Bearer ${bearerToken}` },
      });
    }
    return fetch(`${base}${path}`, { ...opts, credentials: 'include' });
  };

  const waitForMessage = (type, timeoutMs = 5000) => new Promise((resolve, reject) => {
    const handler = (event) => {
      const data = event.data;
      if (data && data.type === type) {
        window.removeEventListener('message', handler);
        resolve(data);
      }
    };
    window.addEventListener('message', handler);
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Timed out waiting for message: ' + type));
    }, timeoutMs);
  });

  const tryLoadFromExtension = async () => {
    try {
      // Ask the content script to return token from background
      window.parent?.postMessage?.({ type: 'EXT_GET_TOKEN' }, '*');
      const resp = await waitForMessage('EXT_AUTH_TOKEN', 1500).catch(() => null);
      if (resp?.token) {
        setBearerToken(resp.token);
        if (resp.user) setUser(resp.user);
        try {
          const me = await fetchWithAuth('/auth/me');
          if (me.ok) setUser(await me.json());
        } catch {}
        return true;
      }
    } catch {}
    return false;
  };

  const checkAuthStatus = async () => {
    try {
      const extOk = await tryLoadFromExtension();
      if (extOk) {
        setLoading(false);
        return;
      }
      const response = await fetch('http://localhost:8000/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async () => {
    // If we're in an iframe, avoid web OAuth fallback to prevent CSP frame errors
    const inIframe = window.top !== window;

    // Inside extension iframe: ask content script/background to run OAuth
    try {
      window.parent?.postMessage?.({ type: 'EXT_START_OAUTH' }, '*');
      const result = await waitForMessage('EXT_AUTH_RESULT', 120000); // allow user time
      if (result?.ok && result?.token) {
        setBearerToken(result.token);
        if (result.user) setUser(result.user);
        try {
          const me = await fetchWithAuth('/auth/me');
          if (me.ok) setUser(await me.json());
        } catch {}
        return;
      }
      console.error('Extension OAuth failed');
    } catch (e) {
      console.error('Extension OAuth error:', e);
    }

    if (inIframe) {
      // Do not attempt web redirect inside the iframe
      return;
    }

    // Standalone web: initiate OAuth and let frontend redirect
    try {
      const res = await fetch('http://localhost:8000/auth/github', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to initiate OAuth');
      const data = await res.json();
      if (!data.authorization_url) throw new Error('No authorization URL returned');
      window.location.href = data.authorization_url;
    } catch (e) {
      console.error('Login error:', e);
    }
  };

  const logout = async () => {
    try {
      await fetch('http://localhost:8000/auth/logout', {
        credentials: 'include',
      });
    } catch {}
    setUser(null);
    setBearerToken(null);
    Cookies.remove('access_token');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
