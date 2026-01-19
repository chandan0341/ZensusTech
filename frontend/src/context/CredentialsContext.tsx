import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CredentialsContextType {
  clientId: string | null;
  clientSecret: string | null;
  setCredentials: (clientId: string, clientSecret: string) => void;
  clearCredentials: () => void;
}

const CredentialsContext = createContext<CredentialsContextType | undefined>(undefined);

export const CredentialsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const setCredentials = (newClientId: string, newClientSecret: string) => {
    setClientId(newClientId);
    setClientSecret(newClientSecret);
    // No caching - credentials only exist in memory for current session
  };

  const clearCredentials = () => {
    setClientId(null);
    setClientSecret(null);
    // No localStorage operations since we're not caching
  };

  return (
    <CredentialsContext.Provider value={{ clientId, clientSecret, setCredentials, clearCredentials }}>
      {children}
    </CredentialsContext.Provider>
  );
};

export const useCredentials = () => {
  const context = useContext(CredentialsContext);
  if (!context) {
    throw new Error('useCredentials must be used within a CredentialsProvider');
  }
  return context;
};
