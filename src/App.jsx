import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { AnimatePresence } from 'framer-motion';
import Landing from './pages/Landing';
import Login from './pages/Login';
import VerifyCode from './pages/VerifyCode';
import AccessDenied from './pages/AccessDenied';
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          localStorage.removeItem('lms_user');
          localStorage.removeItem('pending_user');
          if (location.pathname !== '/login' && location.pathname !== '/') {
             navigate('/login', { replace: true });
          }
        }
      } catch (error) {
        console.error("Auth routing error:", error);
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/access-denied" element={<AccessDenied />} />
        
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366F1', // Indigo Purple
          colorSuccess: '#22C55E',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          colorInfo: '#818CF8',
          colorTextBase: '#111827',
          borderRadius: 24, // Generous global rounding
          fontFamily: `'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
          wireframe: false,
          colorBgContainer: '#FFFFFF',
          colorBgLayout: '#F3F4F6',
          colorBorder: '#F3F4F6', // Extremely soft borders
        },
        components: {
          Button: {
            controlHeight: 44,
            borderRadius: 9999, // Pill shape
            fontWeight: 700,
            paddingInline: 24,
          },
          Card: {
            borderRadiusLG: 24,
            boxShadowTertiary: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          },
          Table: {
            borderRadius: 24,
            headerBg: '#FFFFFF', // Clean white header
            headerColor: '#9CA3AF', // Light gray text
            rowHoverBg: '#F9FAFB',
            colorBorderSecondary: 'transparent', // Removes vertical borders internally
          },
          Modal: {
            borderRadiusLG: 32,
            paddingContentBase: 32,
          },
          Input: {
            controlHeight: 48,
            borderRadius: 9999, // Pill search/inputs
            colorBorder: '#E5E7EB',
          },
          Select: {
            controlHeight: 48,
            borderRadius: 9999,
            colorBorder: '#E5E7EB',
          }
        }
      }}
    >
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AnimatedRoutes />
      </Router>
    </ConfigProvider>
  );
}

export default App;
