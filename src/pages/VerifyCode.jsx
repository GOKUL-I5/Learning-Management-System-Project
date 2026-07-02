import { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { verifyUniqueCode } from '../firebase/services';
import { KeyRound, ShieldCheck, Mail, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyCode = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
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
      message.success(`Verification successful. Welcome back!`);
      
      // Redirect based on role
      switch (user.role) {
        case 'admin': navigate('/admin'); break;
        case 'staff': navigate('/staff'); break;
        case 'student': navigate('/student'); break;
        default: navigate('/');
      }
    } catch (error) {
      message.error(error.message || 'Invalid Access Code. Please contact your administrator.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('pending_user');
    navigate('/login');
  };

  return (
    <motion.div 
      className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-100">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 p-8 text-center border-b border-slate-100">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Security Verification</h2>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Verification Required. Enter your Organization Access Code to securely access your dashboard.
          </p>
        </div>

        {/* Verification Form */}
        <div className="p-8">
          
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center gap-3">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600 truncate">Verifying for: {email}</span>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="accessCode"
              rules={[{ required: true, message: 'Please input your Organization Access Code!' }]}
            >
              <Input.Password 
                prefix={<KeyRound className="text-slate-400 mr-2 w-5 h-5" />} 
                placeholder="Enter Access Code" 
                className="h-14 rounded-xl text-lg font-mono tracking-widest text-center" 
              />
            </Form.Item>
            
            <div className="mt-8 space-y-4">
              <Button type="primary" htmlType="submit" loading={loading} className="w-full h-14 rounded-xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
                Verify Identity
              </Button>
              
              <Button type="text" onClick={handleCancel} className="w-full h-12 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 font-medium">
                <LogOut className="w-4 h-4" /> Cancel & Logout
              </Button>
            </div>
          </Form>

        </div>
      </div>
    </motion.div>
  );
};

export default VerifyCode;
