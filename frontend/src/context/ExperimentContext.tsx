import React, { createContext, useContext, useState } from 'react';
import type { CompleteResponse, SettlementData, RaceCarCompleteResponse } from '../types';

interface ExperimentState {
  preTestResult: CompleteResponse | null;
  postTestResult: CompleteResponse | null;
  round1Settlement: SettlementData | null;
  round2Settlement: SettlementData | null;
  gameResult: RaceCarCompleteResponse | null;
}

interface ExperimentContextType extends ExperimentState {
  setPreTestResult: (r: CompleteResponse) => void;
  setPostTestResult: (r: CompleteResponse) => void;
  setRound1Settlement: (s: SettlementData) => void;
  setRound2Settlement: (s: SettlementData) => void;
  setGameResult: (r: RaceCarCompleteResponse) => void;
}

const ExperimentContext = createContext<ExperimentContextType | null>(null);

export function ExperimentProvider({ children }: { children: React.ReactNode }) {
  const [preTestResult, setPreTestResult] = useState<CompleteResponse | null>(null);
  const [postTestResult, setPostTestResult] = useState<CompleteResponse | null>(null);
  const [round1Settlement, setRound1Settlement] = useState<SettlementData | null>(null);
  const [round2Settlement, setRound2Settlement] = useState<SettlementData | null>(null);
  const [gameResult, setGameResult] = useState<RaceCarCompleteResponse | null>(null);

  return (
    <ExperimentContext.Provider
      value={{
        preTestResult,
        postTestResult,
        round1Settlement,
        round2Settlement,
        gameResult,
        setPreTestResult,
        setPostTestResult,
        setRound1Settlement,
        setRound2Settlement,
        setGameResult,
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error('useExperiment must be used within ExperimentProvider');
  return ctx;
}
