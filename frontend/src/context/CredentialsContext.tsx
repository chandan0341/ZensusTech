import { createContext, useState, ReactNode } from 'react';
// Exporting the interface is required for the hook to know the types
export interface CredentialsContextType {
  isConnected: boolean;
  tenantId: string | null;
  setConnectionSuccess: (tenantId: string) => void;
  logout: () => void;
}

// Exporting the context constant is required for the Hook to consume it
export const CredentialsContext = createContext<CredentialsContextType | undefined>(undefined);

export const CredentialsProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const setConnectionSuccess = (id: string) => {
    setTenantId(id);
    setIsConnected(true);
  };

  const logout = () => {
    setTenantId(null);
    setIsConnected(false);
  };

  return (
    <CredentialsContext.Provider value={{ isConnected, tenantId, setConnectionSuccess, logout }}>
      {children}
    </CredentialsContext.Provider>
  );
};