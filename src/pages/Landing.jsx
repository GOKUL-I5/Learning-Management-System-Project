import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Shield, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingParticles from '../components/FloatingParticles';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5 }}
    >
      <FloatingParticles />

      <header className="px-8 py-6 flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-white/50 relative z-10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-slate-800 tracking-tight">CoreLearn</span>
        </div>
        <Button type="primary" size="large" onClick={() => navigate('/login')} className="font-semibold shadow-md">
          Portal Login
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-4 inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm border border-blue-200"
          >
            Passwordless Educational Platform
          </motion.div>
          <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            The Future of <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Learning Management</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto font-medium">
            A secure, seamless platform designed for modern educational institutions. Streamline administration with intelligent role-based access.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(59, 130, 246, 0.5)" }}
            whileTap={{ scale: 0.95 }}
            className="group h-14 px-10 text-lg font-semibold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl flex items-center gap-3 mx-auto transition-all"
            onClick={() => navigate('/login')}
          >
            Open Portal
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </motion.button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto w-full px-4"
        >
          {[
            { icon: Shield, color: 'blue', title: 'Passwordless Security', desc: 'Unique access codes replace traditional passwords for enhanced security.' },
            { icon: Users, color: 'indigo', title: 'Role-Based Access', desc: 'Dedicated dashboards tailored for Admins, Staff, and Students.' },
            { icon: Zap, color: 'purple', title: 'Instant Setup', desc: 'Bulk import students via CSV and generate access codes instantly.' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-sm hover:shadow-xl border border-white transition-shadow flex flex-col items-center"
            >
              <div className={`w-16 h-16 bg-${feature.color}-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner`}>
                <feature.icon className={`w-8 h-8 text-${feature.color}-600`} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-500 text-center">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </motion.div>
  );
};

export default Landing;
