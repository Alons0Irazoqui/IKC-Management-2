
import React from 'react';
import { useAuth } from './AuthContext';
import { useAcademy } from './AcademyContext';
import { useFinance } from './FinanceContext';

// --- COMPATIBILITY LAYER ---
// This provider is no longer "The Provider", but a wrapper for compatibility if needed.
// However, since we updated App.tsx, the individual providers are used.
// The critical part here is the `useStore` hook which aggregates the logic.

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This component now purely renders children, as the logic is hoisted to App.tsx providers.
  // It is kept to avoid breaking imports in App.tsx if it imported StoreProvider from here.
  return <>{children}</>;
};

export const useStore = () => {
  // Aggregate hooks to simulate the old "God Object" API
  const auth = useAuth();
  const academy = useAcademy();
  const finance = useFinance();

  return {
    ...auth,
    ...academy,
    ...finance,
    // Add any manual overrides or merges if necessary
  };
};
