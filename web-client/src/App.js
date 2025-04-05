import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './components/Layout/MainLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import ReportIssuePage from './pages/ReportIssuePage';
import MyIssuesPage from './pages/MyIssuesPage';
import ProfilePage from './pages/ProfilePage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="issues/:id" element={<IssueDetailPage />} />
            
            {/* Protected routes */}
            <Route 
              path="report-issue" 
              element={
                <ProtectedRoute>
                  <ReportIssuePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="my-issues" 
              element={
                <ProtectedRoute>
                  <MyIssuesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            
            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        
        {/* Toast notification container */}
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App; 