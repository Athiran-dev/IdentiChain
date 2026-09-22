import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { apiFetch } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIdentity = useCallback(async (walletAddress) => {
    try {
      const data = await apiFetch(`/api/identity/${walletAddress}`);
      setIdentity(data);
    } catch (err) {
      console.error('Failed to fetch identity:', err);
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Get nonce
      const nonceRes = await apiFetch(`/api/auth/nonce/${address}`);
      const messageToSign = nonceRes.message;

      // 2. Sign message
      const signature = await signMessageAsync({ message: messageToSign });

      // 3. Verify and get JWT
      const verifyRes = await apiFetch('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: address,
          signature,
          message: messageToSign,
        }),
      });

      if (verifyRes.token) {
        sessionStorage.setItem('token', verifyRes.token);
        setToken(verifyRes.token);
        await fetchIdentity(address);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message);
      disconnect(); // Disconnect wallet if sign-in fails
    } finally {
      setLoading(false);
    }
  }, [address, signMessageAsync, disconnect, fetchIdentity]);

  const signOut = useCallback(() => {
    sessionStorage.removeItem('token');
    setToken(null);
    setIdentity(null);
    disconnect();
  }, [disconnect]);

  // Handle unauthorized event from api wrapper
  useEffect(() => {
    const handleUnauthorized = () => {
      signOut();
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [signOut]);

  // Handle wallet account change or disconnect
  useEffect(() => {
    if (!isConnected) {
      if (token) signOut();
    } else if (address && token) {
      // We are connected and have a token. Does it match the connected address?
      // For now, we just fetch identity. If token is stale for another address, 
      // the backend will return 401 and trigger unauthorized.
      fetchIdentity(address);
    } else if (address && !token) {
      // connected but not signed in. We let the user initiate signIn manually or trigger it on the protected route.
    }
  }, [address, isConnected, token, signOut, fetchIdentity]);

  return (
    <AuthContext.Provider value={{ token, identity, signIn, signOut, loading, error, refreshIdentity: () => fetchIdentity(address) }}>
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
