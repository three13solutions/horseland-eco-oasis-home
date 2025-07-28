import React, { createContext, useContext, ReactNode } from 'react';
import { useContentTranslation } from '@/hooks/useContentTranslation';

interface TranslationContextType {
  getTranslation: (key: string, fallback?: string) => string;
  loading: boolean;
  refreshTranslations: () => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslationContext = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  return context;
};

interface TranslationProviderProps {
  children: ReactNode;
  section?: string;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ 
  children, 
  section 
}) => {
  const { getTranslation, loading, refreshTranslations } = useContentTranslation(section);

  return (
    <TranslationContext.Provider value={{ getTranslation, loading, refreshTranslations }}>
      {children}
    </TranslationContext.Provider>
  );
};