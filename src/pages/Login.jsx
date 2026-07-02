import { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { identifyUser, verifyUniqueCode, loginWithGoogle } from '../firebase/services';
import { BookOpen, KeyRound, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const Login = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: closed, 1: identifier
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

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

  const handleNext = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields(['identifier']);
      const currentIdentifier = values.identifier;
      const studentPhoneNumber = currentIdentifier;
      
      const user = await identifyUser(currentIdentifier);
      

      if (user.role === 'superadmin') {
        message.success(`Welcome back, ${user.name || 'Super Admin'}!`);
        navigate('/superadmin');
        return;
      }

      // Redirect to verification step
      navigate('/verify-code');
    } catch (error) {
      if (error.message === 'Unauthorized User') {
        message.error('Unauthorized User. Your account is not registered.');
      } else if (error.name !== 'ValidationError') {
        message.error('Login failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      
      if (user.role === 'superadmin') {
        message.success(`Welcome back, ${user.name || 'Super Admin'}!`);
        navigate('/superadmin');
      } else {
        // Redirect to verification step
        navigate('/verify-code');
      }
    } catch (error) {
      if (error.message === 'Unauthorized Email') {
        message.error('Unauthorized Email. Your Google account is not registered.');
      } else {
        message.error('Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mobile stacked card UI
  if (isMobile) {
    return (
      <motion.div 
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">LMS Portal</h2>
            <p className="text-slate-500 text-sm">Sign in to continue</p>
          </div>

          <Form form={form} layout="vertical" size="large">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Form.Item
                    name="identifier"
                    label="Phone Number"
                    rules={[
                      { required: true, message: 'Please input your Phone Number!' },
                      { pattern: /^[0-9+\-\\s()]+$/, message: 'Please enter a valid phone number!' }
                    ]}
                  >
                    <Input prefix={<Phone className="text-slate-400 mr-2" />} placeholder="Enter your Phone Number" className="h-12 rounded-xl" />
                  </Form.Item>
                  <Button type="primary" onClick={handleNext} loading={loading} className="w-full h-12 rounded-xl mt-4">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400">Or</span></div>
                  </div>
                  <Button onClick={handleGoogleLogin} loading={loading} className="w-full h-12 rounded-xl border-slate-300 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-700 font-medium">
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
                    Continue with Google
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Form>
        </div>
      </motion.div>
    );
  }

  // Desktop 3D Book UI
  return (
    <motion.div 
      className="min-h-screen bg-slate-900 flex items-center justify-center p-8 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[1000px] h-[600px] mx-auto perspective-1000 relative z-10 flex justify-center items-center">
        
        {/* Book Container */}
        <motion.div 
          className="relative w-1/2 h-full preserve-3d" 
          style={{ transformOrigin: 'left center' }}
          initial={false}
          animate={{ x: step === 0 ? 0 : "50%" }}
          transition={{ duration: 1.5, ease: [0.645, 0.045, 0.355, 1], delay: 0.2 }}
        >
          
          <motion.div 
            className="absolute inset-0 preserve-3d origin-left z-20"
            initial={false}
            animate={{ rotateY: 0 }}
            transition={{ duration: 1.2, ease: [0.645, 0.045, 0.355, 1] }}
          >
            {/* FRONT OF INNER PAGE (Step 1) */}
            <div className="absolute inset-0 bg-slate-50 rounded-r-2xl shadow-[-5px_0_15px_rgba(0,0,0,0.1)] border-l border-slate-200 p-12 backface-hidden flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
              <p className="text-slate-500 mb-8">Enter your registered phone number to begin.</p>
              
              {step === 1 && (
                <Form form={form} layout="vertical" size="large">
                  <Form.Item 
                    name="identifier" 
                    rules={[
                      { required: true, message: 'Phone Number required!' },
                      { pattern: /^[0-9+\-\\s()]+$/, message: 'Please enter a valid phone number!' }
                    ]}
                  >
                    <Input prefix={<Phone className="text-slate-400 mr-2" />} placeholder="Enter your Phone Number" className="h-14 rounded-xl text-lg" />
                  </Form.Item>
                  <Button type="primary" onClick={handleNext} loading={loading} className="w-full h-14 rounded-xl mt-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-5 h-5" />
                  </Button>
                  
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-4 bg-slate-50 text-slate-400 font-medium tracking-wide uppercase">Or</span></div>
                  </div>

                  <Button onClick={handleGoogleLogin} loading={loading} className="w-full h-14 rounded-xl border-slate-300 shadow-md flex items-center justify-center gap-3 hover:bg-white text-slate-700 font-semibold text-lg transition-all">
                    <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
                    Continue with Google
                  </Button>
                </Form>
              )}
            </div>
          </motion.div>

          {/* MAIN COVER (Flips open on load) */}
          <motion.div 
            className="absolute inset-0 preserve-3d origin-left z-30"
            initial={false}
            animate={{ rotateY: step === 0 ? 0 : -180 }}
            transition={{ duration: 1.5, ease: [0.645, 0.045, 0.355, 1], delay: 0.2 }}
          >
            {/* FRONT OF COVER */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-900 rounded-r-2xl shadow-2xl backface-hidden flex flex-col items-center justify-center border-l-4 border-indigo-950">
              <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-sm border border-white/20">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-extrabold text-white text-center tracking-tight px-8">LMS Portal<br/><span className="text-2xl font-medium text-blue-200 mt-2 block">Open to Learn</span></h1>
            </div>

            {/* BACK OF COVER (Becomes the Left Page when Step=1) */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-l-2xl shadow-xl rotate-y-180 backface-hidden flex flex-col justify-center items-center p-12 text-white border-r border-indigo-800">
              <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm border border-white/20">
                <BookOpen className="w-10 h-10 text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4">Education Empowered</h3>
              <p className="text-blue-200 text-center text-lg leading-relaxed">
                "The beautiful thing about learning is that no one can take it away from you."
              </p>
              <div className="mt-8 text-blue-400 font-medium">— B.B. King</div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </motion.div>
  );
};

export default Login;
