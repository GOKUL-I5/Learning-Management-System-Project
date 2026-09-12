import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { identifyUser, verifyUniqueCode, ensureSuperAdminInFirestore } from '../firebase/services';
import { auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { BookOpen, KeyRound, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import './Login.css';

const googleProvider = new GoogleAuthProvider();

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: closed, 1: identifier
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [reAuthOverlayVisible, setReAuthOverlayVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Auto open book after a short delay
    const timer = setTimeout(() => {
      setStep(1);
    }, 800);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    // Auth redirect handling is now globally managed by App.jsx to prevent race conditions.
  }, [navigate]);

  const handleNext = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (!identifier || !/^[6-9]\d{9}$/.test(identifier)) {
        setErrorMsg('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
        setLoading(false);
        return;
      }
      
      const currentIdentifier = identifier;
      const studentPhoneNumber = currentIdentifier;
      
      const user = await identifyUser(currentIdentifier);
      

      if (user.role === 'superadmin') {
        setSuccessMsg(`Welcome back, ${user.name || 'Super Admin'}!`);
        navigate('/admin-dashboard');
        return;
      }

      // Redirect to verification step
      navigate('/verify-code');
    } catch (error) {
      if (error.message === 'Unauthorized User') {
        navigate('/access-denied', { replace: true });
        return;
      } else if (error.name !== 'ValidationError') {
        setErrorMsg('Login failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        const superAdmins = ['santhanabharaths@gmail.com', 'ksquarestudio2025@gmail.com'];
        if (superAdmins.includes(result.user.email)) {
          let userData;
          try {
            userData = await ensureSuperAdminInFirestore(result.user.email, result.user.displayName);
          } catch (e) {
            console.warn("Failed to ensure super admin in firestore (permissions issue):", e);
            userData = {
              id: 'superadmin_id',
              email: result.user.email,
              name: result.user.displayName || 'Super Admin',
              role: 'superadmin'
            };
          }
          localStorage.setItem('lms_user', JSON.stringify(userData));
          navigate('/admin-dashboard', { replace: true });
          return;
        }
        
        // Fetch full user profile from Firestore to populate role and organization access rules
        try {
          await identifyUser(result.user.email);
          navigate('/verify-code', { replace: true });
        } catch (dbError) {
          navigate('/access-denied', { replace: true });
          return;
        }
      }
    } catch (error) {
      console.warn('Google Sign-In Error:', error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request' || (error.message && error.message.includes('Cross-Origin-Opener-Policy'))) {
        setErrorMsg("Authentication popup was interrupted. Please click 'Continue with Google' again.");
      } else if (
        error.code === 'auth/requires-recent-login' || 
        error.code === 'auth/user-token-expired' || 
        error.code === 'auth/invalid-user-token' ||
        (error.message && error.message.includes('token'))
      ) {
        setReAuthOverlayVisible(true);
      } else {
        setErrorMsg("Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        setReAuthOverlayVisible(false);
        const superAdmins = ['santhanabharaths@gmail.com', 'ksquarestudio2025@gmail.com'];
        if (superAdmins.includes(result.user.email)) {
          let userData;
          try {
            userData = await ensureSuperAdminInFirestore(result.user.email, result.user.displayName);
          } catch (e) {
            console.warn("Failed to ensure super admin in firestore (permissions issue):", e);
            userData = {
              id: 'superadmin_id',
              email: result.user.email,
              name: result.user.displayName || 'Super Admin',
              role: 'superadmin'
            };
          }
          localStorage.setItem('lms_user', JSON.stringify(userData));
          navigate('/admin-dashboard', { replace: true });
          return;
        }
        
        try {
          await identifyUser(result.user.email);
          navigate('/verify-code', { replace: true });
        } catch (dbError) {
          navigate('/access-denied', { replace: true });
          return;
        }
      }
    } catch (error) {
      console.warn('Re-auth error:', error);
      setErrorMsg("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-v3-auth-page">
      <SEO 
        title="Login - CoreLearn LMS"
        description="Login securely to CoreLearn LMS using your phone number or Google account."
        canonicalUrl="/login"
        robots="noindex, nofollow"
      />
      <div className="saas-v3-auth-card">
        
        <div className="saas-v3-auth-logo-container">
          <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen style={{ color: '#111827', width: '24px', height: '24px' }} />
          </div>
        </div>
        
        <h1 className="saas-v3-auth-title">LMS Portal</h1>
        <p className="saas-v3-auth-subtitle">Education Empowered</p>

        {errorMsg && <div style={{ color: '#ef4444', padding: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: '500', backgroundColor: '#fef2f2', borderRadius: '8px', fontSize: '14px', border: '1px solid #fecaca' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: '#10b981', padding: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: '500', backgroundColor: '#ecfdf5', borderRadius: '8px', fontSize: '14px', border: '1px solid #a7f3d0' }}>{successMsg}</div>}

        <form onSubmit={handleNext} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="saas-v3-form-group">
            <label className="saas-v3-form-label">Phone Number</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone style={{ position: 'absolute', left: '16px', color: '#9ca3af' }} size={18} />
              <input 
                type="text"
                value={identifier}
                onChange={(e) => {
                  const val = e.target.value;
                  // If user typed non-digits, warn immediately
                  if (/[^\d]/.test(val)) {
                    setErrorMsg('Please enter a valid 10-digit mobile number (digits only)');
                  } else {
                    setErrorMsg('');
                  }
                  const digitsOnly = val.replace(/\D/g, '');
                  if (digitsOnly.length <= 10) {
                    setIdentifier(digitsOnly);
                  }
                }}
                placeholder="Enter your 10-digit Phone Number" 
                className="saas-v3-form-input" 
                style={{ paddingLeft: '44px' }}
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
            {loading ? 'Please wait...' : <>Continue <ArrowRight size={18} style={{ marginLeft: '4px' }} /></>}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
            <div style={{ padding: '0 16px', color: '#9ca3af', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase' }}>Or</div>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
          </div>
          
          <button 
            type="button"
            onClick={handleGoogleLogin} 
            disabled={loading} 
            className="saas-v3-btn-outline"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>

      {reAuthOverlayVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <KeyRound style={{ color: '#ef4444', width: '24px', height: '24px' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', textAlign: 'center', margin: '0 0 12px 0' }}>Session Expired</h2>
            <p style={{ fontSize: '15px', color: '#4b5563', textAlign: 'center', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              Your Google session has expired due to a recent security update. Please verify your updated Gmail password to refresh your session.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button 
                onClick={handleReAuth}
                disabled={loading}
                className="saas-v3-btn-solid"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
              >
                {loading ? 'Verifying...' : 'Verify via Google'}
              </button>
              <button 
                onClick={() => setReAuthOverlayVisible(false)}
                disabled={loading}
                className="saas-v3-btn-outline"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
