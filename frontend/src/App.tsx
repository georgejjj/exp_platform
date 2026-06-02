import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ExperimentProvider } from './context/ExperimentContext';

import JoinPage from './pages/participant/JoinPage';
import DemographicsPage from './pages/participant/DemographicsPage';
import QuestionnairePage from './pages/participant/QuestionnairePage';
import PersonalityFeedbackPage from './pages/participant/PersonalityFeedbackPage';
import RaceCarGamePage from './pages/participant/RaceCarGamePage';
import TradingPage from './pages/participant/TradingPage';
import SettlementPage from './pages/participant/SettlementPage';
import AnalysisPage from './pages/participant/AnalysisPage';
import EducationPage from './pages/participant/EducationPage';
import FinalResultsPage from './pages/participant/FinalResultsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import DashboardPage from './pages/admin/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExperimentProvider>
          <Routes>
            {/* Participant flow */}
            <Route path="/" element={<JoinPage />} />
            <Route path="/demographics" element={<DemographicsPage />} />
            <Route path="/questionnaire/:phase" element={<QuestionnairePage />} />
            <Route path="/race-car-game" element={<RaceCarGamePage />} />
            <Route path="/personality-feedback" element={<PersonalityFeedbackPage />} />
            <Route path="/trading/:roundNum" element={<TradingPage />} />
            <Route path="/settlement/:roundNum" element={<SettlementPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/education" element={<EducationPage />} />
            <Route path="/final-results" element={<FinalResultsPage />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<DashboardPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ExperimentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
