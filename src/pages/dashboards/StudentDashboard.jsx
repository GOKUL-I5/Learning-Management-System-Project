import React, { useState, useEffect } from 'react';
import { logoutUser, uploadProfilePhoto, getStudentAssignments, getOrganizationCourses, subscribeToStudentAssignments, getOrganizationDetails, updateUserDoc, subscribeToFeeTransactions, updateStudentStatus, listenToOrganizationStatus, getCourseAssignments, logTransaction, subscribeToStudentSchedules } from '../../firebase/services';
import { LogOut, BookOpen, User, Users, Building, Mail, Key, Calendar, Clock, ExternalLink, FileText, Download, Video, Pencil, Check, X, CreditCard, DollarSign, Receipt, FolderOpen, Upload as UploadIcon, Settings } from 'lucide-react';
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

  const handlePayment = async () => {
    // Razorpay checkout disabled for offline payment mode
    message.info("Online payments are currently disabled. Please contact the administration.");
  };

  useEffect(() => {
    let unsubscribeFees = null;
    let unsubscribeSchedules = null;
    if (user?.id) {
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
Date: ${receipt.timestamp ? new Date(receipt.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
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
    <div className="main-dashboard-layout-wrapper" style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text-main-dark)' }}>
        {/* Sidebar Navigation */}
        <aside className="flex flex-col h-full overflow-y-auto w-[260px] shrink-0" style={{ backgroundColor: 'var(--card-bg-clean)' }}>
        <div className="flex flex-col items-center justify-center p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-center w-24 h-24 rounded-full border-2 overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Org Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <BookOpen className="w-12 h-12 text-blue-600" />
            )}
          </div>
          <h4 className="mt-4 text-sm font-bold text-center" style={{ color: 'var(--text-main)' }}>Student Portal</h4>
        </div>

        <nav className="flex-1 py-4 px-4">
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            <li 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === 'dashboard' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === 'dashboard' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-secondary)' }}
            ><User className="w-5 h-5" /> Dashboard</li>
            <li 
              onClick={() => setActiveTab('course')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === 'course' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === 'course' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'course' ? '#ffffff' : 'var(--text-secondary)' }}
            ><FileText className="w-5 h-5" /> View Course</li>
            <li 
              onClick={() => setActiveTab('fee')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === 'fee' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === 'fee' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'fee' ? '#ffffff' : 'var(--text-secondary)' }}
            ><CreditCard className="w-5 h-5" /> Fee Payment</li>
            <li 
              onClick={() => setActiveTab('documents')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === 'documents' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === 'documents' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'documents' ? '#ffffff' : 'var(--text-secondary)' }}
            ><FolderOpen className="w-5 h-5" /> Document Center</li>
            <li 
              onClick={() => setActiveTab('settings')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === 'settings' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === 'settings' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'settings' ? '#ffffff' : 'var(--text-secondary)' }}
            ><Settings className="w-5 h-5" /> Settings</li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-col h-full flex-1 main-content-display-pane">
        {/* Header Banner */}
        <header className="sticky top-0 z-10 flex justify-between items-center px-8 py-6" style={{ backgroundColor: 'var(--panel-solid-white)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <h1 className="m-0 text-lg font-bold" style={{ color: 'var(--text-primary-crisp)' }}>Student Portal</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col items-end gap-1">
              <div className="text-sm font-bold" style={{ color: 'var(--text-primary-crisp)' }}>{user?.name || 'Student'}</div>
              <div className="text-xs font-black" style={{ color: '#111' }}>
                Organization: <span style={{ color: '#333', fontWeight: 'bold' }}>{user?.organizationName}</span>
              </div>
            </div>
            <button onClick={logoutUser} className="top-logout-btn flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-6 w-full max-w-6xl mx-auto box-border">
          
          {activeTab === 'dashboard' && (
            <div className="smart-notification-widget mb-6" style={{ gridColumn: '1 / -1' }}>
              <h3 className="smart-notification-title">
                <Calendar className="w-5 h-5 text-indigo-500" /> Smart Notifications & Reminders
              </h3>
              <div className="smart-notification-list">
                {isBirthday && (
                  <div className="smart-notification-item" style={{ backgroundColor: '#fdf2f8', borderLeft: '4px solid #ec4899', color: '#831843' }}>
                    <strong>🎉 Happy Birthday, {user?.name}!</strong> Have a wonderful day ahead!
                  </div>
                )}
                {((user?.courseFee || 28000) - (user?.paidFee || 0)) > 0 && (
                  <div className="smart-notification-item urgent">
                    <strong>💰 Fee Reminder:</strong> You have an outstanding balance of ₹{((user?.courseFee || 28000) - (user?.paidFee || 0))}. Please complete your payment.
                  </div>
                )}
                {assignment && (
                  <div className="smart-notification-item warning">
                    <strong>📚 Course Alert:</strong> You have an active assignment/module for {assignment.courseName}. Please check your Course Material.
                  </div>
                )}
                <div className="smart-notification-item info">
                  <strong>📝 Attendance:</strong> Your recent attendance has been logged successfully. Maintain above 85% to appear for exams.
                </div>
              </div>
            </div>
          )}

        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-3xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="flex flex-col sm:flex-row items-center justify-start text-left w-full gap-6">
              <label htmlFor="header-profile-upload" style={{ cursor: 'pointer', transition: 'opacity 0.2s', display: 'inline-block' }} onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'} onMouseOut={(e) => e.currentTarget.style.opacity = '1'}>
                {user?.documents?.profilePhotoUrl || user?.photoUrl ? (
                  <img src={user?.documents?.profilePhotoUrl || user?.photoUrl} alt="Profile" onClick={() => document.getElementById('header-profile-upload').click()} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer' }} />
                ) : (
                  <div onClick={() => document.getElementById('header-profile-upload').click()} style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ffffff', color: 'var(--green-600, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer' }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </label>
              <input 
                type="file" 
                id="header-profile-upload" 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={(e) => {
                  if(e.target.files && e.target.files.length > 0) {
                    const confirmChange = window.confirm("Are you sure you want to change your profile picture?");
                    if (!confirmChange) {
                      e.target.value = null;
                      return;
                    }
                    handleDocumentUpload(e.target.files[0], 'profilePhotoUrl');
                  }
                }} 
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', verticalAlign: 'middle', marginBottom: '0.25rem' }}>
                  <h2 className="text-3xl m-0 student-profile-name" style={{ color: 'var(--text-primary-crisp)', textShadow: 'none' }}>{user?.name}</h2>
                </div>
                <p className="student-profile-org m-0">Organization: {user?.organizationName}</p>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="student-dashboard-content-wrapper flex flex-col w-full">
            {/* Today's Classes Widget */}
            <div className="rounded-2xl p-6 border shadow-sm mb-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <h3 className="m-0 mb-4 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
                <Calendar className="w-5 h-5 text-indigo-500" /> Today's Classes
              </h3>
              {mySchedules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mySchedules.map((schedule) => (
                    <div key={schedule.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] transition-shadow">
                      <h4 className="font-bold text-indigo-900 m-0 text-lg">{schedule.courseName}</h4>
                      <div className="flex items-center gap-2 text-slate-700 text-sm font-medium">
                        <User className="w-4 h-4 text-slate-400" /> Instructor: {schedule.staffName}
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 text-sm font-medium mt-1">
                        <Clock className="w-4 h-4 text-slate-400" /> {schedule.classTiming}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100 font-medium">
                  No classes scheduled for today.
                </div>
              )}
            </div>

            <div className="student-expanded-layout">
            <div className={`rounded-2xl p-6 border shadow-sm ${isBirthday ? 'birthday-bloom-effect' : ''}`} style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="m-0 mb-4 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <User className="w-5 h-5 text-green-500" /> Profile Details
            </h3>
            <div className="student-profile-details">
              <div className="student-profile-item">
                <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email Address</div>
                  <div className="text-slate-800 font-medium">{user?.email}</div>
                </div>
              </div>
              <div className="student-profile-item">
                <Building className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Organization</div>
                  <div className="text-slate-800 font-medium">{user?.organizationName}</div>
                </div>
              </div>
              <div className="student-profile-item">
                <Key className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Enrollment No.</div>
                  <div className="text-slate-800 font-medium">{user?.enrollmentNo || 'N/A'}</div>
                </div>
              </div>
              <div className="student-profile-item">
                <User className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">DOB & Gender</div>
                  <div className="text-slate-800 font-medium">{user?.dob || 'N/A'} | {user?.gender || 'N/A'}</div>
                </div>
              </div>
              <div className="student-profile-item">
                <Key className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Organization Access ID</div>
                  <div className="text-slate-800 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-sm">{user?.organizationAccessId}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 border shadow-sm flex flex-col justify-center min-h-[300px]" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="m-0 mb-4 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <BookOpen className="w-5 h-5 text-teal-500" /> Assigned Course
            </h3>
            {assignment ? (
              <div className="flex flex-col gap-4 text-left">
                <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="text-teal-900 font-bold text-xl mb-1 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-teal-600" />
                      {assignment.courseName}
                    </h3>
                    <div className="flex items-center gap-2 text-teal-700 font-medium">
                      <User className="w-4 h-4" /> Instructor: {assignment.staffName}
                    </div>
                  </div>
                  {assignment.liveSessionActive && assignment.liveRoomName && (
                    <button 
                      onClick={() => window.open(`https://meet.jit.si/${assignment.liveRoomName}`, '_blank')}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--red-500, #ef4444)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    >
                      <Video className="w-5 h-5 animate-pulse" /> Join Live Class
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Timings</div>
                      <div className="text-slate-800 font-medium text-sm">{assignment.classTiming}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dates</div>
                      <div className="text-slate-800 font-medium text-sm">{assignment.startDate} to {assignment.endDate}</div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('course')}
                  className="w-full p-3 mt-4 text-white bg-teal-600 hover:bg-teal-700 transition-colors border-none rounded-lg font-bold cursor-pointer shadow-sm"
                >
                  Go to Course Materials
                </button>
              </div>
            ) : (
              <div className="text-center student-no-course-placeholder">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <BookOpen className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-600 font-medium mb-1">No course assigned yet</h3>
                <p className="text-slate-400 text-sm">Your admin will assign you to a specific batch and schedule soon.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

        {activeTab === 'fee' && (
          <div className="rounded-2xl p-6 border shadow-sm w-full max-w-4xl mx-auto" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <h3 className="m-0 mb-6 text-lg font-bold flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <CreditCard className="w-5 h-5 text-indigo-500" /> Fee Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center text-center">
                <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Fee</div>
                <div className="text-2xl font-bold text-slate-800">Rs. 28,000</div>
              </div>
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex flex-col justify-center text-center">
                <div className="text-sm text-teal-600 uppercase tracking-wider font-semibold mb-1">Paid Fee</div>
                <div className="text-2xl font-bold text-teal-800">Rs. {user?.paidFee || 0}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col justify-center text-center">
                <div className="text-sm text-red-600 uppercase tracking-wider font-semibold mb-1">Pending Fee</div>
                <div className="text-2xl font-bold text-red-800">Rs. {user?.pendingFee ?? 28000}</div>
              </div>
            </div>

            {/* Paid Bills History */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-500" />
                My Digital Bills
              </h3>
              
              {receipts.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {receipts.map(receipt => (
                    <div key={receipt.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-slate-800 text-lg">{receipt.billNumber}</span>
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded">Paid: ₹{receipt.totalAmount}</span>
                          <span className="text-xs text-slate-500">{receipt.timestamp ? new Date(receipt.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm max-w-md">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                            <div className="text-slate-500 text-xs uppercase font-bold">Cash</div>
                            <div className="font-semibold">₹{receipt.paymentSplit?.cash || 0}</div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                            <div className="text-slate-500 text-xs uppercase font-bold">UPI</div>
                            <div className="font-semibold">₹{receipt.paymentSplit?.upi || 0}</div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                            <div className="text-slate-500 text-xs uppercase font-bold">Card</div>
                            <div className="font-semibold">₹{receipt.paymentSplit?.card || 0}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button 
                          onClick={() => { setSelectedBill(receipt); setIsBillModalVisible(true); }}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold border rounded-lg transition-colors shadow-sm"
                          style={{ backgroundColor: 'var(--blue-50, #eff6ff)', color: 'var(--blue-600, #2563eb)', borderColor: 'var(--blue-200, #bfdbfe)' }}
                        >
                          <ExternalLink style={{ width: '16px', height: '16px' }} />
                          View Digital Bill
                        </button>
                        <button 
                          onClick={() => handleDownloadReceipt(receipt)}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold border rounded-lg transition-colors shadow-sm"
                          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                        >
                          <Download style={{ width: '16px', height: '16px' }} />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 italic">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-lg">No payment history found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="rounded-2xl p-6 border shadow-sm w-full max-w-4xl mx-auto" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
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
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
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

                {(courseContentUrl || contentObjects.length > 0) ? (
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
                    
                    {contentObjects.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Attached Files</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {contentObjects.map((fileObj, idx) => (
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
                  <div className="mt-8 text-center p-8 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 italic">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-lg">No content materials provided yet.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100">
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
          <div className="rounded-2xl p-6 border shadow-sm w-full max-w-4xl mx-auto" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
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
                <input type="text" name="name" defaultValue={user?.name} required />
              </div>
              <div>
                <label className="settings-form-label">Gender</label>
                <select name="gender" defaultValue={user?.gender}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="settings-form-label">Date of Birth</label>
                <input type="date" name="dob" defaultValue={user?.dob} required />
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
            <div className="custom-modal-viewport-card" style={{ backgroundColor: '#fff', color: '#333', width: '500px', maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              
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
