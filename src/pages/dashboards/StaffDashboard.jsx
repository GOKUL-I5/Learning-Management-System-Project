import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createStudent, logoutUser, getOrganizationStudents, deleteUserDoc, updateUserDoc, getStaffAssignments, updateCourseAssignment, getOrganizationDetails, saveAttendanceHistory, getAttendanceHistoryByFaculty, createReceipt, listenToOrganizationStatus, logTransaction, getOrganizationCourses, addStudentMarks } from '../../firebase/services';
import { LogOut, Calendar as CalendarIcon, Clock, Users, BookOpen, ChevronRight, Upload as UploadIcon, FileText, ClipboardList, Pencil, Download, CheckCircle, XCircle, GraduationCap, UploadCloud, FileSpreadsheet, Calendar, Video, ArrowLeft, Mic, MicOff, Monitor, Paperclip, CheckCircle2, Trash2, ChevronDown, UserCheck, AlertCircle, Banknote, Search, Award } from 'lucide-react';
import Papa from 'papaparse';
import './StaffDashboard.css';

const message = {
  success: (msg) => alert(msg),
  error: (msg) => alert(msg),
  info: (msg) => alert(msg),
  warning: (msg) => alert(msg)
};

const useNativeForm = () => {
  const [data, setData] = useState({});
  return [
    {
      getFieldsValue: () => data,
      getFieldValue: (key) => data[key],
      setFieldsValue: (newVals) => setData(prev => ({...prev, ...newVals})),
      resetFields: () => setData({})
    }
  ];
};

const StaffDashboard = () => {
  const isBillUploadEnabled = true;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [studentForm] = useNativeForm();
  const [editForm] = useNativeForm();
  const [studentList, setStudentList] = useState([]);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [scheduleList, setScheduleList] = useState([]);
  const [activeTab, setActiveTab] = useState('3');
  const [isAddStudentModalVisible, setIsAddStudentModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [courseList, setCourseList] = useState([]);
  const [scheduleSettings, setScheduleSettings] = useState({ showSunday: false, startHour: 6, endHour: 15 });
  const [avgGrades, setAvgGrades] = useState({});
  const [isEditChartVisible, setIsEditChartVisible] = useState(false);
  const [addStudentTab, setAddStudentTab] = useState('single');
  const [attendanceSubTab, setAttendanceSubTab] = useState('daily');
  const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false);
  
  // Student Journey Hub & Search Modal State
  const [journeySearchQuery, setJourneySearchQuery] = useState('');
  const [selectedJourneyStudent, setSelectedJourneyStudent] = useState(null);
  const [globalSearchModalVisible, setGlobalSearchModalVisible] = useState(false);
  const [globalSearchAction, setGlobalSearchAction] = useState(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // Student Ledger Filters
  const [studentTextSearch, setStudentTextSearch] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('All');
  const [studentAgeFilter, setStudentAgeFilter] = useState('All');
  
  // Marks Portal State
  const [facultyMarksCourseFilter, setFacultyMarksCourseFilter] = useState('');
  const [facultyMarksGlobalExamName, setFacultyMarksGlobalExamName] = useState('');
  const [facultyMarksFormData, setFacultyMarksFormData] = useState({});
  const [submittingMarks, setSubmittingMarks] = useState(false);
  const getAgeBucket = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const age = new Date().getFullYear() - birthDate.getFullYear();
    if (age < 18) return 'Under 18';
    if (age >= 18 && age <= 24) return '18-24';
    if (age >= 25 && age <= 30) return '25-30';
    return '30+';
  };

  const filteredStudentList = (list) => {
    return list.filter(s => {
      const matchSearch = (s.name || '').toLowerCase().includes(studentTextSearch.toLowerCase()) || 
                          (s.enrollmentNo || '').toLowerCase().includes(studentTextSearch.toLowerCase());
      const matchCourse = studentCourseFilter === 'All' || s.course === studentCourseFilter;
      const bucket = getAgeBucket(s.dob);
      const matchAge = studentAgeFilter === 'All' || bucket === studentAgeFilter;
      return matchSearch && matchCourse && matchAge;
    });
  };
  const [attendanceState, setAttendanceState] = useState({});
  const [isSubmitSummaryModalVisible, setIsSubmitSummaryModalVisible] = useState(false);
  const [absenteesList, setAbsenteesList] = useState([]);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('org_logo') || null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [attendanceHistoryList, setAttendanceHistoryList] = useState([]);
  
  const [isFeeModalVisible, setIsFeeModalVisible] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null);
  const [feeForm] = useNativeForm();
  const cashAmount = feeForm.getFieldValue('cashAmount') || 0;
  const upiAmount = feeForm.getFieldValue('upiAmount') || 0;
  const cardAmount = feeForm.getFieldValue('cardAmount') || 0;
  const totalFeePaid = Number(cashAmount) + Number(upiAmount) + Number(cardAmount);

  const handleFeeSubmit = async (values) => {
    if (totalFeePaid <= 0) {
      message.error("Total amount must be greater than 0");
      return;
    }
    setLoading(true);
    try {
      await logTransaction('OFFLINE_FEE_COLLECTION', {
        studentId: selectedStudentForFee.id,
        staffId: user?.id,
        amount: totalFeePaid,
        actionContext: 'Offline Fee Collection'
      });
      const receiptData = {
        studentId: selectedStudentForFee.id,
        course: selectedStudentForFee.course || 'N/A',
        paymentSplit: {
          cash: Number(values.cashAmount || 0),
          upi: Number(values.upiAmount || 0),
          card: Number(values.cardAmount || 0)
        },
        totalAmount: totalFeePaid,
        billNumber: values.billNumber,
        paymentDate: values.paymentDate ? values.paymentDate.toISOString() : new Date().toISOString(),
        paymentTime: values.paymentTime ? values.paymentTime.format('HH:mm') : null,
        remarks: values.remarks || ''
      };
      
      await createReceipt(receiptData);
      
      const currentPaid = selectedStudentForFee.paidFee || 0;
      const courseFee = selectedStudentForFee.courseFee || 28000;
      const newPaid = currentPaid + totalFeePaid;
      const newPending = courseFee - newPaid;
      
      await updateUserDoc(selectedStudentForFee.id, {
        paidFee: newPaid,
        pendingFee: newPending
      });
      
      message.success("Fee collected successfully!");
      setIsFeeModalVisible(false);
      feeForm.resetFields();
      fetchStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isAttendanceEditable = (timingString) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingHistory = attendanceHistoryList.find(h => h.date === today && h.batchName === selectedBatch?.courseName);
      if (existingHistory && existingHistory.isFinal) return false;

      if (!timingString) return true;
      const [startStr, endStr] = timingString.split(' - ');
      if (!endStr) return true;
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      };
      const endTime = parseTime(endStr);
      return new Date() <= endTime;
    } catch (e) {
      return true;
    }
  };

  const isFinalizedToday = selectedBatch && attendanceHistoryList.some(record => 
    record.batchName === selectedBatch.courseName && 
    record.date === new Date().toISOString().split('T')[0] &&
    record.slot === selectedBatch.classTiming &&
    record.status === 'finalized'
  );

  const activeBatchEditable = selectedBatch ? (!isFinalizedToday && isAttendanceEditable(selectedBatch.classTiming)) : false;

  const toggleAttendance = (studentId) => {
    if (!activeBatchEditable) {
      message.warning("Editing is blocked. The active class duration has passed.");
      return;
    }
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'P' ? 'A' : 'P'
    }));
  };

  const handleSubmitAttendance = async (isFinal = false) => {
    if (isFinal) {
      const confirmFinal = window.confirm("Are you sure you want to final submit? This action will permanently lock the attendance log.");
      if (!confirmFinal) return;
    }
    setSubmittingAttendance(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const slot = selectedBatch.classTiming || 'NoSlot';
      const compositeKey = `${today}_${slot}`;
      
      const newAttendanceRecord = {};
      const activeBatchStudents = studentList.filter(s => s.course === selectedBatch.courseName);
      const absentees = [];
      const records = [];
      
      activeBatchStudents.forEach(student => {
        const status = attendanceState[student.id] || 'A';
        newAttendanceRecord[student.id] = status;
        records.push({ studentName: student.name, status });
        if (status === 'A') absentees.push(student);
      });
      
      if (!isFinal) {
        localStorage.setItem(`draft_attendance_${selectedBatch.id}_${compositeKey}`, JSON.stringify(newAttendanceRecord));
        message.success("Attendance saved as draft locally!");
        setSubmittingAttendance(false);
        return;
      }
      
      const currentAttendanceLog = selectedBatch.attendance || {};
      currentAttendanceLog[compositeKey] = newAttendanceRecord;
      await updateCourseAssignment(selectedBatch.id, { attendance: currentAttendanceLog });
      
      const totalAbsentees = records.filter(r => r.status === 'A').length;
      const totalPresentees = records.filter(r => r.status === 'P').length;
      
      // Save history to Firestore
      await saveAttendanceHistory(user.organizationAccessId || user.organizationId, {
        batchName: selectedBatch.courseName,
        date: today,
        slot: slot,
        facultyName: user.name,
        totalAbsentees: totalAbsentees,
        totalPresentees: totalPresentees,
        records: records,
        isFinal: true
      });
      
      localStorage.removeItem(`draft_attendance_${selectedBatch.id}_${compositeKey}`);
      
      message.success("Attendance submitted successfully!");
      setAbsenteesList(absentees);
      setIsSubmitSummaryModalVisible(true);
      setIsAttendanceModalVisible(false);
      fetchStudents();
      fetchAttendanceHistory();
    } catch (e) {
      message.error("Failed to submit attendance: " + e.message);
    } finally {
      setSubmittingAttendance(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedBatch && activeBatchEditable && Object.keys(attendanceState).length > 0 && !submittingAttendance) {
        const parts = selectedBatch.classTiming?.split('-');
        if (parts && parts.length === 2) {
          const endTimeMatch = parts[1].match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (endTimeMatch) {
            let h = parseInt(endTimeMatch[1]);
            let m = parseInt(endTimeMatch[2]);
            let p = endTimeMatch[3];
            if (p && p.toUpperCase() === 'PM' && h < 12) h += 12;
            if (p && p.toUpperCase() === 'AM' && h === 12) h = 0;
            
            const now = new Date();
            const end = new Date();
            end.setHours(h, m, 0, 0);
            
            if (now > end) {
              console.log("Class duration expired, auto-submitting draft attendance.");
              handleSubmitAttendance(false);
            }
          }
        }
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [selectedBatch, activeBatchEditable, attendanceState, submittingAttendance]);

  const handleSendWhatsAppAlerts = async () => {
    setSubmittingAttendance(true);
    try {
      const promises = absenteesList
        .filter(student => student.parentPhone)
        .map(student => {
          const formattedPhone = student.parentPhone.startsWith('+') ? student.parentPhone : `+91${student.parentPhone}`;
          return axios.post('/api/send-attendance-whatsapp', {
            parentPhone: formattedPhone,
            studentName: student.name,
            batchName: selectedBatch.courseName
          });
        });
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      message.success("WhatsApp notifications sent successfully to parents via Twilio!");
      setIsSubmitSummaryModalVisible(false);
    } catch (e) {
      message.error("Error sending WhatsApp alerts: " + e.message);
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const downloadAttendanceCSV = (item) => {
    const headers = ['Student Name', 'Status', 'Date', 'Batch', 'Time Slot'];
    const rows = item.records?.map(r => [r.studentName, r.status, item.date, item.batchName, item.slot]) || [];
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${item.batchName}_${item.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchAttendanceHistory = async () => {
    if (!user?.name) return;
    try {
      const history = await getAttendanceHistoryByFaculty(user.name);
      setAttendanceHistoryList(history.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
    } catch (error) {
      console.error("Error fetching attendance history", error);
    }
  };

  const userStr = localStorage.getItem('lms_user');
  const user = userStr ? JSON.parse(userStr) : null;

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

  const fetchStudents = async () => {
    if (!user?.organizationId) return;
    try {
      const [students, assignments, orgDetails, courses] = await Promise.all([
        getOrganizationStudents(user.organizationId),
        getStaffAssignments(user.organizationId, user.id),
        getOrganizationDetails(user.organizationId),
        getOrganizationCourses(user.organizationId)
      ]);
      setStudentList(students);
      setScheduleList(assignments);
      setCourseList(courses || []);
      if (orgDetails.logoUrl) {
        setLogoUrl(orgDetails.logoUrl);
        localStorage.setItem('org_logo', orgDetails.logoUrl);
      } else {
        setLogoUrl(null);
        localStorage.removeItem('org_logo');
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAttendanceHistory();
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, [user?.organizationId]);

  const handleEditClick = (record) => {
    setEditingStudent(record);
    editForm.setFieldsValue({
      name: record.name,
      email: record.email,
      course: record.course,
      courseFee: record.courseFee,
      phoneNumber: record.phoneNumber,
      parentPhone: record.parentPhone,
      status: record.currentStatus || record.status || 'Active',
      enrollmentNo: record.enrollmentNo,
      gender: record.gender,
      dob: record.dob,
      dateOfJoining: record.dateOfJoining,
      age: record.age,
      batch: record.batch
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    setEditLoading(true);
    try {
      if (values.phoneNumber && !values.phoneNumber.startsWith('+')) values.phoneNumber = `+91${values.phoneNumber}`;
      if (values.parentPhone && !values.parentPhone.startsWith('+')) values.parentPhone = `+91${values.parentPhone}`;
      
      const updatePayload = {
        ...values,
        age: values.age ? parseInt(values.age, 10) : null,
        batch: values.batch ? String(values.batch).trim() : "",
        status: values.status || 'Active',
        currentStatus: values.status || 'Active',
      };

      await updateUserDoc(editingStudent.id, updatePayload);
      message.success("Profile updated successfully!");
      setIsEditModalVisible(false);
      
      // Force state synchronized refresh pipeline
      if (selectedJourneyStudent && selectedJourneyStudent.id === editingStudent.id) {
        setSelectedJourneyStudent(prev => ({
          ...prev,
          ...updatePayload
        }));
      }
      setStudentList(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...updatePayload } : s));

      fetchStudents();
    } catch (error) {
      message.error("Failed to update profile: " + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const scheduleColumns = [
    { title: 'Course Name', dataIndex: 'courseName', key: 'courseName', width: 150 },
    { title: 'Class Timing', dataIndex: 'classTiming', key: 'classTiming', width: 150 },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 120 },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 120 }
  ];

  const handleCreateStudent = async (values) => {
    setLoading(true);
    try {
      const studentData = {
        name: values.name,
        email: values.email,
        organizationAccessId: user.organizationAccessId,
        gender: values.gender,
        dob: values.dob || null,
        dateOfJoining: values.dateOfJoining || null,
        enrollmentNo: values.enrollmentNo,
        course: values.course,
        courseFee: values.courseFee,
        phoneNumber: values.phoneNumber,
        parentPhone: values.parentPhone,
        status: values.status,
        age: values.age,
        batch: values.batch || null
      };
      const result = await createStudent(user.organizationId, user.organizationName, studentData);
      
      // SMS Notification Logic
      if (values.sendSMS) {
        const orgName = user.organizationName;
        const gender = values.gender;
        const studentPhone = values.phoneNumber;
        const parentPhone = values.parentPhone;

        // Helper function to send SMS via Fast2SMS API format
        const sendSMS = async (phone, messageText) => {
          try {
            // Provide your Fast2SMS API Key in the headers here
            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
              method: 'POST',
              headers: { 
                'authorization': 'YOUR_FAST2SMS_API_KEY_HERE',
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({ 
                route: "v3",
                sender_id: "TXTIND",
                message: messageText,
                language: "english",
                flash: 0,
                numbers: phone 
              })
            });
            
            if (!response.ok) throw new Error('SMS Gateway returned an error');
            console.log(`[SMS SUCCESS] Delivered to ${phone}`);
          } catch (error) {
            console.error(`[SMS FAILED] Could not send to ${phone}:`, error);
          }
        };

        const smsPromises = [];

        if (studentPhone) {
          const text = `Hello, your student profile has been successfully created in ${orgName}. You can now log in using your registered phone number.`;
          smsPromises.push(sendSMS(studentPhone, text));
        }

        if (parentPhone) {
          const relation = gender === 'Female' ? "daughter's" : "son's";
          const text = `Dear Parent, your ${relation} account has been successfully created in ${orgName}. Use this phone number to access the portal.`;
          smsPromises.push(sendSMS(parentPhone, text));
        }
        
        // Wait for SMS requests to finish without blocking the main success message
        Promise.all(smsPromises).then(() => {
          message.success("SMS notifications triggered successfully.");
        });
      }
      
      message.success(`Student created successfully linked to Organization Access ID.`);
      studentForm.resetFields();
      setIsAddStudentModalVisible(false);
      fetchStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processCSV = (file) => {
    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        let errorCount = 0;

        for (const row of results.data) {
          const studentData = {
            name: row.Name || row.name,
            email: row.Email || row.email,
            organizationAccessId: user.organizationAccessId,
            gender: row.Gender || row.gender,
            dob: row.DOB || row.dob || row['Date of Birth'],
            dateOfJoining: row.DateOfJoining || row.dateOfJoining || row['Date of Joining'],
            enrollmentNo: row.EnrollmentNo || row.enrollmentNo || row['Enrollment No'],
            course: row.Course || row.course,
            courseFee: row.CourseFee || row.courseFee || row['Course Fee'],
            phoneNumber: row.PhoneNumber || row.phoneNumber || row.StudentPhone || row['Student Phone'] || row['Phone Number'],
            parentPhone: row.ParentPhone || row.parentPhone || row['Parent Phone'],
            status: row.Status || row.status || 'Active'
          };

          if (studentData.name && studentData.email) {
            try {
              await createStudent(user.organizationId, user.organizationName, studentData);
              successCount++;
            } catch (error) {
              errorCount++;
            }
          }
        }

        message.success(`Bulk import completed: ${successCount} imported successfully.`);
        if (errorCount > 0) message.warning(`${errorCount} records failed (possibly duplicate emails).`);
        setUploading(false);
        fetchStudents();
      },
      error: (error) => {
        message.error(`Error parsing file: ${error.message}`);
        setUploading(false);
      }
    });
    return false; // Prevent default upload behavior
  };

  const activeBatchStudents = selectedBatch ? studentList.filter(s => s.course === selectedBatch.courseName) : [];

  return (
    <div className="main-dashboard-layout-wrapper" style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text-main-dark)' }}>
      <style>{`
        input.search-bar-input[type="text"], div.search-bar-wrapper > input[type="text"] { padding-left: 46px !important; }
        div.search-bar-wrapper > svg.search-bar-icon, svg.search-bar-icon { position: absolute !important; left: 14px !important; top: 50% !important; transform: translateY(-50%) !important; pointer-events: none !important; color: #6b7280 !important; z-index: 10 !important; }
        div.search-bar-wrapper { position: relative !important; display: flex !important; align-items: center !important; }
      `}</style>
      {/* Sidebar Navigation */}
      <aside className="flex flex-col h-full overflow-y-auto w-[260px] shrink-0" style={{ backgroundColor: 'var(--card-bg-clean)' }}>
        <div className="flex flex-col items-center justify-center p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-center w-24 h-24 rounded-full border-2 overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Org Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <Users className="w-12 h-12 text-blue-600" />
            )}
          </div>
          <h4 className="mt-4 text-sm font-bold text-center" style={{ color: 'var(--text-main)' }}>Faculty Dashboard</h4>
        </div>

        <nav className="flex-1 py-4 px-4">
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            <li 
              onClick={() => setActiveTab('3')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === '3' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === '3' ? 'var(--color-primary)' : 'transparent', color: activeTab === '3' ? '#ffffff' : 'var(--text-secondary)' }}
            ><Users className="w-5 h-5" /> Manage Students</li>

            <li 
              onClick={() => setActiveTab('4')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === '4' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === '4' ? 'var(--color-primary)' : 'transparent', color: activeTab === '4' ? '#ffffff' : 'var(--text-secondary)' }}
            ><Calendar className="w-5 h-5" /> My Schedule</li>
            <li 
              onClick={() => setActiveTab('5')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === '5' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === '5' ? 'var(--color-primary)' : 'transparent', color: activeTab === '5' ? '#ffffff' : 'var(--text-secondary)' }}
            ><ClipboardList className="w-5 h-5" /> Attendance Management</li>
            <li 
              onClick={() => setActiveTab('6')} 
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-full font-bold ${activeTab === '6' ? 'text-white' : 'hover:bg-slate-50'}`}
              style={{ backgroundColor: activeTab === '6' ? 'var(--color-primary)' : 'transparent', color: activeTab === '6' ? '#ffffff' : 'var(--text-secondary)' }}
            ><Award className="w-5 h-5" /> Marks Portal</li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-col h-full flex-1 main-content-display-pane">
        {/* Header Banner */}
        <header className="sticky top-0 z-10 flex justify-between items-center px-8 py-6 flex-wrap gap-4" style={{ backgroundColor: 'var(--panel-solid-white)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <h1 className="m-0 text-lg font-bold" style={{ color: 'var(--text-primary-crisp)' }}>Faculty Dashboard</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col items-end gap-1">
              <div className="text-sm font-bold" style={{ color: 'var(--text-primary-crisp)' }}>{user?.name || 'Faculty'}</div>
              <div className="text-xs font-bold" style={{ color: 'var(--text-muted-gray)' }}>
                Organization: <span style={{ color: 'var(--accent-royal-purple)' }}>{user?.organizationName}</span>
              </div>
            </div>
            <button onClick={logoutUser} className="top-logout-btn flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-6 w-full max-w-6xl mx-auto box-border">

      {isProfileModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '600px', maxWidth: '90%', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Student Profile Details</h2>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              {selectedStudentForProfile?.documents?.profilePhotoUrl || selectedStudentForProfile?.photoUrl ? (
                <img src={selectedStudentForProfile.documents?.profilePhotoUrl || selectedStudentForProfile.photoUrl} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--border-color)' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--indigo-100, #e0e7ff)', color: 'var(--indigo-600, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 'bold' }}>
                  {selectedStudentForProfile?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedStudentForProfile?.name}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{selectedStudentForProfile?.course || 'No Course'}</span>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Verification Documents</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 'bold' }}>Aadhaar / ID Card</span>
                {selectedStudentForProfile?.documents?.idProofUrl ? (
                  <button style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: 'var(--green-600, #16a34a)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }} onClick={async () => {
                    try {
                      await logTransaction('VIEW_ID_DOCUMENT', {
                        token: '[Aadhaar Redacted]',
                        studentId: selectedStudentForProfile.id,
                        staffId: user?.id,
                        staffName: user?.name
                      });
                    } catch (e) {}
                    window.open(selectedStudentForProfile.documents.idProofUrl, '_blank');
                  }}>View Document</button>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '12px' }}>Pending Upload</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: 'var(--slate-800, #1e293b)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }} onClick={() => setIsProfileModalVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      
      {isAddStudentModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '600px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Add Student</h2>
              <button onClick={() => setIsAddStudentModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted-gray)' }}><XCircle size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button type="button" onClick={() => setAddStudentTab('single')} style={{ flex: 1, padding: '10px', backgroundColor: addStudentTab === 'single' ? 'var(--blue-600, #2563eb)' : 'var(--bg-hover)', color: addStudentTab === 'single' ? '#fff' : 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Single Student Form</button>
              <button type="button" onClick={() => setAddStudentTab('bulk')} style={{ flex: 1, padding: '10px', backgroundColor: addStudentTab === 'bulk' ? 'var(--blue-600, #2563eb)' : 'var(--bg-hover)', color: addStudentTab === 'bulk' ? '#fff' : 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Bulk CSV Upload</button>
            </div>

            {addStudentTab === 'single' && (
              <form onSubmit={(e) => { e.preventDefault(); handleCreateStudent(studentForm.getFieldsValue()); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Enrollment No.</label>
                  <input type="text" placeholder="Enrollment Number" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({enrollmentNo: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Course</label>
                  <select required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({course: e.target.value})}>
                    <option value="">Select Course</option>
                    {courseList.map(c => <option key={c.id} value={c.title || c.name}>{c.title || c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Student Name</label>
                  <input type="text" placeholder="Enter student name" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({name: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Gender</label>
                  <select required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({gender: e.target.value})}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Age</label>
                  <input type="number" placeholder="Enter age" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({age: Number(e.target.value)})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Batch</label>
                  <input type="text" placeholder="Enter the Batch (e.g., 2026 / 2028)" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({batch: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Date of Birth</label>
                  <input type="date" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({dob: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Date of Joining</label>
                  <input type="date" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({dateOfJoining: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Course Fee</label>
                  <input type="number" placeholder="Course Fee" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({courseFee: Number(e.target.value)})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Student Phone Number</label>
                  <input type="text" placeholder="Student Phone" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({phoneNumber: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Parent Phone Number</label>
                  <input type="text" placeholder="Parent Phone" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({parentPhone: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Status</label>
                  <select required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Passed Out">Passed Out</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Student Email</label>
                  <input type="email" placeholder="Enter student email" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({email: e.target.value})} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="sendSMS" defaultChecked onChange={(e) => studentForm.setFieldsValue({sendSMS: e.target.checked})} />
                  <label htmlFor="sendSMS">Send Welcome WhatsApp Notification to Student & Parent</label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button type="submit" disabled={loading} style={{ padding: '8px 16px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create Student</button>
                </div>
              </form>
            )}

            {addStudentTab === 'bulk' && (
              <div className="w-full max-w-3xl flex flex-col gap-6">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-blue-800 text-sm text-center shadow-sm">
                  <strong>Instructions:</strong> Please upload a CSV file with columns <code>Name</code>, <code>Email</code>, <code>Gender</code>, <code>DOB</code>, <code>DateOfJoining</code>, <code>EnrollmentNo</code>, <code>Course</code>, <code>CourseFee</code>, <code>StudentPhone</code>, <code>ParentPhone</code>, <code>Status</code>.
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '100%', padding: '40px', backgroundColor: '#ffffff', border: '2px dashed var(--border-color)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
                    <input type="file" accept=".csv" onChange={(e) => { if(e.target.files.length) processCSV(e.target.files[0]); }} disabled={uploading} style={{ display: 'none' }} id="csv-upload" />
                    <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{ width: '56px', height: '56px', color: 'var(--blue-500, #3b82f6)', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UploadCloud style={{ width: '40px', height: '40px' }} />
                      </div>
                      <p style={{ fontSize: '20px', fontWeight: '600', color: '#334155', margin: 0 }}>Click to select CSV file to upload</p>
                      <p style={{ color: '#64748b', marginTop: '12px', fontSize: '16px' }}>
                        Strictly single CSV file upload. {uploading && <span style={{ color: 'var(--blue-600, #2563eb)', fontWeight: '600' }}>Processing...</span>}
                      </p>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '24px', width: '100%', boxSizing: 'border-box' }}>
                  {activeTab === '3' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                      <div style={{ padding: '20px', backgroundColor: 'var(--panel-solid-white, #fff)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted-gray, #64748b)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Students</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary-crisp, #0f172a)', marginTop: '8px', fontFamily: 'system-ui, sans-serif' }}>{studentList.length}</div>
                      </div>
                      <div style={{ padding: '20px', backgroundColor: 'var(--panel-solid-white, #fff)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', borderBottom: '3px solid #22c55e', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted-gray, #64748b)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary-crisp, #0f172a)', marginTop: '8px', fontFamily: 'system-ui, sans-serif' }}>{studentList.filter(s => (s.currentStatus || 'Active') === 'Active').length}</div>
                      </div>
                      <div style={{ padding: '20px', backgroundColor: 'var(--panel-solid-white, #fff)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', borderBottom: '3px solid #3b82f6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted-gray, #64748b)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary-crisp, #0f172a)', marginTop: '8px', fontFamily: 'system-ui, sans-serif' }}>{studentList.filter(s => s.currentStatus === 'Completed').length}</div>
                      </div>
                      <div style={{ padding: '20px', backgroundColor: 'var(--panel-solid-white, #fff)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', borderBottom: '3px solid #ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted-gray, #64748b)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Drop-out</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary-crisp, #0f172a)', marginTop: '8px', fontFamily: 'system-ui, sans-serif' }}>{studentList.filter(s => s.currentStatus === 'Drop-out').length}</div>
                      </div>
                      <div style={{ padding: '20px', backgroundColor: 'var(--panel-solid-white, #fff)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)', borderBottom: '3px solid #64748b', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted-gray, #64748b)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactive</div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary-crisp, #0f172a)', marginTop: '8px', fontFamily: 'system-ui, sans-serif' }}>{studentList.filter(s => s.currentStatus === 'Inactive').length}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                      <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary-crisp, #0f172a)', margin: 0 }}>Student Roster</h3>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" onClick={() => { setGlobalSearchAction('edit'); setGlobalSearchModalVisible(true); }} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: 'var(--accent-royal-purple, #6366f1)', border: '2px solid var(--accent-royal-purple, #6366f1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-royal-purple, #6366f1)'; e.currentTarget.style.color = '#fff'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--accent-royal-purple, #6366f1)'; }}>
                          Edit Student
                        </button>
                        <button type="button" onClick={() => setIsAddStudentModalVisible(true)} style={{ padding: '10px 20px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--blue-600, #2563eb)'}>
                          Add Student
                        </button>
                      </div>
                    </div>
                    <div className="w-full overflow-x-auto">
                    <div className="w-full">
                      {/* Filter Controls Row */}
                      <div style={{ display: 'flex', gap: '16px', padding: '16px', backgroundColor: 'var(--theme-bg-premium)', borderBottom: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className="search-bar-wrapper" style={{ flex: 1 }}>
                          <Search className="search-bar-icon" />
                          <input 
                            className="search-bar-input"
                            type="text" 
                            placeholder="Search by Student Name or Enrollment Number..." 
                            value={studentTextSearch}
                            onChange={(e) => setStudentTextSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid var(--border-color)', borderRadius: '8px', boxSizing: 'border-box', fontSize: '14px', backgroundColor: 'var(--panel-solid-white)', color: 'var(--text-primary-crisp)', outline: 'none' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <select value={studentAgeFilter} onChange={(e) => setStudentAgeFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-solid-white)', color: 'var(--text-primary-crisp)', fontWeight: 'bold', minWidth: '150px', outline: 'none', cursor: 'pointer' }}>
                            <option value="All">All Ages</option>
                            <option value="Under 18">Under 18</option>
                            <option value="18-24">18 - 24</option>
                            <option value="25-30">25 - 30</option>
                            <option value="30+">30+</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <select value={studentCourseFilter} onChange={(e) => setStudentCourseFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-solid-white)', color: 'var(--text-primary-crisp)', fontWeight: 'bold', minWidth: '150px', outline: 'none', cursor: 'pointer' }}>
                            <option value="All">All Courses</option>
                            {courseList.map(course => (
                              <option key={course.id || course.name} value={course.name}>{course.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ width: '100%', overflowX: 'auto', backgroundColor: 'var(--panel-solid-white)' }}>
                        <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead style={{ backgroundColor: 'var(--theme-bg-premium)', borderBottom: '2px solid var(--border-color)' }}>
                            <tr>
                              <th style={{ padding: '16px', color: 'var(--text-muted-gray)', fontSize: '12px', textTransform: 'uppercase' }}>Name</th>
                              <th style={{ padding: '16px', color: 'var(--text-muted-gray)', fontSize: '12px', textTransform: 'uppercase' }}>Course</th>
                              <th style={{ padding: '16px', color: 'var(--text-muted-gray)', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                              <th style={{ padding: '16px', color: 'var(--text-muted-gray)', fontSize: '12px', textTransform: 'uppercase' }}>Fees Status</th>
                              <th style={{ padding: '16px', color: 'var(--text-muted-gray)', fontSize: '12px', textTransform: 'uppercase' }}>Gmail</th>
                              <th style={{ padding: '16px', color: 'var(--text-muted-gray)', fontSize: '12px', textTransform: 'uppercase' }}>Phone Number</th>
                              <th style={{ padding: '16px', color: 'var(--text-muted-gray)', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudentList(studentList)
                              .map(student => {
                              const courseFee = student.courseFee || 28000;
                              const paid = student.paidFee || 0;
                              const feeStatus = (courseFee - paid) <= 0 ? 'Paid' : 'Pending';
                              const feeBg = feeStatus === 'Paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                              const feeColor = feeStatus === 'Paid' ? '#22c55e' : 'var(--danger-vibrant)';
                              const status = student.currentStatus || 'Active';
                              const statusBg = status === 'Active' ? 'rgba(92, 89, 232, 0.1)' : 'rgba(100, 116, 139, 0.1)';
                              const statusColor = status === 'Active' ? 'var(--accent-royal-purple)' : 'var(--text-muted-gray)';
                              return (
                                <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', backgroundColor: 'var(--panel-solid-white)' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-bg-premium)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--panel-solid-white)'}>
                                  <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      {student.documents?.profilePhotoUrl || student.photoUrl ? (
                                        <img src={student.documents?.profilePhotoUrl || student.photoUrl} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
                                      ) : (
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--accent-royal-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', border: '1px solid var(--border-color)' }}>
                                          {student.name?.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary-crisp)', fontSize: '15px' }}>{student.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted-gray)', marginTop: '2px' }}>ID: {student.enrollmentNo || student.id.substring(0,6).toUpperCase()}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px', color: 'var(--text-primary-crisp)', fontWeight: '600' }}>
                                    {student.course || 'N/A'}
                                  </td>
                                  <td style={{ padding: '16px' }}>
                                    <span style={{ backgroundColor: statusBg, color: statusColor, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{status}</span>
                                  </td>
                                  <td style={{ padding: '16px' }}>
                                    <span style={{ backgroundColor: feeBg, color: feeColor, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{feeStatus}</span>
                                  </td>
                                  <td style={{ padding: '16px', color: 'var(--text-primary-crisp)' }}>{student.email || student.gmail || 'N/A'}</td>
                                  <td style={{ padding: '16px', color: 'var(--text-primary-crisp)' }}>{student.phoneNumber || 'N/A'}</td>
                                  <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                      <button 
                                        onClick={() => { setSelectedStudentForProfile(student); setIsProfileModalVisible(true); }}
                                        style={{ cursor: 'pointer', padding: '6px 12px', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--text-primary-crisp)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', transition: 'background-color 0.2s' }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-bg-premium)'}
                                      >
                                        View Docs
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredStudentList(studentList).length === 0 && (
                              <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted-gray)' }}>
                                  No students found matching your filters.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </div>
                  </div>
              )}

              {activeTab === '4' && (
                <div className="w-full flex flex-col gap-6">
                  <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold m-0" style={{ color: 'var(--text-main)' }}>My Batch & Course Schedule</h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                     {scheduleList.length === 0 && (
                        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)', gridColumn: '1 / -1' }}>
                           <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: 0 }}>No batches assigned to your schedule.</p>
                        </div>
                     )}
                     {scheduleList.map(batch => (
                        <div key={batch.id} 
                             onClick={() => setSelectedBatch(batch)}
                             style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                             onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)'; }}
                             onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
                        >
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                             <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-royal-purple)' }}>{batch.courseName}</h4>
                             <div style={{ backgroundColor: 'var(--indigo-50, #eef2ff)', color: 'var(--indigo-600, #4f46e5)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Active</div>
                           </div>
                           
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                               <Clock style={{ width: '16px', height: '16px' }} />
                               <span>{batch.classTiming || 'Timing Not Set'}</span>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                               <CalendarIcon style={{ width: '16px', height: '16px' }} />
                               <span>{batch.startDate} to {batch.endDate}</span>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                               <Users style={{ width: '16px', height: '16px' }} />
                               <span>{studentList.filter(s => s.course === batch.courseName).length} Enrolled Students</span>
                             </div>
                           </div>
                           
                           <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                              <button style={{ width: '100%', padding: '10px', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>View Details & Attendance</button>
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* Context Overlay Modal for Selected Batch */}
                  {selectedBatch && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30, 41, 59, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1000 }}>
                      <div style={{ width: '450px', maxWidth: '100%', height: '100%', backgroundColor: 'var(--panel-solid-white)', padding: '32px', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary-crisp)' }}>Class Context</h3>
                          <button onClick={() => setSelectedBatch(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted-gray)' }}><XCircle /></button>
                        </div>
                        
                        <div style={{ backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-royal-purple)', fontSize: '18px', fontWeight: 'bold' }}>{selectedBatch.courseName}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted-gray)', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarIcon style={{ width: '16px', height: '16px' }} /> {selectedBatch.startDate} to {selectedBatch.endDate}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted-gray)', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock style={{ width: '16px', height: '16px' }} /> {selectedBatch.classTiming}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary-crisp)' }}>Attendance Framework</h4>
                          {!activeBatchEditable && <span style={{ padding: '4px 8px', backgroundColor: 'var(--danger-vibrant)', color: '#fff', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>LOCKED</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                          {activeBatchStudents.map((record) => (
                            <div key={record.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: activeBatchEditable ? 'pointer' : 'default', backgroundColor: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? 'var(--panel-solid-white)' : 'rgba(239, 68, 68, 0.05)' }} onClick={() => toggleAttendance(record.id)}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--accent-royal-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                {record.name?.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: 'var(--text-primary-crisp)' }}>{record.name}</div>
                              <div>
                                <button style={{ width: '36px', padding: '6px', backgroundColor: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? 'var(--success-vibrant, #10b981)' : 'var(--bg-hover)', color: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  P
                                </button>
                                <button style={{ width: '36px', padding: '6px', marginLeft: '8px', backgroundColor: attendanceState[record.id] === 'A' ? 'var(--danger-vibrant, #ef4444)' : 'var(--bg-hover)', color: attendanceState[record.id] === 'A' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  A
                                </button>
                              </div>
                            </div>
                          ))}
                          {activeBatchStudents.length === 0 && (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted-gray)' }}>No students enrolled.</div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleSubmitAttendance(false)} disabled={!activeBatchEditable || submittingAttendance} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--text-primary-crisp)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', cursor: (!activeBatchEditable || submittingAttendance) ? 'not-allowed' : 'pointer' }}>
                              Save as Draft
                            </button>
                            <button onClick={() => handleSubmitAttendance(true)} disabled={!activeBatchEditable || submittingAttendance} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--accent-royal-purple)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (!activeBatchEditable || submittingAttendance) ? 'not-allowed' : 'pointer' }}>
                              Submit Final
                            </button>
                          </div>
                          <button onClick={() => {}} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Download Report
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


            </div>
            

            {activeTab === '5' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full mt-6">
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px' }}>
                  <button 
                    onClick={() => setAttendanceSubTab('daily')} 
                    style={{ padding: '8px 16px', border: 'none', background: 'none', fontWeight: 'bold', fontSize: '16px', color: attendanceSubTab === 'daily' ? 'var(--blue-600, #2563eb)' : 'var(--text-muted-gray)', borderBottom: attendanceSubTab === 'daily' ? '3px solid var(--blue-600, #2563eb)' : 'none', cursor: 'pointer' }}
                  >
                    Daily Attendance
                  </button>
                  <button 
                    onClick={() => setAttendanceSubTab('history')} 
                    style={{ padding: '8px 16px', border: 'none', background: 'none', fontWeight: 'bold', fontSize: '16px', color: attendanceSubTab === 'history' ? 'var(--blue-600, #2563eb)' : 'var(--text-muted-gray)', borderBottom: attendanceSubTab === 'history' ? '3px solid var(--blue-600, #2563eb)' : 'none', cursor: 'pointer' }}
                  >
                    Attendance History
                  </button>
                </div>

                {attendanceSubTab === 'daily' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Today's Batches</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                      {scheduleList.length === 0 && (
                        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)', gridColumn: '1 / -1' }}>
                           <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: 0 }}>No batches scheduled for today.</p>
                        </div>
                      )}
                      {scheduleList.map(batch => (
                        <div key={batch.id} 
                             style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                        >
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                             <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-royal-purple)' }}>{batch.courseName}</h4>
                             <div style={{ backgroundColor: 'var(--indigo-50, #eef2ff)', color: 'var(--indigo-600, #4f46e5)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Active</div>
                           </div>
                           
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                               <Clock style={{ width: '16px', height: '16px' }} />
                               <span>{batch.classTiming || 'Timing Not Set'}</span>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                               <Users style={{ width: '16px', height: '16px' }} />
                               <span>{studentList.filter(s => s.course === batch.courseName).length} Enrolled Students</span>
                             </div>
                           </div>
                           
                           <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                              <button onClick={() => { setSelectedBatch(batch); setIsAttendanceModalVisible(true); }} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--blue-600, #2563eb)'}>Take Attendance</button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {attendanceSubTab === 'history' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Attendance History</h3>
                    <div className="w-full overflow-x-auto">
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Batch Name</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Time Slot</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Total Students</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Present</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Absent</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistoryList.map(r => {
                              const today = new Date().toISOString().split('T')[0];
                              const isToday = r.date === today;
                              const editable = isToday && isAttendanceEditable(r.slot);
                              const isExpanded = expandedRowId === r.id;
                              return (
                                <React.Fragment key={r.id}>
                                  <tr onClick={() => setExpandedRowId(isExpanded ? null : r.id)} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: isExpanded ? 'var(--bg-hover)' : 'transparent' }}>
                                    <td style={{ padding: '12px 16px' }}>{r.date}</td>
                                    <td style={{ padding: '12px 16px' }}>{r.batchName}</td>
                                    <td style={{ padding: '12px 16px' }}>{r.slot}</td>
                                    <td style={{ padding: '12px 16px' }}>{r.records?.length || 0}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--green-600, #16a34a)', fontWeight: 'bold' }}>{r.totalPresentees !== undefined ? r.totalPresentees : (r.records?.filter(rec => rec.status === 'P').length || 0)}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--red-600, #dc2626)', fontWeight: 'bold' }}>{r.totalAbsentees !== undefined ? r.totalAbsentees : (r.records?.filter(rec => rec.status === 'A').length || 0)}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                      {editable ? (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const batch = scheduleList.find(b => b.courseName === r.batchName);
                                            if (batch) {
                                              setSelectedBatch(batch);
                                              const newState = {};
                                              if (r.records) {
                                                r.records.forEach(rec => {
                                                  const student = studentList.find(s => s.name === rec.studentName && s.course === batch.courseName);
                                                  if (student) newState[student.id] = rec.status;
                                                });
                                              }
                                              setAttendanceState(newState);
                                              setIsAttendanceModalVisible(true);
                                            } else {
                                              alert("Batch details not found in schedule.");
                                            }
                                          }}
                                          style={{ padding: '6px 12px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                          <Pencil style={{ width: '12px', height: '12px' }} /> Edit
                                        </button>
                                      ) : (
                                        <span style={{ padding: '4px 8px', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Closed</span>
                                      )}
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan="7" style={{ padding: '16px', backgroundColor: 'var(--bg-hover)' }}>
                                        <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                          <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Student Attendance List</h4>
                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                            {r.records && Array.isArray(r.records) ? r.records.map((rec, i) => (
                                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                                <span style={{ fontWeight: '500' }}>{rec.studentName}</span>
                                                {rec.status === 'P' ? (
                                                  <span style={{ color: 'var(--green-600, #16a34a)', backgroundColor: 'var(--green-50, #f0fdf4)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '14px', height: '14px' }} /> Present</span>
                                                ) : (
                                                  <span style={{ color: 'var(--red-600, #dc2626)', backgroundColor: 'var(--red-50, #fef2f2)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle style={{ width: '14px', height: '14px' }} /> Absent</span>
                                                )}
                                              </div>
                                            )) : <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No records found for this batch.</div>}
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 'bold' }}>
                                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--green-500, #22c55e)' }}></div> Total Present: {r.totalPresentees || 0}</span>
                                              <span style={{ color: 'var(--border-color)' }}>|</span>
                                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--red-500, #ef4444)' }}></div> Total Absent: {r.totalAbsentees || 0}</span>
                                            </div>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); downloadAttendanceCSV(r); }} style={{ padding: '8px 16px', backgroundColor: 'var(--indigo-600, #4f46e5)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <Download style={{ width: '16px', height: '16px' }} /> Download Report
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                            {attendanceHistoryList.length === 0 && (
                              <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No attendance history found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === '6' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full mt-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award className="w-5 h-5 text-blue-600" /> Faculty Marks Portal
                </h3>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Select Course</label>
                    <select 
                      className="native-form-select" 
                      value={facultyMarksCourseFilter} 
                      onChange={(e) => {
                        setFacultyMarksCourseFilter(e.target.value);
                        setFacultyMarksFormData({}); // Reset forms when course changes
                      }}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Select a Course --</option>
                      {Array.from(new Set(studentList.map(s => s.course).filter(Boolean))).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Select Exam</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Midterm, Final" 
                      className="native-form-input" 
                      value={facultyMarksGlobalExamName}
                      onChange={(e) => setFacultyMarksGlobalExamName(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {facultyMarksCourseFilter && (() => {
                  const studentsInCourse = studentList.filter(s => s.course === facultyMarksCourseFilter);
                  
                  if (studentsInCourse.length === 0) {
                    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No students found in this course.</div>;
                  }

                  return (
                    <div>
                      <div className="native-table-wrapper" style={{ overflowX: 'auto', marginBottom: '24px' }}>
                        <table className="native-table">
                          <thead>
                            <tr>
                              <th>Student Name</th>
                              <th>Enrollment No</th>
                              <th>Marks Scored</th>
                              <th>Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentsInCourse.map(student => (
                              <tr key={student.id}>
                                <td>{student.name}</td>
                                <td>{student.enrollmentNo || student.enrollmentNumber || 'N/A'}</td>
                                <td>
                                  <input 
                                    type="number" 
                                    placeholder="e.g. 85" 
                                    className="native-form-input" 
                                    style={{ maxWidth: '100px' }}
                                    value={facultyMarksFormData[student.id]?.marks || ''}
                                    onChange={(e) => setFacultyMarksFormData(prev => ({
                                      ...prev, 
                                      [student.id]: { ...prev[student.id], marks: e.target.value }
                                    }))}
                                  />
                                </td>
                                <td>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. A" 
                                    className="native-form-input" 
                                    style={{ maxWidth: '80px' }}
                                    value={facultyMarksFormData[student.id]?.grade || ''}
                                    onChange={(e) => setFacultyMarksFormData(prev => ({
                                      ...prev, 
                                      [student.id]: { ...prev[student.id], grade: e.target.value }
                                    }))}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <button 
                        onClick={async () => {
                          if (!facultyMarksGlobalExamName.trim()) {
                            message.warning('Please enter an Exam Name first.');
                            return;
                          }
                          const entriesToSubmit = Object.entries(facultyMarksFormData).filter(([id, data]) => data.marks && data.grade);
                          if (entriesToSubmit.length === 0) {
                            message.warning('Please fill Marks and Grade for at least one student before submitting.');
                            return;
                          }

                          setSubmittingMarks(true);
                          try {
                            const promises = entriesToSubmit.map(([studentId, data]) => 
                              addStudentMarks(user.organizationId, studentId, facultyMarksGlobalExamName.trim(), Number(data.marks), data.grade, user.organizationAccessId)
                            );
                            await Promise.all(promises);
                            message.success(`Successfully recorded marks for ${entriesToSubmit.length} students!`);
                            setFacultyMarksFormData({}); // clear the form
                            setFacultyMarksGlobalExamName(''); // clear exam name
                          } catch(err) {
                            message.error(err.message);
                          } finally {
                            setSubmittingMarks(false);
                          }
                        }}
                        className="native-form-submit" 
                        disabled={submittingMarks}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '250px' }}
                      >
                        {submittingMarks ? <Clock size={18} /> : <CheckCircle size={18} />} 
                        {submittingMarks ? 'Saving...' : 'Submit Marks'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
      </main>
    
      {isAttendanceModalVisible && selectedBatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', width: '600px', maxWidth: '95%', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>Take Attendance</h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b', display: 'flex', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={16} /> {selectedBatch.courseName}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={16} /> {selectedBatch.classTiming}</span>
                </p>
              </div>
              <button onClick={() => setIsAttendanceModalVisible(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeBatchStudents.map((record) => (
                  <div key={record.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid', borderColor: (attendanceState[record.id] === 'A') ? '#fecaca' : '#e2e8f0', borderRadius: '12px', backgroundColor: (attendanceState[record.id] === 'A') ? '#fef2f2' : '#ffffff', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {record.documents?.profilePhotoUrl || record.photoUrl ? (
                        <img src={record.documents?.profilePhotoUrl || record.photoUrl} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                          {record.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{record.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{record.enrollmentNo || record.id.substring(0,6).toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                      <button onClick={() => setAttendanceState(prev => ({...prev, [record.id]: 'P'}))} style={{ width: '70px', padding: '8px 12px', backgroundColor: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? '#10b981' : 'transparent', color: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? '#ffffff' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none' }}>
                        Present
                      </button>
                      <button onClick={() => setAttendanceState(prev => ({...prev, [record.id]: 'A'}))} style={{ width: '70px', padding: '8px 12px', backgroundColor: attendanceState[record.id] === 'A' ? '#ef4444' : 'transparent', color: attendanceState[record.id] === 'A' ? '#ffffff' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: attendanceState[record.id] === 'A' ? '0 2px 4px rgba(239, 68, 68, 0.2)' : 'none' }}>
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
                {activeBatchStudents.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px 0' }}>
                    <Users size={48} style={{ margin: '0 auto 16px auto', opacity: 0.2 }} />
                    <div style={{ fontSize: '16px' }}>No students enrolled in this batch.</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsAttendanceModalVisible(false)} style={{ padding: '12px 24px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                Cancel
              </button>
              <button onClick={() => handleSubmitAttendance(true)} disabled={submittingAttendance || activeBatchStudents.length === 0} style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (submittingAttendance || activeBatchStudents.length === 0) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }} onMouseOver={(e) => { if (!submittingAttendance && activeBatchStudents.length > 0) e.currentTarget.style.backgroundColor = '#1d4ed8'; }} onMouseOut={(e) => { if (!submittingAttendance && activeBatchStudents.length > 0) e.currentTarget.style.backgroundColor = '#2563eb'; }}>
                Submit Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    {isEditModalVisible && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>Edit Student Profile</h2>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const formData = new FormData(e.target);
            const data = editForm.getFieldsValue(true);
            data.age = formData.get('age') || data.age;
            data.batch = formData.get('batch') || data.batch;
            if (formData.get('status')) data.status = formData.get('status');
            handleEditSubmit(data); 
          }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Full Name</label>
              <input type="text" placeholder="Enter student name" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({name: e.target.value})} defaultValue={editForm.getFieldValue('name')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Email</label>
              <input type="email" placeholder="Enter student email" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({email: e.target.value})} defaultValue={editForm.getFieldValue('email')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Student Phone Number</label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <span style={{ padding: '10px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '6px 0 0 6px', color: 'var(--text-secondary)' }}>+91 (IN)</span>
                <input type="text" placeholder="Student Phone" required style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '0 6px 6px 0', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({phoneNumber: e.target.value})} defaultValue={editForm.getFieldValue('phoneNumber')?.replace('+91', '')} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Age</label>
                    <input type="number" name="age" placeholder="Enter age" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({age: Number(e.target.value)})} defaultValue={editForm.getFieldValue('age')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Batch</label>
                    <input type="text" name="batch" placeholder="Enter batch" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({batch: e.target.value})} defaultValue={editForm.getFieldValue('batch')} />
                  </div>
                </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Enrollment No.</label>
                <input type="text" placeholder="Enrollment Number" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({enrollmentNo: e.target.value})} defaultValue={editForm.getFieldValue('enrollmentNo')} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Course</label>
                <input type="text" placeholder="Course Name" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({course: e.target.value})} defaultValue={editForm.getFieldValue('course')} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Gender</label>
                <select required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({gender: e.target.value})} defaultValue={editForm.getFieldValue('gender')}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Date of Birth</label>
                <input type="date" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({dob: e.target.value})} defaultValue={editForm.getFieldValue('dob')} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Date of Joining</label>
                <input type="date" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({dateOfJoining: e.target.value})} defaultValue={editForm.getFieldValue('dateOfJoining')} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Course Fee</label>
                <input type="number" placeholder="Course Fee" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({courseFee: Number(e.target.value)})} defaultValue={editForm.getFieldValue('courseFee')} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Parent Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <span style={{ padding: '10px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '6px 0 0 6px', color: 'var(--text-secondary)' }}>+91 (IN)</span>
                  <input type="text" placeholder="Parent Phone" style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '0 6px 6px 0', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({parentPhone: e.target.value})} defaultValue={editForm.getFieldValue('parentPhone')?.replace('+91', '')} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Status</label>
                <select name="status" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({status: e.target.value})} defaultValue={editForm.getFieldValue('status') || 'Active'}>
                  <option value="Active">Active</option>
                  <option value="Passed Out">Passed Out</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Drop-out">Drop-out</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsEditModalVisible(false)} style={{ padding: '8px 16px', backgroundColor: 'var(--border-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button type="submit" disabled={editLoading} style={{ padding: '8px 16px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    )}
    
    {isSubmitSummaryModalVisible && (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '450px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green-600, #16a34a)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <CheckCircle2 style={{ width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Attendance Summary</h2>
          </div>
          
          <div style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '16px' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Batch</div>
              <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedBatch?.courseName || 'N/A'}</div>
              
              <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Taken By</div>
              <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{user?.name}</div>
              
              <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Total Absentees</div>
              <div style={{ fontWeight: 'bold', color: 'var(--red-500, #ef4444)', textAlign: 'right', fontSize: '18px' }}>{absenteesList.length}</div>
            </div>
          </div>

          {absenteesList.length > 0 && (
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', maxHeight: '192px', overflowY: 'auto', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)', margin: '0 0 8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Absent Students:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {absenteesList.map(s => (
                  <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold' }}>{s.name}</span>
                    {s.parentPhone ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px' }}>{s.parentPhone}</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--red-500, #ef4444)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>No phone</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <button 
              onClick={handleSendWhatsAppAlerts} 
              disabled={submittingAttendance || absenteesList.length === 0} 
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--green-600, #16a34a)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: (submittingAttendance || absenteesList.length === 0) ? 'not-allowed' : 'pointer', opacity: (submittingAttendance || absenteesList.length === 0) ? 0.5 : 1 }}
            >
              Send WhatsApp Notifications to Parents
            </button>
            <button onClick={() => setIsSubmitSummaryModalVisible(false)} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {isFeeModalVisible && (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="custom-modal-viewport-card modal-flex-layout-group" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Offline Fee Collection - {selectedStudentForFee?.name || ''}</h2>
          <div style={{ textAlign: 'center', margin: '12px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Enter the fee amounts received via different modes.</span>
          </div>
          
          <div style={{ padding: '16px', backgroundColor: 'var(--indigo-50, #eef2ff)', borderRadius: '8px', border: '1px solid var(--indigo-100, #e0e7ff)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              {logoUrl && <img src={logoUrl} alt="Org Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />}
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--indigo-900, #312e81)' }}>{user?.organizationName}</div>
            </div>
            <div style={{ fontSize: '16px', color: 'var(--indigo-700, #4338ca)' }}>Course: {selectedStudentForFee?.course || 'N/A'}</div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleFeeSubmit(feeForm.getFieldsValue()); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Bill ID / Receipt Number</label>
              <input type="text" placeholder="Enter manual Bill ID" required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', boxSizing: 'border-box' }} onChange={(e) => feeForm.setFieldsValue({billNumber: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Payment Date</label>
              <input type="date" required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => feeForm.setFieldsValue({paymentDate: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Payment Time</label>
              <input type="time" required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => feeForm.setFieldsValue({paymentTime: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Cash Amount</label>
              <input type="number" min="0" defaultValue="0" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => feeForm.setFieldsValue({cashAmount: Number(e.target.value)})} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>UPI/GPay Amount</label>
              <input type="number" min="0" defaultValue="0" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => feeForm.setFieldsValue({upiAmount: Number(e.target.value)})} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Card Amount</label>
              <input type="number" min="0" defaultValue="0" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => feeForm.setFieldsValue({cardAmount: Number(e.target.value)})} />
            </div>
            
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Total Paid = Cash + UPI + Card</span>
              <span>₹ {totalFeePaid}</span>
            </div>
            
            <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-hover)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Cashier Authentication</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 {user?.documents?.signatureUrl || user?.signatureUrl ? (
                   <img src={user?.documents?.signatureUrl || user?.signatureUrl} alt="Signature" style={{ height: '48px', objectFit: 'contain' }} />
                 ) : (
                   <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '0 16px', fontSize: '14px', fontStyle: 'italic' }}>
                     [Digital Signature Not Uploaded]
                   </div>
                 )}
                 <div style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', color: 'var(--text-secondary)' }}>
                   <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{user?.name}</span>
                   <span style={{ fontSize: '12px' }}>Authorized Cashier</span>
                 </div>
              </div>
            </div>

            {isBillUploadEnabled && (
              <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-hover)' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Upload Manual Soft-Copy Receipt (Optional Image)</label>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--card-bg)' }}>
                   <input type="file" accept="image/*" onChange={async (e) => { 
                     if(e.target.files && e.target.files.length > 0) { 
                       feeForm.setFieldsValue({receiptFile: e.target.files[0]}); 
                       try {
                         await logTransaction('UPLOAD_BILL_DOCUMENT', {
                           token: '[Aadhaar Redacted]',
                           studentId: selectedStudentForFee?.id,
                           staffId: user?.id,
                           staffName: user?.name
                         });
                       } catch(err) {}
                     } 
                   }} style={{ display: 'none' }} id="bill-upload-input" />
                   <label htmlFor="bill-upload-input" style={{ cursor: 'pointer', color: 'var(--blue-500, #3b82f6)' }}>
                     <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                     Click here to select file
                   </label>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Remarks (Optional)</label>
              <textarea rows={3} placeholder="Enter any transaction notes" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => feeForm.setFieldsValue({remarks: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsFeeModalVisible(false)} style={{ padding: '8px 16px', backgroundColor: 'var(--border-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button type="submit" disabled={loading} style={{ padding: '8px 16px', backgroundColor: 'var(--green-600, #16a34a)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Record Payment</button>
            </div>
          </form>
        </div>
      </div>
    )}


      {globalSearchModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{globalSearchAction === 'edit' ? 'Edit Student Record' : 'Delete Student Record'}</h2>
              <button onClick={() => { setGlobalSearchModalVisible(false); setGlobalSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><XCircle /></button>
            </div>
            
            <div className="search-bar-wrapper" style={{ marginBottom: '24px' }}>
              <Search className="search-bar-icon" />
              <input 
                className="search-bar-input"
                type="text" 
                placeholder="Search by Name, Enrollment ID, or Mobile..." 
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid var(--border-color)', borderRadius: '8px', boxSizing: 'border-box', fontSize: '15px' }}
                autoFocus
              />
            </div>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {globalSearchQuery.trim() === '' ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>Start typing to search for a student...</div>
              ) : (
                studentList.filter(s => {
                  const q = globalSearchQuery.toLowerCase();
                  return (s.name || '').toLowerCase().includes(q) || 
                         (s.enrollmentNo || '').toLowerCase().includes(q) || 
                         (s.phoneNumber || '').includes(q);
                }).map(student => (
                  <div 
                    key={student.id} 
                    style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                       setGlobalSearchModalVisible(false);
                       setGlobalSearchQuery('');
                       if (globalSearchAction === 'edit') {
                          setEditingStudent(student);
                          editForm.setFieldsValue({ 
                            ...student, 
                            dateOfJoining: student.dateOfJoining || (student.createdAt ? new Date(student.createdAt.seconds * 1000).toISOString().split('T')[0] : '') 
                          });
                          setIsEditModalVisible(true);
                       } else if (globalSearchAction === 'delete') {
                          message.error("Please use Admin Dashboard to delete students.");
                       }
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '15px' }}>{student.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ID: {student.enrollmentNo || student.id.substring(0,6)} | Mob: {student.phoneNumber}</div>
                    </div>
                    <div style={{ padding: '6px 12px', backgroundColor: globalSearchAction === 'edit' ? 'var(--blue-500, #3b82f6)' : 'var(--red-500, #ef4444)', color: '#fff', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      {globalSearchAction === 'edit' ? 'Edit' : 'Delete'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}



    </div>
  );
};

export default StaffDashboard;
