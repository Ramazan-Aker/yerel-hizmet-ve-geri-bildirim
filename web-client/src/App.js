import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './components/Layout/MainLayout';
import AdminLayout from './components/Layout/AdminLayout';
import WorkerLayout from './components/Layout/WorkerLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import ReportIssuePage from './pages/ReportIssuePage';
import MyIssuesPage from './pages/MyIssuesPage';
import ProfilePage from './pages/ProfilePage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminIssuesPage from './pages/AdminIssuesPage';
import AdminIssueDetailPage from './pages/AdminIssueDetailPage';
import AdminReportsPage from './pages/AdminReportsPage';

// Worker Pages
import WorkerDashboardPage from './pages/WorkerDashboardPage';
import WorkerIssuesPage from './pages/WorkerIssuesPage';
import WorkerIssueDetailPage from './pages/WorkerIssueDetailPage';

// Debug Component
import Debug from './components/Debug';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Rol kontrolü
  if (requiredRole && user?.role !== requiredRole) {
    console.log('Yetkisiz erişim denemesi. Kullanıcı rolü:', user?.role, 'Gereken rol:', requiredRole);
    return <Navigate to="/" />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    console.log('Admin sayfasına erişim için giriş yapılmamış, login sayfasına yönlendiriliyor');
    return <Navigate to="/login" />;
  }
  
  // Admin veya yetkili çalışan kontrolü
  if (user?.role !== 'admin' && user?.role !== 'municipal_worker') {
    console.log('Yetkisiz admin erişim denemesi. Kullanıcı rolü:', user?.role);
    return <Navigate to="/" />;
  }

  console.log('Admin erişimi onaylandı. Kullanıcı rolü:', user?.role);
  return children;
};

// Worker Route Component
const WorkerRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    console.log('Çalışan sayfasına erişim için giriş yapılmamış, login sayfasına yönlendiriliyor');
    return <Navigate to="/login" />;
  }
  
  // Çalışan kontrolü
  if (user?.role !== 'worker') {
    console.log('Yetkisiz çalışan erişim denemesi. Kullanıcı rolü:', user?.role);
    return <Navigate to="/" />;
  }

  console.log('Çalışan erişimi onaylandı. Kullanıcı rolü:', user?.role);
  return children;
};

// Ana Sayfa Yönlendirme Bileşeni
const HomeRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  if (!isAuthenticated) {
    return <HomePage />;
  }

  // Admin veya yetkili çalışan ise admin paneline yönlendir
  if (user?.role === 'admin' || user?.role === 'municipal_worker') {
    console.log('Admin kullanıcısı ana sayfaya erişmeye çalışıyor, admin paneline yönlendiriliyor');
    return <Navigate to="/admin" />;
  }
  
  // Çalışan ise çalışan paneline yönlendir
  if (user?.role === 'worker') {
    console.log('Çalışan kullanıcısı ana sayfaya erişmeye çalışıyor, çalışan paneline yönlendiriliyor');
    return <Navigate to="/worker" />;
  }

  // Normal kullanıcı ise normal ana sayfaya yönlendir
  return <HomePage />;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Normal Kullanıcı Sayfaları */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomeRedirect />} />
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
          </Route>
          
          {/* Admin Sayfaları */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route index element={<AdminDashboardPage />} />
            <Route path="issues" element={<AdminIssuesPage />} />
            <Route path="issues/:id" element={<AdminIssueDetailPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="debug" element={<Debug />} />
          </Route>
          
          {/* Çalışan Sayfaları */}
          <Route path="/worker" element={
            <WorkerRoute>
              <WorkerLayout />
            </WorkerRoute>
          }>
            <Route index element={<WorkerDashboardPage />} />
            <Route path="issues" element={<WorkerIssuesPage />} />
            <Route path="issues/:id" element={<WorkerIssueDetailPage />} />
          </Route>
          
          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Toast notification container */}
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App; 