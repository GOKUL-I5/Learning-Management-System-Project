import React, { useState, useEffect } from 'react';
import { logoutUser, uploadProfilePhoto, getStudentAssignments, getOrganizationCourses, subscribeToStudentAssignments, getOrganizationDetails, updateUserDoc, subscribeToFeeTransactions, updateStudentStatus, listenToOrganizationStatus, getCourseAssignments, logTransaction, subscribeToStudentSchedules, subscribeToUserProfile } from '../../firebase/services';
import { LogOut, BookOpen, User, Users, Building, Mail, Key, Calendar, Clock, ExternalLink, FileText, Download, Video, Pencil, Check, X, CreditCard, DollarSign, Receipt, FolderOpen, Upload as UploadIcon, Settings, Bell, ChevronDown, Shield, UserCircle, MonitorPlay, Moon, Search } from 'lucide-react';
import './StudentDashboard.css';

const message = {
  success: (msg) => alert(msg),
  error: (msg) => alert(msg),
  info: (msg) => alert(msg),
  warning: (msg) => alert(msg)
};

const StudentDashboard = () => {
  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('lms_user');
    return userStr ? JSON.parse(userStr) : null;
  });
  const [uploading, setUploading] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [courseContentUrl, setCourseContentUrl] = useState(null);
  const [contentObjects, setContentObjects] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logoUrl, setLogoUrl] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [feeStatusMessage, setFeeStatusMessage] = useState('');
  const [courseRoster, setCourseRoster] = useState([]);
  const [mySchedules, setMySchedules] = useState([]);

  const parseFirestoreDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-IN');
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('en-IN');
    }
    const dateObj = new Date(timestamp);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-IN');
    }
    return 'N/A';
  };


  const isBirthday = user?.dob && (() => {
    try {
      const today = new Date();
      const dobDate = new Date(user.dob);
      return today.getMonth() === dobDate.getMonth() && today.getDate() === dobDate.getDate();
    } catch(e) {
      return false;
    }
  })();

  useEffect(() => {
    if (user?.organizationId) {
      const unsubscribe = listenToOrganizationStatus(user.organizationId, (status) => {
        if (status === 'suspended') {
          message.error('Your organization access has been suspended. Please contact SuperAdmin.');
          logoutUser();
        }
      });
      return () => unsubscribe();
    }
  }, [user]);
  const [editNameValue, setEditNameValue] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isBillModalVisible, setIsBillModalVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const profileUploadRef = React.useRef(null);

  const totalCourseFee = user?.courseFee || 28000;
  const trueTotalPaid = receipts.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const dynamicallyPaidFee = trueTotalPaid > 0 ? trueTotalPaid : (user?.paidFee || user?.paidAmount || 0);
  const pendingFee = Math.max(0, totalCourseFee - dynamicallyPaidFee);

  const filteredSchedules = mySchedules.filter(s => s.courseName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.staffName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredContentObjects = contentObjects.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredReceipts = receipts.filter(r => r.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || String(r.totalAmount).includes(searchQuery));

  const handlePayment = async () => {
    // Razorpay checkout disabled for offline payment mode
    message.info("Online payments are currently disabled. Please contact the administration.");
  };

  useEffect(() => {
    let unsubscribeFees = null;
    let unsubscribeSchedules = null;
    let unsubscribeUser = null;

    if (user?.id) {
      unsubscribeUser = subscribeToUserProfile(user.id, (userData) => {
        if (userData) {
          setUser(userData);
          localStorage.setItem('lms_user', JSON.stringify(userData));
        }
      });
      unsubscribeFees = subscribeToFeeTransactions(user.id, (data) => {
        setReceipts(data);
      });
      unsubscribeSchedules = subscribeToStudentSchedules(user.id, (data) => {
        setMySchedules(data);
      });
    }
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeFees) unsubscribeFees();
      if (unsubscribeSchedules) unsubscribeSchedules();
    };
  }, [user?.id, activeTab]);

  useEffect(() => {
    if (!user?.organizationId || !user?.id) return;
    
    // Fetch courses, org details, and assignments once
    Promise.all([
      getOrganizationCourses(user.organizationId),
      getOrganizationDetails(user.organizationId),
      getCourseAssignments(user.organizationId)
    ]).then(([courses, orgDetails, allAssignments]) => {
      if (orgDetails.logoUrl) setLogoUrl(orgDetails.logoUrl);

      // Filter roster for the student's enrolled course
      if (user.course) {
        const studentCourse = courses.find(c => c.name === user.course);
        if (studentCourse && studentCourse.modules) {
          const modulesList = studentCourse.modules.split(/[\n,]+/).map(m => m.trim()).filter(Boolean);
          const roster = modulesList.map(mod => {
            const assignmentMatch = allAssignments.find(a => a.courseName === mod);
            return {
              module: mod,
              facultyName: assignmentMatch ? assignmentMatch.staffName : 'Pending Assignment'
            };
          });
          setCourseRoster(roster);
        }
      }

      // Subscribe to real-time assignment updates
      const unsubscribe = subscribeToStudentAssignments(user.organizationId, user.id, (assignments) => {
        if (assignments.length > 0) {
          const currentAssignment = assignments[0];
          setAssignment(currentAssignment);
          
          const matchedCourse = courses.find(c => c.name === currentAssignment.courseName);
          if (matchedCourse) {
            if (matchedCourse.contentUrl) setCourseContentUrl(matchedCourse.contentUrl);
            if (matchedCourse.contentObjects && matchedCourse.contentObjects.length > 0) {
              setContentObjects(matchedCourse.contentObjects);
            }
          }
        }
      });
      // Cleanup subscription on unmount
      return () => unsubscribe();
    }).catch(console.error);
  }, [user]);

  const [uploadingDoc, setUploadingDoc] = useState(null);

  const handleDocumentUpload = async (file, docType) => {
    if (!file) return false;
    setUploadingDoc(docType);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'my_lms_preset');

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        const currentDocs = user.documents || {};
        const updateData = { documents: { ...currentDocs, [docType]: data.secure_url } };
        
        await updateUserDoc(user.id, updateData);
        
        if (docType === 'idProofUrl') {
          await updateStudentStatus(user.id, user.statusHistory || [], user.currentStatus || 'Active', '[Aadhaar Redacted] Document Uploaded');
          await logTransaction('UPLOAD_ID_DOCUMENT', {
             token: '[Aadhaar Redacted]',
             studentId: user.id,
             studentName: user.name
          });
        }

        const updatedUser = { ...user, documents: { ...currentDocs, [docType]: data.secure_url } };
        setUser(updatedUser);
        localStorage.setItem('lms_user', JSON.stringify(updatedUser));
        message.success(`${docType === 'profilePhotoUrl' ? 'Profile Photo' : 'ID Document'} uploaded successfully!`);
      } else {
        throw new Error(data.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setUploadingDoc(null);
    }
    return false; // Prevent default antd upload behavior
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim()) {
      message.warning("Name cannot be empty");
      return;
    }
    try {
      await updateUserDoc(user.id, { name: editNameValue.trim() });
      const updatedUser = { ...user, name: editNameValue.trim() };
      setUser(updatedUser);
      localStorage.setItem('lms_user', JSON.stringify(updatedUser));
      setIsEditingName(false);
      message.success('Name updated successfully!');
    } catch (error) {
      message.error('Failed to update name: ' + error.message);
    }
  };

  const handleDownloadReceipt = (receipt) => {
    const receiptContent = `
========================================
             FEE RECEIPT
========================================
Receipt Number: ${receipt.billNumber}
Date: ${parseFirestoreDate(receipt.timestamp)}
Organization: ${user?.organizationName || 'N/A'}
Student Name: ${user?.name || 'N/A'}
Enrollment No: ${user?.enrollmentNo || 'N/A'}
Course: ${receipt.course || user?.course || 'N/A'}
----------------------------------------
Payment Split:
Cash: ₹${receipt.paymentSplit?.cash || 0}
UPI: ₹${receipt.paymentSplit?.upi || 0}
Card: ₹${receipt.paymentSplit?.card || 0}
----------------------------------------
Total Amount Paid: ₹${receipt.totalAmount}
========================================
This is an automatically generated receipt.
    `.trim();
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receipt.billNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(`Downloading ${receipt.billNumber}...`);
  };

  return (
    <div className="uxer-layout">
      <input type="file" ref={profileUploadRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleDocumentUpload(e.target.files[0], 'profilePhotoUrl');
          e.target.value = null;
        }
      }} />
      {/* Sidebar Navigation */}
      <aside className="uxer-sidebar">
        <div className="uxer-sidebar-logo">
          <div className="logo-icon"></div>
          <span style={{ fontSize: '24px', fontWeight: '800', color: '#111111', letterSpacing: '-0.5px' }}>Student</span>
        </div>
        
        <div className="uxer-sidebar-menu">
          <div className="uxer-sidebar-category">MAIN MENU</div>
          <div onClick={() => setActiveTab('dashboard')} className={`uxer-sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}><User style={{ width: '20px', height: '20px' }} /> Dashboard</div>
          <div onClick={() => setActiveTab('course')} className={`uxer-sidebar-item ${activeTab === 'course' ? 'active' : ''}`}><FileText style={{ width: '20px', height: '20px' }} /> View Course</div>
          <div onClick={() => setActiveTab('fee')} className={`uxer-sidebar-item ${activeTab === 'fee' ? 'active' : ''}`}><CreditCard style={{ width: '20px', height: '20px' }} /> Fee Payment</div>
          <div onClick={() => setActiveTab('documents')} className={`uxer-sidebar-item ${activeTab === 'documents' ? 'active' : ''}`}><FolderOpen style={{ width: '20px', height: '20px' }} /> Document Center</div>
          <div onClick={() => setActiveTab('settings')} className={`uxer-sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}><Settings style={{ width: '20px', height: '20px' }} /> Settings</div>
        </div>

        {/* Sidebar Bottom Profile Widget */}
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: 'auto -12px -20px -12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            {user?.documents?.profilePhotoUrl || user?.photoUrl ? (
              <img onClick={() => profileUploadRef.current?.click()} src={user?.documents?.profilePhotoUrl || user?.photoUrl} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0, cursor: 'pointer' }} />
            ) : (
              <div onClick={() => profileUploadRef.current?.click()} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 'bold', border: '1px solid var(--border-color)', flexShrink: 0, cursor: 'pointer' }}>
                {user?.name?.charAt(0).toUpperCase() || 'K'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name || 'Student'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.organizationName || 'Organization'}</span>
            </div>
          </div>
          <button onClick={logoutUser} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', color: 'var(--text-secondary)' }} title="Logout" onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
            <LogOut style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="uxer-main">
        <header className="uxer-header">
          <div className="uxer-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Organization Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {(user?.organizationName || 'O').charAt(0)}
                </div>
              )}
              <div className="org-text" style={{ textTransform: 'uppercase', margin: 0 }}>{user?.organizationName || 'Organization'}</div>
            </div>
            <h1>Student Portal</h1>
          </div>
          <div className="uxer-header-right">
            <div className="uxer-search">
              <Search style={{ width: '16px', height: '16px', color: '#999', flexShrink: 0 }} />
              <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <div className="uxer-shortcut">&#8984; F</div>
            </div>
            
            <button style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid var(--border-color)', backgroundColor: 'transparent', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
              <Bell style={{ width: '20px', height: '20px', color: 'var(--text-secondary)' }} />
              <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: 'var(--text-main)', borderRadius: '50%', border: '2px solid var(--card-bg)' }}></span>
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <div style={{ padding: '32px 48px', overflowY: 'auto' }}>
          
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Welcome Banner */}
              <div className="uxer-table-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {user?.documents?.profilePhotoUrl || user?.photoUrl ? (
                    <img onClick={() => profileUploadRef.current?.click()} src={user?.documents?.profilePhotoUrl || user?.photoUrl} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0, cursor: 'pointer' }} />
                  ) : (
                    <div onClick={() => profileUploadRef.current?.click()} style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', flexShrink: 0, cursor: 'pointer' }}>
                      {user?.name?.charAt(0).toUpperCase() || 'K'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Good afternoon, {user?.name?.split(' ')[0] || 'Karthik'}! <span role="img" aria-label="wave">👋</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: '500', fontSize: '16px' }}>Here's what's happening with your academic journey today.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px', justifySelf: 'flex-end' }}>
                  {/* Decorative element resembling the illustration */}
                  <User style={{ width: '64px', height: '64px', color: 'var(--text-main)' }} />
                  <BookOpen style={{ width: '64px', height: '64px', color: 'var(--uxer-primary)' }} />
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div style={{ width: '100%', marginBottom: '24px' }}>
                <div className="uxer-stats-grid">
                  <div className="uxer-stat-card">
                    <div className="uxer-stat-title">TODAY'S CLASSES</div>
                    <div className="uxer-stat-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      <div className="uxer-stat-value">{mySchedules.length}</div>
                      <div className="uxer-stat-badge">
                        <span className="uxer-stat-badge-text" style={{ textAlign: 'left', marginLeft: 0 }}>{mySchedules.length === 0 ? 'No classes scheduled' : 'Classes today'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="uxer-stat-card">
                    <div className="uxer-stat-title">ATTENDANCE</div>
                    <div className="uxer-stat-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      <div className="uxer-stat-value">92%</div>
                      <div className="uxer-stat-badge">
                        <span className="uxer-stat-badge-text" style={{ textAlign: 'left', marginLeft: 0 }}>This Month</span>
                      </div>
                    </div>
                  </div>

                  {pendingFee > 0 ? (
                    <div className="uxer-stat-card">
                      <div className="uxer-stat-title">OUTSTANDING FEES</div>
                      <div className="uxer-stat-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                        <div className="uxer-stat-value">₹{pendingFee.toLocaleString('en-IN')}</div>
                        <div className="uxer-stat-badge">
                          <div className="uxer-stat-badge-pill red">Pending Payment</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="uxer-stat-card">
                    <div className="uxer-stat-title">ENROLLMENT NO.</div>
                    <div className="uxer-stat-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                      <div className="uxer-stat-value">{user?.enrollmentNo || '154'}</div>
                      <div className="uxer-stat-badge">
                        <div className="uxer-stat-badge-pill green">Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Column Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
                
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Smart Notifications & Reminders */}
                  <div className="uxer-table-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell style={{ width: '20px', height: '20px', color: 'var(--text-secondary)' }} /> Smart Notifications
                      </h3>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View All <ChevronDown style={{ width: '16px', height: '16px', transform: 'rotate(-90deg)' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pendingFee > 0 && (
                        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                           <div style={{ padding: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: '50%', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                             <DollarSign style={{ width: '20px', height: '20px', color: '#1e293b' }} />
                           </div>
                           <div style={{ flex: 1 }}>
                             <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px', marginBottom: '4px' }}>Fee Reminder</div>
                             <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>You have an outstanding balance of ₹{pendingFee.toLocaleString('en-IN')}. Please complete your payment.</div>
                           </div>
                           <div 
                             onClick={() => alert(`Your fee due date is: ${user?.dueDate || 'Not specified'}`)}
                             style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                             Due Now <ChevronDown style={{ width: '16px', height: '16px', transform: 'rotate(-90deg)' }} />
                           </div>
                        </div>
                      )}
                      
                      <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                         <div style={{ padding: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: '50%', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                           <Users style={{ width: '20px', height: '20px', color: '#1e293b' }} />
                         </div>
                         <div style={{ flex: 1 }}>
                           <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px', marginBottom: '4px' }}>Attendance Update</div>
                           <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Your recent attendance has been logged successfully. Maintain above 85% to appear for exams.</div>
                         </div>
                         <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                           2h ago <ChevronDown style={{ width: '16px', height: '16px', transform: 'rotate(-90deg)' }} />
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Today's Classes */}
                  <div className="uxer-table-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar style={{ width: '20px', height: '20px', color: 'var(--text-secondary)' }} /> Today's Classes
                      </h3>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Timetable <ChevronDown style={{ width: '16px', height: '16px', transform: 'rotate(-90deg)' }} />
                      </div>
                    </div>

                    {filteredSchedules.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {filteredSchedules.map((schedule) => (
                          <div key={schedule.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h4 style={{ fontWeight: 'bold', color: 'var(--text-main)', margin: 0, fontSize: '16px' }}>{schedule.courseName}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                              <User style={{ width: '16px', height: '16px' }} /> Inst: {schedule.staffName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                              <Clock style={{ width: '16px', height: '16px' }} /> {schedule.classTiming}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center' }}>
                        <Calendar style={{ width: '48px', height: '48px', color: 'var(--text-secondary)' }} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '4px' }}>No classes scheduled for today.</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Enjoy your day! 🌟</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Profile Details */}
                  <div className="uxer-table-card" style={{ padding: '24px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                      <UserCircle style={{ width: '20px', height: '20px', color: 'var(--text-secondary)' }} /> Profile Details
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <Mail style={{ width: '20px', height: '20px', marginTop: '2px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '2px' }}>Email Address</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'coderkarthik01@gmail.com'}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <Building style={{ width: '20px', height: '20px', marginTop: '2px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '2px' }}>Organization</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.organizationName || 'AASC'}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <Key style={{ width: '20px', height: '20px', marginTop: '2px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '2px' }}>Enrollment No.</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.enrollmentNo || '154'}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', paddingTop: '16px' }}>
                        <User style={{ width: '20px', height: '20px', marginTop: '2px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '2px' }}>Date of Birth & Gender</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.dob || '2006-07-20'} | {user?.gender || 'Male'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        {activeTab === 'fee' && (
          <div className="rounded-2xl p-6 border shadow-sm w-full" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="m-0 mb-6 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <CreditCard className="w-5 h-5 text-indigo-500" /> Fee Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center text-center">
                <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Fee</div>
                <div className="text-2xl font-bold text-slate-800">Rs. {totalCourseFee.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex flex-col justify-center text-center">
                <div className="text-sm text-teal-600 uppercase tracking-wider font-semibold mb-1">Paid Fee</div>
                <div className="text-2xl font-bold text-teal-800">Rs. {dynamicallyPaidFee.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col justify-center text-center">
                <div className="text-sm text-red-600 uppercase tracking-wider font-semibold mb-1">Pending Fee</div>
                <div className="text-2xl font-bold text-red-800">Rs. {pendingFee.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Paid Bills History */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-500" />
                My Digital Bills
              </h3>
              
              {(() => {
                const legacyAmount = user?.paidFee || user?.paidAmount || 0;
                
                let displayLedger = receipts.map(bill => ({
                  receiptId: bill.billNumber || bill.id,
                  date: new Date(bill.paymentDate || bill.timestamp?.seconds * 1000).toLocaleDateString(),
                  time: new Date(bill.paymentDate || bill.timestamp?.seconds * 1000).toLocaleTimeString(),
                  amountPaid: bill.totalAmount,
                  status: 'Paid',
                  description: bill.remarks || 'Fee Payment'
                }));
                
                if (displayLedger.length === 0 && legacyAmount > 0) {
                  displayLedger = [{
                    receiptId: "LEGACY-REC",
                    date: user?.dateOfJoining || "Initial",
                    time: "",
                    amountPaid: legacyAmount,
                    status: "Initial Payment",
                    description: "Prior payment records"
                  }];
                }
                
                if (displayLedger.length === 0) {
                  return (
                    <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 italic">
                      <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-lg">No fee transactions recorded.</p>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-4">
                    {displayLedger.map((bill, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-slate-800 text-lg">{bill.receiptId || bill.billId}</span>
                            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded">{bill.status}: ₹{bill.amountPaid || bill.amount}</span>
                            <span className="text-xs text-slate-500">{bill.date} {bill.time || ''}</span>
                          </div>
                          <div className="text-sm text-slate-600 font-medium">{bill.description || "Fee Payment"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="rounded-2xl p-6 border shadow-sm w-full" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="m-0 mb-6 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <FolderOpen className="w-5 h-5 text-indigo-500" /> Document Center
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="bg-slate-50 border border-slate-200 rounded-xl" style={{ padding: '20px', textAlign: 'center' }}>
                <h3 className="text-slate-800 font-semibold mb-4 text-lg">Profile Photo Upload</h3>
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${user?.documents?.profilePhotoUrl ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {user?.documents?.profilePhotoUrl ? 'Uploaded' : 'Pending'}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="file" id="profile-upload" style={{ display: 'none' }} onChange={(e) => { 
                    if(e.target.files && e.target.files.length > 0) {
                      const confirmChange = window.confirm("Are you sure you want to change your profile picture?");
                      if (!confirmChange) {
                        e.target.value = null;
                        return;
                      }
                      handleDocumentUpload(e.target.files[0], 'profilePhotoUrl');
                    }
                  }} accept="image/*" />
                  <label htmlFor="profile-upload" className="block w-full py-3 px-6 transition-colors rounded-lg font-bold text-center shadow-sm" style={{ backgroundColor: 'var(--accent-royal-purple)', color: '#ffffff', border: '2px solid var(--accent-royal-purple)', opacity: uploadingDoc === 'profilePhotoUrl' ? 0.9 : 1, cursor: 'pointer' }}>
                    {uploadingDoc === 'profilePhotoUrl' ? 'Uploading...' : (user?.documents?.profilePhotoUrl ? 'Update Profile Photo' : 'Upload Profile Photo')}
                  </label>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl" style={{ padding: '20px', textAlign: 'center' }}>
                <h3 className="text-slate-800 font-semibold mb-4 text-lg">Aadhaar / ID Card Upload</h3>
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${user?.documents?.idProofUrl ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {user?.documents?.idProofUrl ? 'Uploaded' : 'Pending'}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="file" id="id-upload" style={{ display: 'none' }} onChange={(e) => { 
                    if(e.target.files && e.target.files.length > 0) {
                      const confirmChange = window.confirm("Are you sure you want to change your Aadhaar/ID document?");
                      if (!confirmChange) {
                        e.target.value = null;
                        return;
                      }
                      handleDocumentUpload(e.target.files[0], 'idProofUrl');
                    }
                  }} accept="image/*,application/pdf" />
                  <label htmlFor="id-upload" className="block w-full py-3 px-6 transition-colors rounded-lg font-bold text-center shadow-sm" style={{ backgroundColor: 'var(--accent-royal-purple)', color: '#ffffff', border: '2px solid var(--accent-royal-purple)', opacity: uploadingDoc === 'idProofUrl' ? 0.9 : 1, cursor: 'pointer' }}>
                    {uploadingDoc === 'idProofUrl' ? 'Uploading...' : (user?.documents?.idProofUrl ? 'Update Aadhaar/ID' : 'Upload Aadhaar/ID')}
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'course' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Course Materials</h2>
            {assignment ? (
              <>
                <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-xl">
                  <h3 className="text-teal-900 font-bold text-xl mb-1 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                    {assignment.courseName}
                  </h3>
                  <div className="flex items-center gap-2 text-teal-700 font-medium">
                    <User className="w-4 h-4" /> Instructor: {assignment.staffName}
                  </div>
                </div>

                {(courseContentUrl || filteredContentObjects.length > 0) ? (
                  <div className="flex flex-col gap-4">
                    {courseContentUrl && (
                      <button 
                        onClick={() => window.open(courseContentUrl, '_blank')}
                        className="flex items-center justify-between px-6 py-4 text-white bg-teal-600 hover:bg-teal-700 transition-colors border-none rounded-lg font-bold cursor-pointer shadow-sm w-full max-w-[300px]"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ExternalLink style={{ width: '16px', height: '16px' }} /> Open External Drive Link</span>
                        <ExternalLink style={{ width: '16px', height: '16px' }} />
                      </button>
                    )}
                    
                    {filteredContentObjects.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Attached Files</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {filteredContentObjects.map((fileObj, idx) => (
                            <button
                              key={idx}
                              onClick={() => window.open(fileObj.url, '_blank')}
                              className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg font-bold cursor-pointer shadow-sm w-full text-left transition-colors hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{fileObj.name}</span>
                              </div>
                              <Download className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 text-center p-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 italic">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-lg">No content materials provided yet.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-600 font-medium text-lg mb-1">No course assigned yet</h3>
                <p className="text-slate-400">Your admin will assign you to a specific batch and schedule soon.</p>
              </div>
            )}

            <div className="rounded-2xl p-6 border shadow-sm flex flex-col justify-center min-h-[200px] mt-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <h3 className="m-0 mb-4 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
                <Users className="w-5 h-5 text-indigo-500" /> My Course Roster & Faculty Details
              </h3>
              {courseRoster.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courseRoster.map((item, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <h4 className="text-slate-800 font-bold text-lg mb-2">{item.module}</h4>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Faculty Assigned</p>
                      <p className="text-indigo-600 font-medium flex items-center gap-2">
                        <User className="w-4 h-4" /> {item.facultyName}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500">
                  <p>No roster details found for your enrolled course.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="rounded-2xl p-6 border shadow-sm w-full" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="m-0 mb-6 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <Settings className="w-5 h-5 text-indigo-500" /> Account Settings
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = {
                name: formData.get('name'),
                gender: formData.get('gender'),
                dob: formData.get('dob')
              };
              try {
                await updateUserDoc(user.id, data);
                const updatedUser = { ...user, ...data };
                setUser(updatedUser);
                localStorage.setItem('lms_user', JSON.stringify(updatedUser));
                message.success('Settings updated successfully!');
              } catch (error) {
                message.error('Failed to update settings.');
              }
            }} className="flex flex-col gap-4 max-w-md">
              <div>
                <label className="settings-form-label">Full Name</label>
                <input type="text" name="name" defaultValue={user?.name} required  className="saas-v3-form-input"/>
              </div>
              <div>
                <label className="settings-form-label">Gender</label>
                <select name="gender" defaultValue={user?.gender} className="saas-v3-form-select">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="settings-form-label">Date of Birth</label>
                <input type="date" name="dob" defaultValue={user?.dob} required  className="saas-v3-form-input"/>
              </div>
              <div className="mt-4">
                <button type="submit" className="settings-save-btn">Save Changes</button>
              </div>
            </form>
          </div>
        )}
        </div>
        
        {/* Digital Bill Modal */}
        {isBillModalVisible && selectedBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="saas-v3-modal-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Elegant Bill Header */}
              <div style={{ padding: '24px', backgroundColor: 'var(--blue-50, #eff6ff)', borderBottom: '2px dashed var(--border-color, #e2e8f0)', textAlign: 'center', position: 'relative' }}>
                <button 
                  onClick={() => setIsBillModalVisible(false)}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X className="w-6 h-6 text-slate-400 hover:text-slate-700" />
                </button>
                
                {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '48px', objectFit: 'contain', margin: '0 auto 12px' }} />}
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 'bold', color: 'var(--indigo-900, #312e81)' }}>{user?.organizationName}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>Official Fee Receipt</p>
              </div>

              {/* Bill Details */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Receipt Number</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: 'monospace' }}>{selectedBill.billNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Date</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{selectedBill.timestamp ? new Date(selectedBill.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Student Name</span>
                    <span style={{ fontWeight: 'bold' }}>{user?.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Enrollment No.</span>
                    <span style={{ fontWeight: 'bold' }}>{user?.enrollmentNo || user?.id.substring(0, 8)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Course</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedBill.course || user?.course}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Received By (Cashier)</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedBill.cashier || 'Admin'}</span>
                  </div>
                </div>

                {/* Payment Split */}
                <div style={{ backgroundColor: 'var(--bg-hover, #f8fafc)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary, #64748b)' }}>Payment Breakdown</h4>
                  {selectedBill.paymentSplit?.cash > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Cash</span><span>₹{selectedBill.paymentSplit.cash}</span>
                    </div>
                  )}
                  {selectedBill.paymentSplit?.upi > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>UPI / GPay</span><span>₹{selectedBill.paymentSplit.upi}</span>
                    </div>
                  )}
                  {selectedBill.paymentSplit?.card > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Card</span><span>₹{selectedBill.paymentSplit.card}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)', fontWeight: 'bold', fontSize: '18px', color: 'var(--green-600, #16a34a)' }}>
                    <span>Total Amount Paid</span><span>₹{selectedBill.totalAmount}</span>
                  </div>
                </div>

                {selectedBill.remarks && (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', fontStyle: 'italic', textAlign: 'center' }}>
                    "{selectedBill.remarks}"
                  </div>
                )}
              </div>

              {/* Print Action */}
              <div style={{ padding: '16px 24px', backgroundColor: 'var(--bg-hover, #f8fafc)', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => handleDownloadReceipt(selectedBill)}
                  style={{ flex: 1, padding: '12px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default StudentDashboard;
