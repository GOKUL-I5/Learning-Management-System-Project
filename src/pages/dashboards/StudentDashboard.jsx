import React, { useState, useEffect } from 'react';
import { logoutUser, uploadProfilePhoto, getStudentAssignments, getOrganizationCourses, subscribeToStudentAssignments, getOrganizationDetails, updateUserDoc, subscribeToFeeTransactions, updateStudentStatus, listenToOrganizationStatus, getCourseAssignments, logTransaction, subscribeToStudentSchedules, subscribeToUserProfile, subscribeToStudentCourseMaterials, subscribeToAttendanceHistoryByOrg, markMaterialAsViewed } from '../../firebase/services';
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
  const [courseMaterials, setCourseMaterials] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isScheduleHistoryModalVisible, setIsScheduleHistoryModalVisible] = useState(false);

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
  const [previewMaterialUrl, setPreviewMaterialUrl] = useState(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const profileUploadRef = React.useRef(null);

  const totalCourseFee = Number(user?.totalCourseFee || user?.courseFee || 28000);
  const trueTotalPaid = receipts.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const dynamicallyPaidFee = Number(trueTotalPaid > 0 ? trueTotalPaid : (user?.paidFee || user?.paidAmount || 0));
  const pendingFee = Math.max(0, totalCourseFee - dynamicallyPaidFee);

  const isClassTodayAndActive = (schedule) => {
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek) && !schedule.daysOfWeek.includes(today)) return false;

      if (!schedule.classTiming) return true;
      
      const parts = schedule.classTiming.split('-');
      if (parts.length < 2) return true;

      const endStr = parts[1].trim();
      const match = endStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return true;
      let [ , h, m, ampm ] = match;
      h = parseInt(h, 10);
      m = parseInt(m, 10);
      if (ampm) {
         if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
         if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      }
      const now = new Date();
      const endTime = new Date();
      endTime.setHours(h, m, 0, 0);

      return now <= endTime;
    } catch(e) {
      return true;
    }
  };

  const filteredSchedules = mySchedules.filter(s => {
    const matchesSearch = s.courseName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.staffName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && isClassTodayAndActive(s);
  });
  const filteredContentObjects = contentObjects.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCourseMaterials = courseMaterials.filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase()) || m.fileName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredReceipts = receipts.filter(r => r.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || String(r.totalAmount).includes(searchQuery));

  const handlePayment = async () => {
    // Razorpay checkout disabled for offline payment mode
    message.info("Online payments are currently disabled. Please contact the administration.");
  };

  useEffect(() => {
    let unsubscribeFees = null;
    let unsubscribeSchedules = null;
    let unsubscribeUser = null;
    let unsubscribeCourseMaterials = null;

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
      unsubscribeCourseMaterials = subscribeToStudentCourseMaterials(user.id, (data) => {
        setCourseMaterials(data);
      });
    }
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeFees) unsubscribeFees();
      if (unsubscribeSchedules) unsubscribeSchedules();
      if (unsubscribeCourseMaterials) unsubscribeCourseMaterials();
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

      const unsubscribeAssignments = subscribeToStudentAssignments(user.organizationId, user.id, (assignments) => {
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

      const unsubscribeAttendance = subscribeToAttendanceHistoryByOrg(user.organizationId, (history) => {
        setAttendanceHistory(history);
      });

      // Cleanup subscription on unmount
      return () => {
        unsubscribeAssignments();
        unsubscribeAttendance();
      };
    }).catch(console.error);
  }, [user?.organizationId, user?.id]);

  const handleViewMaterial = async (fileObj, mode) => {
    try {
      if (user?.id && user?.name) {
        await markMaterialAsViewed(fileObj.id, { id: user.id, name: user.name });
      }
    } catch (err) {
      console.error("Error marking material as viewed:", err);
    }
    
    if (mode === 'preview') {
      setPreviewMaterialUrl(fileObj);
      setIsPreviewModalVisible(true);
    } else {
      window.open(fileObj.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

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
        let updateData = {};
        if (docType === 'studentPhotoUrl' || docType === 'identityDocUrl') {
          updateData = { [docType]: data.secure_url };
        } else {
          const currentDocs = user.documents || {};
          updateData = { documents: { ...currentDocs, [docType]: data.secure_url } };
        }
        
        await updateUserDoc(user.id, updateData);
        
        if (docType === 'idProofUrl' || docType === 'identityDocUrl') {
          await updateStudentStatus(user.id, user.statusHistory || [], user.currentStatus || 'Active', '[Aadhaar Redacted] Document Uploaded');
          await logTransaction('UPLOAD_ID_DOCUMENT', {
             token: '[Aadhaar Redacted]',
             studentId: user.id,
             studentName: user.name
          });
        }

        const updatedUser = { ...user, ...updateData };
        setUser(updatedUser);
        localStorage.setItem('lms_user', JSON.stringify(updatedUser));
        message.success(`${docType === 'studentPhotoUrl' ? 'Passport Photo' : 'ID Document'} uploaded successfully!`);
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

  const handleDismissNotification = async (notificationId) => {
    try {
      const currentNotifications = user.notifications || [];
      const updatedNotifications = currentNotifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      await updateUserDoc(user.id, { notifications: updatedNotifications });
    } catch (error) {
      console.error("Failed to dismiss notification", error);
    }
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
        <div className="uxer-sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
          {logoUrl ? <img src={logoUrl} alt="Org Logo" style={{ maxHeight: '32px', maxWidth: '32px', objectFit: 'contain' }} /> : <div className="logo-icon"></div>}
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#111111', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.organizationName || 'Student Portal'}</span>
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
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111', margin: 0 }}>Student Portal</h1>
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
                      <div className="uxer-stat-value">
                        {(() => {
                          const relevantClasses = attendanceHistory.filter(h => h.courseName === user?.course);
                          if (relevantClasses.length === 0) return '100%';
                          let attended = 0;
                          relevantClasses.forEach(c => {
                            const studentRecord = c.studentAttendance?.find(s => s.studentId === user?.id);
                            if (studentRecord && studentRecord.status === 'P') {
                              attended++;
                            }
                          });
                          const percentage = Math.round((attended / relevantClasses.length) * 100);
                          return `${percentage}%`;
                        })()}
                      </div>
                      <div className="uxer-stat-badge">
                        <span className="uxer-stat-badge-text" style={{ textAlign: 'left', marginLeft: 0 }}>Current Course</span>
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
                      <div onClick={() => setIsScheduleHistoryModalVisible(true)} style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Schedule / History <ChevronDown style={{ width: '16px', height: '16px', transform: 'rotate(-90deg)' }} />
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

                {(courseContentUrl || filteredCourseMaterials.length > 0) ? (
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
                    
                    {filteredCourseMaterials.length > 0 && (
                      <div style={{ marginTop: '24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                          Attached Materials
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                          {filteredCourseMaterials.map((fileObj, idx) => {
                            const isPdf = fileObj.fileUrl?.toLowerCase().includes('.pdf');
                            const isVideo = fileObj.fileUrl?.toLowerCase().includes('.mp4') || fileObj.fileUrl?.toLowerCase().includes('.webm');
                            return (
                              <div
                                key={fileObj.id || idx}
                                style={{
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  border: '1px solid rgba(255, 255, 255, 0.18)',
                                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
                                  borderRadius: '16px',
                                  padding: '20px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '16px',
                                  transition: 'transform 0.2s, box-shadow 0.2s',
                                  backgroundColor: 'var(--card-bg)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-4px)';
                                  e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(0, 0, 0, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.05)';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                  <div style={{ padding: '12px', borderRadius: '12px', background: isPdf ? 'rgba(239, 68, 68, 0.1)' : isVideo ? 'rgba(59, 130, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)', color: isPdf ? '#ef4444' : isVideo ? '#3b82f6' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {isVideo ? <Video size={24} /> : <FileText size={24} />}
                                  </div>
                                  <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {fileObj.title || fileObj.fileName}
                                    </h4>
                                    {fileObj.description && (
                                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {fileObj.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Uploaded By</span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{fileObj.staffName || 'Faculty'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Date</span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{parseFirestoreDate(fileObj.timestamp)}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                  <button
                                    onClick={() => handleViewMaterial(fileObj, 'preview')}
                                    style={{
                                      flex: 1,
                                      padding: '10px',
                                      borderRadius: '8px',
                                      border: '1px solid var(--border-color)',
                                      background: 'var(--card-bg)',
                                      color: 'var(--text-main)',
                                      fontWeight: 'bold',
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; }}
                                  >
                                    👁️ View Document
                                  </button>
                                  <button
                                    onClick={() => handleViewMaterial(fileObj, 'download')}
                                    style={{
                                      flex: 1,
                                      padding: '10px',
                                      borderRadius: '8px',
                                      border: 'none',
                                      background: 'var(--uxer-primary)',
                                      color: '#fff',
                                      fontWeight: 'bold',
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                  >
                                    <Download size={16} /> Download
                                  </button>
                                </div>
                              </div>
                            )
                          })}
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
                  rawBill: bill,
                  receiptId: bill.billCode || bill.billNumber || bill.id,
                  date: bill.date || (bill.paymentDate ? new Date(bill.paymentDate).toLocaleDateString() : (bill.timestamp ? new Date(bill.timestamp.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString())),
                  time: bill.paymentDate ? new Date(bill.paymentDate).toLocaleTimeString() : (bill.timestamp ? new Date(bill.timestamp.seconds * 1000).toLocaleTimeString() : ''),
                  amountPaid: bill.amountPaid || bill.amount || bill.totalAmount || 0,
                  paymentMode: bill.paymentMode === 'Split' 
                    ? `Split (Cash: ₹${bill.cashAmount || bill.paymentSplit?.cash || 0} | UPI: ₹${bill.gpayAmount || bill.paymentSplit?.upi || 0})` 
                    : (bill.paymentMode || 'Online / Cash'),
                  description: bill.remarks || 'Fee Payment'
                }));
                
                if (displayLedger.length === 0 && legacyAmount > 0) {
                  displayLedger = [{
                    rawBill: { billCode: "LEGACY-REC", amountPaid: legacyAmount, paymentMode: "Legacy", date: user?.dateOfJoining },
                    receiptId: "LEGACY-REC",
                    date: user?.dateOfJoining || "Initial",
                    time: "",
                    amountPaid: legacyAmount,
                    paymentMode: "Initial Payment",
                    description: "Prior payment records"
                  }];
                }
                
                if (displayLedger.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-hover)', borderRadius: '12px', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)' }}>
                      <Receipt style={{ width: '48px', height: '48px', color: 'var(--border-color)', margin: '0 auto 12px auto' }} />
                      <p style={{ fontSize: '16px', margin: 0 }}>No fee transactions recorded.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {displayLedger.map((bill, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-main)' }}>{bill.receiptId}</span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px' }}>Paid: ₹{bill.amountPaid}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar style={{ width: '14px', height: '14px' }}/> {bill.date} {bill.time}
                          </div>
                        </div>
                        <button 
                          onClick={() => { setSelectedBill(bill.rawBill); setIsBillModalVisible(true); }}
                          style={{ padding: '10px 20px', backgroundColor: 'var(--indigo-50, #eef2ff)', color: 'var(--indigo-600, #4f46e5)', border: '1px solid var(--indigo-100, #e0e7ff)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e0e7ff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eef2ff'; }}
                        >
                          <Receipt size={16} /> 👁️ View Digital Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', color: 'var(--text-main)' }}>
              <FolderOpen size={24} style={{ color: '#2563eb' }} /> Document Center
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              {/* Card 1: Passport Photo */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>Student Passport Photo</h3>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0' }}>Upload a clear photo for your identity and portal profile.</p>
                
                {user?.studentPhotoUrl ? (
                  <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <img src={user.studentPhotoUrl} alt="Passport Photo" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb', padding: '2px', backgroundColor: '#fff' }} />
                    <span style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      Uploaded ✓
                    </span>
                  </div>
                ) : (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <User size={40} color="#94a3b8" />
                    </div>
                    <span style={{ display: 'inline-block', marginTop: '12px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#b45309' }}>
                      Pending Upload
                    </span>
                  </div>
                )}
                
                <div style={{ width: '100%', marginTop: 'auto' }}>
                  <input type="file" id="photo-upload" style={{ display: 'none' }} onChange={(e) => { 
                    if(e.target.files && e.target.files.length > 0) handleDocumentUpload(e.target.files[0], 'studentPhotoUrl');
                  }} accept="image/*" />
                  <label htmlFor="photo-upload" style={{ display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s', opacity: uploadingDoc === 'studentPhotoUrl' ? 0.7 : 1 }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                    {uploadingDoc === 'studentPhotoUrl' ? 'Uploading...' : (user?.studentPhotoUrl ? 'Update Photo' : 'Upload Photo')}
                  </label>
                </div>
              </div>

              {/* Card 2: Identity Document */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>Identity Document</h3>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0' }}>Upload your ID Card or Aadhaar document for verification.</p>
                
                {(user?.identityDocUrl || user?.documents?.idProofUrl) ? (
                  <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={32} color="#2563eb" />
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534' }}>
                      Uploaded & Saved ✓
                    </span>
                  </div>
                ) : (
                  <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={32} color="#94a3b8" />
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#b45309' }}>
                      Pending Upload
                    </span>
                  </div>
                )}
                
                <div style={{ width: '100%', marginTop: 'auto' }}>
                  <input type="file" id="id-upload" style={{ display: 'none' }} onChange={(e) => { 
                    if(e.target.files && e.target.files.length > 0) handleDocumentUpload(e.target.files[0], 'identityDocUrl');
                  }} accept="image/*,application/pdf" />
                  <label htmlFor="id-upload" style={{ display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s', opacity: uploadingDoc === 'identityDocUrl' ? 0.7 : 1 }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                    {uploadingDoc === 'identityDocUrl' ? 'Uploading...' : ((user?.identityDocUrl || user?.documents?.idProofUrl) ? 'Update ID Document' : 'Upload ID Document')}
                  </label>
                </div>
              </div>

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

        {/* Digital Bill Modal */}
        {isBillModalVisible && selectedBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div id="receipt-print-area" style={{ background: '#fff', border: '1px solid #ddd', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
              <button 
                onClick={() => setIsBillModalVisible(false)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', zIndex: 10 }}
                className="no-print"
              >
                <X size={24} />
              </button>
              
              <div style={{ textAlign: 'center', borderBottom: '2px solid #eee', paddingBottom: '24px', marginBottom: '24px', marginTop: '16px' }}>
                {logoUrl && <img src={logoUrl} alt="Organization Logo" style={{ maxHeight: '60px', width: 'auto', objectFit: 'contain', marginBottom: '16px' }} />}
                <h1 style={{ margin: 0, color: 'var(--uxer-primary)', fontSize: '24px', fontWeight: 'bold' }}>{user?.organizationName || 'Organization'}</h1>
                <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Fee Payment Receipt</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: '600', color: '#64748b' }}>Receipt Number:</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedBill.billCode || selectedBill.billNumber || 'N/A'}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: '600', color: '#64748b' }}>Date:</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedBill.date || (selectedBill.paymentDate ? new Date(selectedBill.paymentDate).toLocaleDateString() : (selectedBill.timestamp ? new Date(selectedBill.timestamp.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()))}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: '600', color: '#64748b' }}>Student Name:</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{user?.name || 'N/A'}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: '600', color: '#64748b' }}>Course:</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{user?.course || 'N/A'}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: '600', color: '#64748b' }}>Payment Mode:</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedBill.paymentMode === 'Split' ? `Split (Cash: ₹${selectedBill.cashAmount || selectedBill.paymentSplit?.cash || 0} | UPI: ₹${selectedBill.gpayAmount || selectedBill.paymentSplit?.upi || 0})` : (selectedBill.paymentMode || 'Online / Cash')}</span>
                </div>
              </div>
              
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                <span>Total Amount Paid:</span>
                <span style={{ color: 'var(--green-600)' }}>₹{selectedBill.amountPaid || selectedBill.amount || selectedBill.totalAmount || 0}</span>
              </div>

              {selectedBill.remarks && selectedBill.remarks !== 'Fee Payment' && (
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  Note: {selectedBill.remarks}
                </div>
              )}
              
              <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                This is a computer-generated receipt.
              </div>

              <div className="no-print" style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={() => {
                    const originalTitle = document.title;
                    document.title = `Receipt_${selectedBill.billCode || selectedBill.id || 'N_A'}`;
                    window.print();
                    document.title = originalTitle;
                  }}
                  style={{ width: '100%', padding: '14px 20px', backgroundColor: 'var(--uxer-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Download size={20} /> Download PDF Receipt
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Real-time Fee Reminder Notification Pop-Up */}
        {(() => {
          const unreadReminder = (user?.notifications || []).find(n => !n.read && n.type === 'FEE_REMINDER');
          if (!unreadReminder) return null;
          
          return (
            <div className="student-notification-popup">
              <div className="popup-icon">
                <Bell size={24} />
              </div>
              <div className="popup-content">
                <h4>{unreadReminder.title}</h4>
                <p>{unreadReminder.message}</p>
                <div className="popup-meta">
                  <span>{unreadReminder.date} at {unreadReminder.time}</span>
                </div>
              </div>
              <button 
                className="popup-close" 
                onClick={() => handleDismissNotification(unreadReminder.id)}
                title="Dismiss"
              >
                <X size={20} />
              </button>
            </div>
          );
        })()}

        {/* View Schedule History Modal */}
        {isScheduleHistoryModalVisible && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="saas-v3-modal-card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--indigo-900)' }}>Class & Attendance History</h2>
                <button onClick={() => setIsScheduleHistoryModalVisible(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <X className="w-6 h-6 text-slate-400 hover:text-slate-700" />
                </button>
              </div>
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#f1f5f9' }}>
                {(() => {
                  const filteredHistory = attendanceHistory.filter(h => {
                    const matchCourseName = h.courseName && user?.course && h.courseName.toLowerCase() === user.course.toLowerCase();
                    const matchCourseId = h.courseId && user?.courseId && String(h.courseId) === String(user.courseId);
                    const matchStudentInArray = h.studentAttendance && h.studentAttendance.some(s => String(s.studentId) === String(user?.id) || (s.enrollmentNo && String(s.enrollmentNo) === String(user?.enrollmentNo)));
                    
                    return matchCourseName || matchCourseId || matchStudentInArray;
                  }).sort((a, b) => new Date(b.date) - new Date(a.date));

                  if (filteredHistory.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No class history found for your account.
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#e2e8f0', color: '#334155' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Date & Time</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Session Topic / Subject</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((record, idx) => {
                          const studentRec = record.studentAttendance?.find(s => String(s.studentId) === String(user?.id) || (s.enrollmentNo && String(s.enrollmentNo) === String(user?.enrollmentNo)));
                          const isPresent = studentRec && (studentRec.status === 'P' || studentRec.status === 'Present');
                          const isAbsent = studentRec && (studentRec.status === 'A' || studentRec.status === 'Absent');
                          
                          let statusBadge = (
                            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef08a', color: '#854d0e', display: 'inline-block' }}>
                              Conducted
                            </span>
                          );
                          
                          if (isPresent) {
                            statusBadge = (
                              <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                Present ✓
                              </span>
                            );
                          } else if (isAbsent) {
                            statusBadge = (
                              <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#991b1b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                Absent ✗
                              </span>
                            );
                          }

                          return (
                            <tr key={record.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '16px', fontSize: '14px', color: '#334155', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 'bold' }}>{new Date(record.date).toLocaleDateString()}</div>
                                {record.time && <div style={{ fontSize: '12px', color: '#64748b' }}>{record.time}</div>}
                              </td>
                              <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a' }}>
                                {record.sessionTopics || record.subject || 'No topics listed'}
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                {statusBadge}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        </div>

        {isPreviewModalVisible && previewMaterialUrl && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="custom-modal-viewport-card" style={{ backgroundColor: '#fff', borderRadius: '12px', width: '90%', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--uxer-primary)', color: '#fff' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {previewMaterialUrl.title || previewMaterialUrl.fileName || 'Document Preview'}
                    </h2>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      {previewMaterialUrl.fileUrl?.split('.').pop() || 'DOCUMENT'}
                    </span>
                  </div>
                </div>
                <button onClick={() => { setIsPreviewModalVisible(false); setPreviewMaterialUrl(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <X size={24}/>
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, backgroundColor: '#e2e8f0', position: 'relative' }}>
                {(() => {
                  const url = previewMaterialUrl.fileUrl;
                  if (!url) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>Invalid document link</div>;
                  
                  const ext = url.split('.').pop().toLowerCase();
                  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
                  const isNative = isImage || ext === 'pdf';
                  const viewerUrl = isNative ? url : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

                  if (isImage) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '24px', boxSizing: 'border-box' }}>
                        <img src={url} alt="Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      </div>
                    );
                  }

                  return (
                    <iframe src={viewerUrl} width="100%" height="100%" style={{ border: 'none', display: 'block' }} title="Document Preview" />
                  );
                })()}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Uploaded by: {previewMaterialUrl.staffName || 'Faculty'}
                </span>
                <button 
                  onClick={() => window.open(previewMaterialUrl.fileUrl, '_blank', 'noopener,noreferrer')}
                  style={{ padding: '10px 24px', backgroundColor: 'var(--uxer-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'opacity 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  <Download size={18} /> Download Original File
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
