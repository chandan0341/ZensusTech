import { useContext } from 'react';
import { CredentialsContext, type CredentialsContextType } from '../context/CredentialsContext';

export const useCredentials = (): CredentialsContextType => {
  const context = useContext(CredentialsContext);
  
  if (!context) {
    throw new Error('useCredentials must be used within a CredentialsProvider');
  }
  
  return context;
};