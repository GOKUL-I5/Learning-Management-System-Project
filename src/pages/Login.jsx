import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { identifyUser, verifyUniqueCode, ensureSuperAdminInFirestore } from '../firebase/services';
import { auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { BookOpen, KeyRound, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
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
      if (!identifier || !/^[0-9+\-\s()]+$/.test(identifier)) {
        setErrorMsg('Please enter a valid phone number!');
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
          const userData = await ensureSuperAdminInFirestore(result.user.email, result.user.displayName);
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
      } else {
        setErrorMsg("Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="login-logo-wrapper">
          <div className="login-logo">
            <BookOpen className="w-8 h-8 login-icon" />
          </div>
        </div>
        
        <h1 className="login-title">LMS Portal</h1>
        <p className="login-subtitle">Education Empowered</p>
        <div className="login-quote">
          "The beautiful thing about learning is that no one can take it away from you."<br/><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>— B.B. King</span>
        </div>

        {errorMsg && <div style={{ color: 'var(--danger-vibrant, #ef4444)', padding: '10px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: 'var(--success-vibrant, #10b981)', padding: '10px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>{successMsg}</div>}

        <form onSubmit={handleNext} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="login-form-group">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone style={{ position: 'absolute', left: '12px', color: 'var(--text-muted-gray)' }} size={18} />
              <input 
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your Phone Number" 
                className="login-input" 
                style={{ paddingLeft: '40px', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-solid-white)', color: 'var(--text-primary-crisp)', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="login-btn-primary"
            style={{ cursor: loading ? 'not-allowed' : 'pointer', border: 'none' }}
          >
            {loading ? 'Please wait...' : <>Continue <ArrowRight size={18} style={{ marginLeft: '8px' }} /></>}
          </button>
          
          <div className="login-divider">
            <div className="login-divider-line"></div>
            <div className="login-divider-text">Or</div>
            <div className="login-divider-line"></div>
          </div>
          
          <button 
            type="button"
            onClick={handleGoogleLogin} 
            disabled={loading} 
            className="login-btn-google"
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
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
    </div>
  );
};

export default Login;
