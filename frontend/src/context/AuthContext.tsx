import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ExperimentStep } from '../types';

interface AuthState {
  token: string | null;
  participantId: string | null;
  experimentId: string | null;
  group: string | null;
  currentStep: ExperimentStep;
}

interface AuthContextType extends AuthState {
  login: (token: string, participantId: string, experimentId: string, group: string | null, step: string) => void;
  logout: () => void;
  setStep: (step: ExperimentStep) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const participantId = localStorage.getItem('participant_id');
    const experimentId = localStorage.getItem('experiment_id');
    const group = localStorage.getItem('group');
    const step = (localStorage.getItem('current_step') as ExperimentStep) || 'joined';
    return { token, participantId, experimentId, group, currentStep: step };
  });

  const login = useCallback(
    (token: string, participantId: string, experimentId: string, group: string | null, step: string) => {
      localStorage.setItem('token', token);
      localStorage.setItem('participant_id', participantId);
      localStorage.setItem('experiment_id', experimentId);
      if (group) localStorage.setItem('group', group);
      localStorage.setItem('current_step', step);
      setState({ token, participantId, experimentId, group, currentStep: step as ExperimentStep });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('participant_id');
    localStorage.removeItem('experiment_id');
    localStorage.removeItem('group');
    localStorage.removeItem('current_step');
    setState({ token: null, participantId: null, experimentId: null, group: null, currentStep: 'joined' });
  }, []);

  const setStep = useCallback((step: ExperimentStep) => {
    localStorage.setItem('current_step', step);
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setStep }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
