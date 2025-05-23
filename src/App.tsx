// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login, Register } from './components/auth';
import EmailHandler from './components/auth/EmailHandler';
import Dashboard from './components/dashboard/Dashboard';
import Home from './components/Home';
import About from './components/About';
import CreateLottery from './components/lottery/CreateLottery';
import LotterySetup from './components/lottery/LotterySetup';
import LotteryVerification from './components/lottery/LotteryVerification';
import LotteryDrawing from './components/lottery/LotteryDrawing';
import LotteryReveal from './components/lottery/LotteryReveal';
import DataMigration from './components/admin/DataMigration';

import './index.css';

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/email-handler" element={<EmailHandler />} />
            <Route path="/data-migration" element={<DataMigration />} />

            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/lottery/create" element={
              <ProtectedRoute>
                <CreateLottery />
              </ProtectedRoute>
            } />
            
            <Route path="/lottery/:lotteryId/setup" element={
              <ProtectedRoute>
                <LotterySetup />
              </ProtectedRoute>
            } />
            
            <Route path="/lottery/:lotteryId/verification" element={
              <LotteryVerification />
            } />
            
            <Route path="/lottery/:lotteryId/drawing" element={
              <LotteryDrawing />
            } />
            
            <Route path="/lottery/:lotteryId/reveal" element={
              <LotteryReveal />
            } />
            
            {/* Redirect to home for any unmatched routes */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;