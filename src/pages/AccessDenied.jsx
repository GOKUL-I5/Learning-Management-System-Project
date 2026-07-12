import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import './Login.css';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <div className="login-card" style={{ textAlign: 'center' }}>
        
        <div className="login-logo-wrapper" style={{ margin: '0 auto 20px auto', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <div className="login-logo" style={{ color: 'var(--danger-vibrant, #ef4444)' }}>
            <ShieldAlert className="w-8 h-8 login-icon" />
          </div>
        </div>
        
        <h1 className="login-title" style={{ fontSize: '24px', marginBottom: '10px' }}>Access Denied</h1>
        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
          You do not have permission to access this system. Your account is not registered or authorized.
        </p>
        
        <button 
          onClick={() => navigate('/login')} 
          className="login-btn-primary" 
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Return to Login
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
