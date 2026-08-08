import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyUniqueCode } from '../firebase/services';
import { KeyRound, ShieldCheck, Mail, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyCode = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [hasSiblings, setHasSiblings] = useState(false);
  const [linkedProfiles, setLinkedProfiles] = useState([]);
  const [selectedSibling, setSelectedSibling] = useState(null);
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
    setHasSiblings(userData.hasMultipleSiblings || false);
    if (userData.hasMultipleSiblings) {
      setLinkedProfiles(userData.linkedProfiles || []);
    }
  }, [navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const user = await verifyUniqueCode(values.accessCode, values.enrollmentNo);
      // Removed alert for zero-delay instant push
      // Redirect based on role
      const role = (user.role || 'staff').toLowerCase().trim();
      if (role === 'superadmin') {
        navigate('/admin-dashboard', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role.includes('student')) {
        navigate('/student', { replace: true });
      } else {
        navigate('/staff', { replace: true }); // Fallback to staff dashboard for custom staff roles
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

        <form onSubmit={(e) => { 
          e.preventDefault(); 
          if (hasSiblings && !selectedSibling) {
            window.alert('Please select a student profile first.');
            return;
          }
          onFinish({ accessCode: e.target.accessCode.value, enrollmentNo: selectedSibling }); 
        }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          {hasSiblings && (
            <div style={{ marginBottom: '24px' }}>
              <label className="saas-v3-form-label" style={{ marginBottom: '12px', display: 'block', textAlign: 'center' }}>Select Student Profile</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {linkedProfiles.map((profile, idx) => {
                  const isSelected = selectedSibling === (profile.enrollmentNo || profile.id);
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedSibling(profile.enrollmentNo || profile.id)}
                      style={{ 
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0', 
                        backgroundColor: isSelected ? '#eff6ff' : '#fff',
                        padding: '16px 12px', 
                        borderRadius: '12px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        textAlign: 'center', 
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#2563eb' }}>
                          <ShieldCheck size={16} />
                        </div>
                      )}
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', overflow: 'hidden', border: isSelected ? '2px solid #2563eb' : 'none' }}>
                        {profile.studentPhotoUrl ? (
                          <img src={profile.studentPhotoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={24} color="#94a3b8" />
                        )}
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', marginBottom: '2px' }}>{profile.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{profile.enrollmentNo || profile.id.substring(0,6)}</div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isSelected ? '#1d4ed8' : '#3b82f6', backgroundColor: isSelected ? '#dbeafe' : '#eff6ff', padding: '2px 8px', borderRadius: '12px' }}>{profile.course || 'Student'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', marginTop: '12px' }}
          >
            <LogOut size={16} /> Cancel & Return
          </button>
        </form>

      </div>
    </div>
  );
};

export default VerifyCode;
