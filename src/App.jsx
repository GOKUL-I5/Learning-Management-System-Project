import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
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
          const hasLocalSession = localStorage.getItem('lms_user') || localStorage.getItem('pending_user');
          if (!hasLocalSession) {
            if (location.pathname !== '/login' && location.pathname !== '/') {
               navigate('/login', { replace: true });
            }
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
          <ProtectedRoute allowedRoles={['staff', 'faculty']}>
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
          colorPrimary: '#4F46E5', // LMS brand primary (Indigo 600)
          colorSuccess: '#10B981', // Soft green
          colorWarning: '#F59E0B', // Soft amber
          colorError: '#EF4444', // Muted red
          colorInfo: '#6366F1',
          colorTextBase: '#1F2937', // Dark charcoal
          colorTextSecondary: '#6B7280', // Muted gray
          borderRadius: 12, // 12px standard rounding
          fontFamily: `'Inter', system-ui, -apple-system, sans-serif`,
          wireframe: false,
          colorBgContainer: '#FFFFFF',
          colorBgLayout: '#F7F8FA', // Very light gray page background
          colorBorder: '#E5E7EB', // Light gray borders
          controlHeight: 48, // Comfortable input height
        },
        components: {
          Form: {
            labelColor: '#6B7280',
            labelFontSize: 13,
            itemMarginBottom: 24,
          },
          Button: {
            controlHeight: 40,
            borderRadius: 10,
            fontWeight: 600,
            paddingInline: 20,
            primaryShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
          },
          Card: {
            borderRadiusLG: 16,
            boxShadowTertiary: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
          },
          Table: {
            borderRadius: 16,
            headerBg: '#FFFFFF',
            headerColor: '#6B7280',
            rowHoverBg: '#F9FAFB',
            colorBorderSecondary: 'transparent',
          },
          Modal: {
            borderRadiusLG: 16,
            paddingContentBase: 32,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
          Input: {
            controlHeight: 44,
            borderRadius: 12,
            colorBorder: '#E5E7EB',
            colorBgContainer: '#F9FAFB', // Soft gray background
            activeShadow: '0 0 0 2px rgba(79, 70, 229, 0.1)',
          },
          Select: {
            controlHeight: 44,
            borderRadius: 12,
            colorBorder: '#E5E7EB',
            colorBgContainer: '#F9FAFB',
            activeShadow: '0 0 0 2px rgba(79, 70, 229, 0.1)',
          },
          DatePicker: {
            controlHeight: 44,
            borderRadius: 12,
            colorBgContainer: '#F9FAFB',
          },
          TimePicker: {
            controlHeight: 44,
            borderRadius: 12,
            colorBgContainer: '#F9FAFB',
          }
        }
      }}
    >
      <AntdApp>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AnimatedRoutes />
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
