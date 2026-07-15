import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyUniqueCode } from '../firebase/services';
import { KeyRound, ShieldCheck, Mail, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyCode = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Clean up any residual Firebase/Google API hooks that might freeze the window closure
    if (window.gapi) {
      window.gapi = null;
    }
    const gapiScripts = document.querySelectorAll('script[src*="apis.google.com"]');
    gapiScripts.forEach(script => script.remove());
    
    // Check if there's a pending user
    const pendingUserStr = localStorage.getItem('pending_user');
    if (!pendingUserStr) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(pendingUserStr);
    setEmail(userData.email || userData.phoneNumber || userData.studentPhone || userData.phone || userData.parentPhone);
  }, [navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const user = await verifyUniqueCode(values.accessCode);
      // Removed alert for zero-delay instant push
      // Redirect based on role
      switch (user.role) {
        case 'superadmin': navigate('/admin-dashboard', { replace: true }); break;
        case 'admin': navigate('/admin', { replace: true }); break;
        case 'staff': navigate('/staff', { replace: true }); break;
        case 'student': navigate('/student', { replace: true }); break;
        default: navigate('/staff', { replace: true }); // Fallback to a valid dashboard, never root
      }
    } catch (error) {
      window.alert(error.message || 'Invalid Access Code. Please contact your administrator.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('pending_user');
    navigate('/login');
  };

  return (
    <div className="saas-v3-auth-page">
      <div className="saas-v3-auth-card">
        
        <div className="saas-v3-auth-logo-container">
          <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck style={{ color: '#111827', width: '24px', height: '24px' }} />
          </div>
        </div>
        
        <h2 className="saas-v3-auth-title">Security Verification</h2>
        <p className="saas-v3-auth-subtitle">
          Enter your Organization Access Code to securely access your dashboard.
        </p>

        <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Mail style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>Verifying for: {email}</span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onFinish({ accessCode: e.target.accessCode.value }); }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="saas-v3-form-group">
            <label className="saas-v3-form-label">Access Code</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <KeyRound style={{ position: 'absolute', left: '16px', color: '#9ca3af' }} size={18} />
              <input 
                type="password"
                name="accessCode"
                placeholder="Enter Access Code" 
                className="saas-v3-form-input" 
                style={{ paddingLeft: '44px', fontFamily: 'monospace', letterSpacing: '2px' }}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="saas-v3-btn-solid"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', marginTop: '8px' }}
          >
            {loading ? 'Verifying...' : 'Verify Identity'}
          </button>
          
          <button 
            type="button" 
            onClick={handleCancel} 
            className="saas-v3-btn-outline"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: '16px' }}
          >
            <LogOut size={16} /> Cancel & Logout
          </button>
        </form>

      </div>
    </div>
  );
};

export default VerifyCode;
