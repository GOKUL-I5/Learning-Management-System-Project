import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Shield, Users, Zap, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingParticles from '../components/FloatingParticles';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('app-theme') === 'dark';
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const themeStr = newMode ? 'dark' : 'light';
    localStorage.setItem('app-theme', themeStr);
    document.documentElement.setAttribute('data-theme', themeStr);
  };

  return (
    <div className="landing-wrapper">
      <FloatingParticles />

      <header className="landing-header">
        <div className="flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-slate-800 tracking-tight" style={{ color: 'var(--landing-header-title)' }}>CoreLearn</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-6 h-6 icon-rotate" style={{ transform: 'rotate(360deg)' }} />
            ) : (
              <Moon className="w-6 h-6 icon-rotate" style={{ transform: 'rotate(0deg)' }} />
            )}
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px', maxWidth: 'none' }} onClick={() => navigate('/login')}>
            Portal Login
          </button>
        </div>
      </header>

      <main className="landing-main">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-4 inline-block px-4 py-1.5 rounded-full font-semibold text-sm border"
            style={{ backgroundColor: 'var(--badge-bg, #eff6ff)', color: 'var(--badge-text, #1d4ed8)', borderColor: 'var(--badge-border, #bfdbfe)' }}
          >
            Passwordless Educational Platform
          </motion.div>
          <h1 className="landing-title">
            The Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600" style={{ display: 'inline-block' }}>Learning Management</span>
          </h1>
          <p className="landing-subtitle">
            A secure, seamless platform designed for modern educational institutions. Streamline administration with intelligent role-based access.
          </p>
          
          <div className="landing-actions">
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Open Portal <ArrowRight className="w-5 h-5" />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/plans')}>
              Explore Now
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="landing-features"
        >
          {[
            { icon: Shield, color: '#3b82f6', bg: '#eff6ff', title: 'Passwordless Security', desc: 'Unique access codes replace traditional passwords for enhanced security.' },
            { icon: Users, color: '#4f46e5', bg: '#eef2ff', title: 'Role-Based Access', desc: 'Dedicated dashboards tailored for Admins, Staff, and Students.' },
            { icon: Zap, color: '#9333ea', bg: '#faf5ff', title: 'Instant Setup', desc: 'Bulk import students via CSV and generate access codes instantly.' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="feature-card"
            >
              <div style={{ backgroundColor: feature.bg, width: '4rem', height: '4rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <feature.icon style={{ color: feature.color, width: '2rem', height: '2rem' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-500 text-center leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};

export default Landing;
