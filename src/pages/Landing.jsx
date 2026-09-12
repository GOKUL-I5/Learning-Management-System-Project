import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Shield, Users, Zap, Sun, Moon, CheckCircle, GraduationCap, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingParticles from '../components/FloatingParticles';
import DotField from '../components/DotField';
import SEO from '../components/SEO';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('app-theme') === 'dark';
  });

  useEffect(() => {
    const themeStr = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeStr);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('app-theme', newMode ? 'dark' : 'light');
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const landingSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${import.meta.env.VITE_SITE_URL || ''}/#website`,
        "url": `${import.meta.env.VITE_SITE_URL || ''}/`,
        "name": "CoreLearn LMS",
        "description": "A secure, minimalist learning management platform designed for modern educational institutions."
      },
      {
        "@type": "Organization",
        "@id": `${import.meta.env.VITE_SITE_URL || ''}/#organization`,
        "name": "CoreLearn LMS",
        "url": `${import.meta.env.VITE_SITE_URL || ''}/`,
        "logo": {
          "@type": "ImageObject",
          "url": `${import.meta.env.VITE_SITE_URL || ''}/vite.svg`
        }
      }
    ]
  };

  return (
    <div className="landing-page">
      <SEO 
        title="CoreLearn LMS - Passwordless Educational Platform"
        description="A secure, minimalist learning management platform designed for modern educational institutions. Streamline administration with intelligent, role-based access."
        canonicalUrl="/"
        schema={landingSchema}
      />
      {/* --- HERO SECTION --- */}
      <section className="hero-section">
        {/* Interactive Backgrounds */}
        <div className="hero-background">
          <div className="dot-field-wrapper">
            <DotField
              dotRadius={1.5}
              dotSpacing={14}
              bulgeStrength={67}
              glowRadius={160}
              sparkle={false}
              waveAmplitude={0}
              glowColor="rgba(59, 130, 246, 0.1)"
            />
          </div>
          <FloatingParticles />
        </div>

        {/* Header */}
        <header className="landing-header">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-800 tracking-tight" style={{ color: 'var(--text-main)' }}>CoreLearn</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 icon-rotate" style={{ transform: 'rotate(360deg)' }} />
              ) : (
                <Moon className="w-5 h-5 icon-rotate" style={{ transform: 'rotate(0deg)' }} />
              )}
            </button>
            <button className="saas-v3-btn-outline" style={{ padding: '8px 16px' }} onClick={() => navigate('/login')}>
              Log In
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="hero-content">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="hero-badge"
            >
              Passwordless Educational Platform
            </motion.div>
            
            <h1 className="hero-title">
              The Future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600" style={{ display: 'inline-block' }}>Learning Management</span>
            </h1>
            
            <p className="hero-subtitle">
              A secure, minimalist platform designed for modern educational institutions. Streamline administration with intelligent, role-based access without the hassle of passwords.
            </p>
            
            <div className="hero-actions">
              <button className="saas-v3-btn-solid" style={{ padding: '14px 32px', fontSize: '16px' }} onClick={() => navigate('/login')}>
                Open Portal <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section className="section-padding" style={{ backgroundColor: '#F7F8FA' }}>
        <div className="section-header">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
            <h2 className="section-title">Everything you need</h2>
            <p className="section-subtitle">We've stripped away the complexity to focus on what truly matters for educators and students.</p>
          </motion.div>
        </div>
        
        <div className="features-grid">
          {[
            { icon: Shield, color: '#111827', bg: '#f1f5f9', title: 'Passwordless Security', desc: 'No more forgotten passwords. Unique access codes provide seamless, secure authentication for everyone.' },
            { icon: Users, color: '#111827', bg: '#f1f5f9', title: 'Role-Based Dashboards', desc: 'Distinct interfaces tailored specifically for Administrators, Staff, and Students to maximize productivity.' },
            { icon: Zap, color: '#111827', bg: '#f1f5f9', title: 'Instant Provisioning', desc: 'Bulk import thousands of students via CSV and generate access credentials in seconds.' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }
              }}
              className="saas-v3-container"
              style={{ padding: '32px', display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div className="feature-icon-wrapper" style={{ backgroundColor: feature.bg, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <feature.icon style={{ color: feature.color, width: '24px', height: '24px' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>{feature.title}</h3>
              <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.6' }}>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- ROLES OVERVIEW SECTION --- */}
      <section className="section-padding" style={{ backgroundColor: '#ffffff' }}>
        <div className="section-header">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="section-title">Built for your entire institution</h2>
            <p className="section-subtitle">Dedicated workflows that adapt to the user's role.</p>
          </motion.div>
        </div>

        <div className="roles-grid">
          {/* Admin Role */}
          <motion.div 
            className="role-row"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <div className="role-content">
              <h3 style={{ color: '#111827' }}>Administration</h3>
              <p style={{ color: '#6b7280' }}>Total control over your institution's digital ecosystem. Manage users, oversee departments, and monitor platform engagement from a centralized command center.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#374151', fontWeight: '500' }}>
                {['Bulk CSV User Import', 'Access Code Generation', 'System Analytics'].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <CheckCircle className="w-5 h-5" style={{ color: '#111827' }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="role-visual saas-v3-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <LayoutDashboard className="w-32 h-32" style={{ color: '#e2e8f0' }} />
            </div>
          </motion.div>

          {/* Student Role */}
          <motion.div 
            className="role-row"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <div className="role-content">
              <h3 style={{ color: '#111827' }}>Student Experience</h3>
              <p style={{ color: '#6b7280' }}>A distraction-free environment focused entirely on learning. Students can easily access their courses, track their progress, and engage with materials without jumping through hoops.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#374151', fontWeight: '500' }}>
                {['Single-Click Login', 'Course Tracking', 'Assignment Management'].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <CheckCircle className="w-5 h-5" style={{ color: '#111827' }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="role-visual saas-v3-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <GraduationCap className="w-32 h-32" style={{ color: '#e2e8f0' }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="section-padding" style={{ textAlign: 'center', backgroundColor: '#F7F8FA' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="saas-v3-container" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '16px', letterSpacing: '-0.02em' }}>Ready to modernize your institution?</h2>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>Join the schools that are upgrading their learning management.</p>
          <button className="saas-v3-btn-solid" style={{ padding: '12px 24px', fontSize: '15px' }} onClick={() => navigate('/login')}>
            Enter Portal <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="landing-footer">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-slate-800" style={{ color: 'var(--text-main)' }}>CoreLearn</span>
        </div>
        <p>© {new Date().getFullYear()} CoreLearn. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
