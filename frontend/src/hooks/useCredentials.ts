import { useContext } from 'react';
// Use relative path to avoid alias issues during build
import { CredentialsContext, CredentialsContextType } from '../context/CredentialsContext';

export const useCredentials = (): CredentialsContextType => {
  const context = useContext(CredentialsContext);
  
  if (!context) {
    throw new Error('useCredentials must be used within a CredentialsProvider');
  }
  
  return context;
};