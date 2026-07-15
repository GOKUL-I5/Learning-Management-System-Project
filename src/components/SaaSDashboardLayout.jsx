import React, { useState } from 'react';
import { Search, Moon, Sun, Bell, Settings, Download, Plus, Grid, Calendar, FileText, MessageSquare, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SaaSDashboardLayout = ({ children, activeTab, onTabChange, userName, onAddClick, menuItems = [] }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('lms_user');
    navigate('/login');
  };

  return (
    <div className="saas-v2-wrapper">
      <div className="saas-v2-canvas">
        
        {/* Floating Sidebar */}
        <div className="saas-v2-sidebar">
          {/* Top Logo / App Icon in Sidebar */}
          <div className="mb-6 w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center cursor-pointer">
            <div className="w-6 h-6 bg-white rounded-md grid grid-cols-2 gap-1 p-1">
              <div className="bg-indigo-600 rounded-sm"></div>
              <div className="bg-indigo-600 rounded-sm"></div>
              <div className="bg-indigo-600 rounded-sm"></div>
              <div className="bg-indigo-600 rounded-sm"></div>
            </div>
          </div>

          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`saas-v2-sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange && onTabChange(item.id)}
              title={item.id}
            >
              {item.icon}
            </div>
          ))}

          <div className="mt-auto mb-4 cursor-pointer text-white/70 hover:text-white transition-colors" onClick={handleLogout} title="Logout">
            <Settings size={24} strokeWidth={1.5} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="saas-v2-main">
          
          {/* Header */}
          <div className="saas-v2-header">
            <div className="flex items-center gap-12">
              <div className="saas-v2-header-logo">
                <div className="w-6 h-6 border-2 border-slate-800 rounded grid grid-cols-2 gap-0.5 p-0.5">
                  <div className="bg-slate-800 rounded-sm"></div>
                  <div className="bg-slate-800 rounded-sm"></div>
                  <div className="bg-slate-800 rounded-sm"></div>
                  <div className="bg-slate-800 rounded-sm"></div>
                </div>
                Dashboard
              </div>
              
              <div className="saas-v2-header-nav hidden md:flex">
                <div className="saas-v2-header-nav-item">
                  <Grid size={16} /> Workflows
                </div>
                <div className="saas-v2-header-nav-item">
                  <Plus size={16} /> Integrations
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="saas-v2-search hidden md:flex">
                <Search size={18} className="text-slate-400" />
                <input type="text" placeholder="Search or type command" />
              </div>

              <div className="saas-v2-theme-toggle">
                <div 
                  className={`saas-v2-theme-btn ${!isDarkMode ? 'active' : ''}`}
                  onClick={() => setIsDarkMode(false)}
                >
                  <Sun size={14} className="inline mr-1" /> Light
                </div>
                <div 
                  className={`saas-v2-theme-btn ${isDarkMode ? 'active' : ''}`}
                  onClick={() => setIsDarkMode(true)}
                >
                  <Moon size={14} className="inline mr-1" /> Dark
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-500">
                <Bell size={20} className="cursor-pointer hover:text-slate-800" />
                <Settings size={20} className="cursor-pointer hover:text-slate-800" />
              </div>

              <div className="saas-v2-header-actions">
                <button className="saas-v2-btn-export hidden lg:flex">
                  <Download size={16} /> Export data
                </button>
                <button className="saas-v2-btn-primary" onClick={onAddClick}>
                  Add new board
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Content */}
          <div className="flex-1 w-full max-w-[1400px] mx-auto">
            {children}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default SaaSDashboardLayout;
