import React, { createContext, useContext, useState, ReactNode } from 'react';

// Added tenantId and isConnected to match your UI needs
export interface CredentialsContextType {
  clientId: string | null;
  clientSecret: string | null;
  tenantId: string; 
  isConnected: boolean;
  setCredentials: (clientId: string, clientSecret: string) => void;
  setSelectedTenant: (tenantId: string) => void;
  clearCredentials: () => void;
}

const CredentialsContext = createContext<CredentialsContextType | undefined>(undefined);

export const CredentialsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // Static state initialization
  const [tenantId, setSelectedTenant] = useState<string>("c0c05a7c-36f8-4fb7-b1cd-a283e5a6d422");
  const [isConnected] = useState<boolean>(true); // Forced true for static mode

  const setCredentials = (newClientId: string, newClientSecret: string) => {
    setClientId(newClientId);
    setClientSecret(newClientSecret);
  };

  const clearCredentials = () => {
    setClientId(null);
    setClientSecret(null);
  };

  return (
    <CredentialsContext.Provider 
      value={{ 
        clientId, 
        clientSecret, 
        tenantId, 
        isConnected, 
        setSelectedTenant, 
        setCredentials, 
        clearCredentials 
      }}
    >
      {children}
    </CredentialsContext.Provider>
  );
};

// Internal hook (Exporting this here is fine, or keep it in useCredentials.ts)
export const useCredentials = () => {
  const context = useContext(CredentialsContext);
  if (!context) {
    throw new Error('useCredentials must be used within a CredentialsProvider');
  }
  return context;
};

// Essential to export the context itself for the separate hook file to work
export { CredentialsContext };