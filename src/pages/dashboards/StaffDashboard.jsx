import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createStudent, logoutUser, getOrganizationStudents, subscribeToOrganizationStudents, deleteUserDoc, updateUserDoc, getStaffAssignments, subscribeToStaffAssignments, updateCourseAssignment, getOrganizationDetails, saveAttendanceHistory, getAttendanceHistoryByFaculty, createReceipt, listenToOrganizationStatus, logTransaction, getOrganizationCourses, addStudentMarks, uploadCourseMaterial, addDynamicStudentMarks, getCourseMaterialsForStaff, deleteCourseMaterial, updateCourseMaterial } from '../../firebase/services';
import { LogOut, Calendar as CalendarIcon, Clock, Users, BookOpen, ChevronRight, Upload as UploadIcon, FileText, ClipboardList, Pencil, Download, CheckCircle, XCircle, GraduationCap, UploadCloud, FileSpreadsheet, Calendar, Video, ArrowLeft, Mic, MicOff, Monitor, Paperclip, CheckCircle2, Trash2, ChevronDown, UserCheck, AlertCircle, Banknote, Search, Award, Filter, ArrowDownUp, Moon, Bell, X, Eye, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
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

const CustomPagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '8px 0' }}>
      <button 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: currentPage === 1 ? 'var(--bg-hover)' : 'var(--card-bg)',
          color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-main)',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
      >
        &lt;
      </button>
      <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', margin: '0 8px' }}>
        {currentPage} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>of {totalPages}</span>
      </span>
      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          backgroundColor: currentPage === totalPages ? 'var(--bg-hover)' : 'var(--card-bg)',
          color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-main)',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
      >
        &gt;
      </button>
    </div>
  );
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
  const [scheduleTab, setScheduleTab] = useState('ongoing');
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
  const [studentManagementTab, setStudentManagementTab] = useState('active');
  const [studentSortOrder, setStudentSortOrder] = useState('');
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentCourseFilter, setStudentCourseFilter] = useState('All');
  const [studentAgeFilter, setStudentAgeFilter] = useState('All');
  
  // Marks Portal State
  const [facultyMarksCourseFilter, setFacultyMarksCourseFilter] = useState('');
  const [facultyMarksGlobalExamName, setFacultyMarksGlobalExamName] = useState('');
  const [facultyMarksFormData, setFacultyMarksFormData] = useState({});
  const [submittingMarks, setSubmittingMarks] = useState(false);
  
  // Enhanced Marks Portal specific
  const [examSubjects, setExamSubjects] = useState([{ name: '', maxMarks: 100 }]);
  const [examDate, setExamDate] = useState('');
  const [isMarksDetailsModalVisible, setIsMarksDetailsModalVisible] = useState(false);
  const [isViewMarksModalVisible, setIsViewMarksModalVisible] = useState(false);
  const [selectedStudentForViewMarks, setSelectedStudentForViewMarks] = useState(null);
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [selectedStudentForVerification, setSelectedStudentForVerification] = useState(null);
  const [verificationTab, setVerificationTab] = useState('photo');
  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState(null);

  // Course Materials State
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [materialCourseFilter, setMaterialCourseFilter] = useState('');
  const [materialSelectedStudents, setMaterialSelectedStudents] = useState([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [staffMaterials, setStaffMaterials] = useState([]);
  const [materialTab, setMaterialTab] = useState('upload');
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [isEditMaterialModalVisible, setIsEditMaterialModalVisible] = useState(false);
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

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
      const searchVal = (globalSearchQuery || studentTextSearch || '').toLowerCase();
      const matchSearch = (s.name || '').toLowerCase().includes(searchVal) || 
                          (s.enrollmentNo || '').toLowerCase().includes(searchVal);
      const matchCourse = studentCourseFilter === 'All' || s.course === studentCourseFilter;
      const bucket = getAgeBucket(s.dob);
      const matchAge = studentAgeFilter === 'All' || bucket === studentAgeFilter;
      return matchSearch && matchCourse && matchAge;
    });
  };
  const [attendanceState, setAttendanceState] = useState({});
  const [sessionTopics, setSessionTopics] = useState('');
  const [isSubmitSummaryModalVisible, setIsSubmitSummaryModalVisible] = useState(false);
  const [absenteesList, setAbsenteesList] = useState([]);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('org_logo') || null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [attendanceHistoryList, setAttendanceHistoryList] = useState([]);
  
  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState(null);
  const [isAttendanceDetailsModalVisible, setIsAttendanceDetailsModalVisible] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'my_lms_preset');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'rdor42ow'}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.secure_url) {
        await updateUserDoc(user.id, { photoUrl: data.secure_url });
        const updatedUser = { ...user, photoUrl: data.secure_url };
        localStorage.setItem('lms_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      message.error('Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
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
        sessionTopics: sessionTopics,
        isFinal: true
      });
      
      setSessionTopics('');
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

  let unsubscribeStudents = null;
  let unsubscribeAssignments = null;

  const fetchStudents = async () => {
    if (!user?.organizationId) return;
    try {
      setLoading(true);
      const [orgDetails, courses] = await Promise.all([
        getOrganizationDetails(user.organizationId),
        getOrganizationCourses(user.organizationId)
      ]);
      setCourseList(courses || []);
      
      if (orgDetails.logoUrl) {
        setLogoUrl(orgDetails.logoUrl);
        localStorage.setItem('org_logo', orgDetails.logoUrl);
      } else {
        setLogoUrl(null);
        localStorage.removeItem('org_logo');
      }

      if (unsubscribeStudents) unsubscribeStudents();
      unsubscribeStudents = subscribeToOrganizationStudents(user.organizationId, (studentsData) => {
        setStudentList(studentsData);
        setLoading(false);
      });

      if (unsubscribeAssignments) unsubscribeAssignments();
      unsubscribeAssignments = subscribeToStaffAssignments(user.organizationId, user.id, (assignments) => {
        setScheduleList(assignments);
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAttendanceHistory();
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    return () => {
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeAssignments) unsubscribeAssignments();
    };
  }, [user?.organizationId]);

  useEffect(() => {
    if (activeTab === '7' && user?.id) {
      getCourseMaterialsForStaff(user.id).then(setStaffMaterials).catch(console.error);
    }
  }, [activeTab, user?.id]);

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
    <div className="uxer-layout">
      {/* Sidebar Navigation */}
      <aside className="uxer-sidebar">
        <div className="uxer-sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
          {logoUrl ? <img src={logoUrl} alt="Org Logo" style={{ maxHeight: '32px', maxWidth: '32px', objectFit: 'contain' }} /> : <div className="logo-icon"></div>}
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#111111', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.organizationName || 'Faculty Portal'}</span>
        </div>
        
        <div className="uxer-sidebar-menu">
          <div className="uxer-sidebar-category">MAIN MENU</div>
          <div onClick={() => setActiveTab('3')} className={`uxer-sidebar-item ${activeTab === '3' ? 'active' : ''}`}><Users style={{ width: '20px', height: '20px' }} /> Manage Students</div>
          <div onClick={() => setActiveTab('4')} className={`uxer-sidebar-item ${activeTab === '4' ? 'active' : ''}`}><Calendar style={{ width: '20px', height: '20px' }} /> My Schedule</div>
          <div onClick={() => setActiveTab('5')} className={`uxer-sidebar-item ${activeTab === '5' ? 'active' : ''}`}><ClipboardList style={{ width: '20px', height: '20px' }} /> Attendance Management</div>
          <div onClick={() => setActiveTab('6')} className={`uxer-sidebar-item ${activeTab === '6' ? 'active' : ''}`}><Award style={{ width: '20px', height: '20px' }} /> Marks Portal</div>
          <div onClick={() => setActiveTab('7')} className={`uxer-sidebar-item ${activeTab === '7' ? 'active' : ''}`}><BookOpen style={{ width: '20px', height: '20px' }} /> Course Materials</div>
        </div>

        {/* Sidebar Bottom Profile Widget */}
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: 'auto -12px -20px -12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={avatarInputRef} onChange={handleAvatarUpload} />
            {user?.documents?.profilePhotoUrl || user?.photoUrl ? (
              <img onClick={() => avatarInputRef.current?.click()} src={user?.documents?.profilePhotoUrl || user?.photoUrl} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0, opacity: uploadingAvatar ? 0.5 : 1, backgroundColor: 'var(--bg-hover)', cursor: 'pointer' }} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            ) : (
              <div onClick={() => avatarInputRef.current?.click()} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b', fontWeight: 'bold', border: '1px solid var(--border-color)', flexShrink: 0, opacity: uploadingAvatar ? 0.5 : 1, cursor: 'pointer' }}>
                {uploadingAvatar ? <Clock style={{ width: '16px', height: '16px' }} /> : (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name || 'Staff'}</span>
                <button 
                  onClick={() => {
                    setNewStaffName(user?.name || '');
                    setIsEditNameModalVisible(true);
                  }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--slate-400)', transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--blue-600)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--slate-400)'}
                  title="Edit Display Name"
                >
                  <Pencil size={12} />
                </button>
              </div>
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
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111', margin: 0 }}>Faculty Portal</h1>
          </div>
          <div className="uxer-header-right">
            <div className="uxer-search">
              <Search style={{ width: '16px', height: '16px', color: '#999', flexShrink: 0 }} />
              <input 
                type="text" 
                placeholder="Search" 
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
              />
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
                <span style={{ fontSize: '14px', color: '#64748b' }}>{selectedStudentForProfile?.course || 'No Course'}</span>
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
                  <span style={{ color: '#64748b', fontSize: '14px', backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '12px' }}>Pending Upload</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: 'var(--slate-800, #1e293b)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }} onClick={() => setIsProfileModalVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isMarksDetailsModalVisible && selectedStudentForMarks && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '800px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Enter Marks for {selectedStudentForMarks.name}</h2>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Exam Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Midterm, Final" 
                  className="native-form-input" 
                  value={facultyMarksGlobalExamName}
                  onChange={(e) => setFacultyMarksGlobalExamName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Exam Date</label>
                <input 
                  type="date" 
                  className="native-form-input" 
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-hover)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Subjects</h4>
              {examSubjects.map((subject, index) => (
                <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Subject Name</label>
                    <input 
                      type="text" 
                      placeholder="Subject Name" 
                      className="native-form-input"
                      value={subject.name}
                      onChange={(e) => {
                        const newSubjects = [...examSubjects];
                        newSubjects[index].name = e.target.value;
                        setExamSubjects(newSubjects);
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Total Marks</label>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="native-form-input"
                      value={subject.maxMarks}
                      onChange={(e) => {
                        const newSubjects = [...examSubjects];
                        newSubjects[index].maxMarks = Number(e.target.value);
                        if (Number(newSubjects[index].obtained) > newSubjects[index].maxMarks) {
                          newSubjects[index].obtained = newSubjects[index].maxMarks;
                        }
                        setExamSubjects(newSubjects);
                      }}
                      style={{ width: '100px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Marks Obtained</label>
                    <input 
                      type="number" 
                      placeholder="Obtained" 
                      className="native-form-input"
                      max={subject.maxMarks}
                      value={subject.obtained}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (val > subject.maxMarks) val = subject.maxMarks;
                        const newSubjects = [...examSubjects];
                        newSubjects[index].obtained = val;
                        setExamSubjects(newSubjects);
                      }}
                      style={{ width: '120px' }}
                    />
                  </div>
                  {index > 0 && (
                    <button onClick={() => setExamSubjects(examSubjects.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', paddingBottom: '10px' }}><Trash2 size={20} /></button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setExamSubjects([...examSubjects, { name: '', maxMarks: 100, obtained: '' }])}
                style={{ padding: '6px 12px', background: 'var(--border-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >+ Add Subject</button>
            </div>

            {(() => {
              const totalMax = examSubjects.reduce((acc, sub) => acc + (Number(sub.maxMarks) || 0), 0);
              const totalObtained = examSubjects.reduce((acc, sub) => acc + (Number(sub.obtained) || 0), 0);
              const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--indigo-50, #eef2ff)', borderRadius: '6px', fontWeight: 'bold' }}>
                  <span>Total: {totalObtained} / {totalMax}</span>
                  <span>Percentage: {percentage}%</span>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: 'var(--slate-800, #1e293b)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }} onClick={() => setIsMarksDetailsModalVisible(false)}>Cancel</button>
              <button 
                disabled={submittingMarks}
                onClick={async () => {
                  if (!facultyMarksGlobalExamName.trim() || !examDate) {
                    message.warning('Please enter an Exam Name and Date.');
                    return;
                  }
                  setSubmittingMarks(true);
                  try {
                    const totalMaxMarks = examSubjects.reduce((acc, sub) => acc + (Number(sub.maxMarks) || 0), 0);
                    const totalObtained = examSubjects.reduce((acc, sub) => acc + (Number(sub.obtained) || 0), 0);
                    const percentage = totalMaxMarks > 0 ? ((totalObtained / totalMaxMarks) * 100).toFixed(1) : 0;
                    
                    let autoGrade = 'F';
                    if (percentage >= 90) autoGrade = 'A+';
                    else if (percentage >= 80) autoGrade = 'A';
                    else if (percentage >= 70) autoGrade = 'B';
                    else if (percentage >= 60) autoGrade = 'C';
                    else if (percentage >= 50) autoGrade = 'D';

                    const examRecord = {
                      examName: facultyMarksGlobalExamName.trim(),
                      examDate: examDate,
                      subjects: examSubjects.map((sub, i) => ({
                        name: sub.name || `Subject ${i+1}`,
                        maxMarks: Number(sub.maxMarks) || 100,
                        obtained: Number(sub.obtained) || 0
                      })),
                      totalMaxMarks: totalMaxMarks,
                      totalObtainedMarks: totalObtained,
                      percentage: Number(percentage),
                      grade: autoGrade,
                      enteredBy: user?.name || 'Staff',
                      staffRole: user?.role || 'staff',
                      subjectHandled: user?.course || 'General',
                      uploadedDate: new Date().toISOString()
                    };

                    await addDynamicStudentMarks(selectedStudentForMarks.id, examRecord);
                    setStudentList(prevList => prevList.map(s => {
                      if (s.id === selectedStudentForMarks.id) {
                        return { ...s, examHistory: [...(s.examHistory || []), examRecord] };
                      }
                      return s;
                    }));
                    message.success('Marks recorded successfully!');
                    setIsMarksDetailsModalVisible(false);
                  } catch(err) {
                    message.error(err.message);
                  } finally {
                    setSubmittingMarks(false);
                  }
                }}
                style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {submittingMarks ? <Clock size={18} /> : <CheckCircle size={18} />} 
                {submittingMarks ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isAddStudentModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="saas-v3-modal-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
                  <input type="text" placeholder="Student Phone" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 10) val = val.slice(0, 10);
                    e.target.value = val;
                    studentForm.setFieldsValue({phoneNumber: val});
                    if (!/^[6-9]\d{9}$/.test(val)) {
                      e.target.setCustomValidity('Please enter a valid 10-digit mobile number');
                    } else {
                      e.target.setCustomValidity('');
                    }
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Parent Phone Number</label>
                  <input type="text" placeholder="Parent Phone" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 10) val = val.slice(0, 10);
                    e.target.value = val;
                    studentForm.setFieldsValue({parentPhone: val});
                    if (val && !/^[6-9]\d{9}$/.test(val)) {
                      e.target.setCustomValidity('Please enter a valid 10-digit mobile number');
                    } else {
                      e.target.setCustomValidity('');
                    }
                  }} />
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
                  <input type="email" placeholder="Enter student email" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => {
                    studentForm.setFieldsValue({email: e.target.value});
                    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(e.target.value)) {
                      e.target.setCustomValidity('Please enter a valid Email address');
                    } else {
                      e.target.setCustomValidity('');
                    }
                  }} />
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
                  <div style={{ width: '100%', padding: '24px', backgroundColor: '#ffffff', border: '2px dashed var(--border-color)', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  <div style={{ width: '100%', marginBottom: '24px' }}>
                    {(() => {
                      const filteredListForStats = filteredStudentList(studentList);
                      return (
                        <div className="uxer-stats-grid">
                          <div className="uxer-stat-card">
                            <div className="uxer-stat-title">TOTAL STUDENTS</div>
                            <div className="uxer-stat-content">
                              <div className="uxer-stat-value">{filteredListForStats.length}</div>
                              <div className="uxer-stat-badge">
                                <div className="uxer-stat-badge-pill green"><TrendingUp className="w-3 h-3" style={{marginRight: '2px'}}/>+12%</div>
                                <span className="uxer-stat-badge-text">from last week</span>
                              </div>
                            </div>
                          </div>
                          <div className="uxer-stat-card">
                            <div className="uxer-stat-title">ACTIVE STUDENTS</div>
                            <div className="uxer-stat-content">
                              <div className="uxer-stat-value">{filteredListForStats.filter(s => (s.currentStatus || 'Active') === 'Active').length}</div>
                              <div className="uxer-stat-badge">
                                <div className="uxer-stat-badge-pill green"><TrendingUp className="w-3 h-3" style={{marginRight: '2px'}}/>+5%</div>
                                <span className="uxer-stat-badge-text">from last week</span>
                              </div>
                            </div>
                          </div>
                          <div className="uxer-stat-card">
                            <div className="uxer-stat-title">DROP-OUTS</div>
                            <div className="uxer-stat-content">
                              <div className="uxer-stat-value">{filteredListForStats.filter(s => s.currentStatus === 'Drop-out').length}</div>
                              <div className="uxer-stat-badge">
                                <div className="uxer-stat-badge-pill red"><TrendingDown className="w-3 h-3" style={{marginRight: '2px'}}/>-2%</div>
                                <span className="uxer-stat-badge-text">from last week</span>
                              </div>
                            </div>
                          </div>
                          <div className="uxer-stat-card">
                            <div className="uxer-stat-title">INACTIVE</div>
                            <div className="uxer-stat-content">
                              <div className="uxer-stat-value">{filteredListForStats.filter(s => s.currentStatus === 'Inactive').length}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Toolbar: tabs + actions */}
                  <div className="uxer-toolbar" style={{ marginBottom: '16px' }}>
                    <div className="uxer-tabs">
                      <div
                        className={`uxer-tab ${(studentManagementTab === 'active' || !studentManagementTab) ? 'active' : ''}`}
                        onClick={() => setStudentManagementTab('active')}
                      >All</div>
                      <div
                        className={`uxer-tab ${studentManagementTab === 'only-active' ? 'active' : ''}`}
                        onClick={() => setStudentManagementTab('only-active')}
                      >Active</div>
                      <div
                        className={`uxer-tab ${studentManagementTab === 'inactive' ? 'active' : ''}`}
                        onClick={() => setStudentManagementTab('inactive')}
                      >Inactive</div>
                      <div
                        className={`uxer-tab ${studentManagementTab === 'dropout' ? 'active' : ''}`}
                        onClick={() => setStudentManagementTab('dropout')}
                      >Drop-Outs</div>
                    </div>
                    <div className="uxer-actions">
                      <select
                        className="uxer-action-btn"
                        value={studentCourseFilter}
                        onChange={(e) => setStudentCourseFilter(e.target.value)}
                        style={{ background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                      >
                        <option value="All">All Courses</option>
                        {courseList.map(c => <option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>)}
                      </select>
                      <button 
                        className="uxer-action-btn"
                        onClick={() => setStudentSortOrder(prev => prev === 'A-Z' ? '' : 'A-Z')}
                      >
                        <TrendingUp className="w-4 h-4" style={{ marginRight: '6px' }} /> 
                        {studentSortOrder === 'A-Z' ? 'Sort: A-Z' : 'Sort'}
                      </button>
                      <button className="uxer-btn-green" onClick={() => setAddStudentTab('choice')}>+ New Student</button>
                    </div>
                  </div>

                  {/* Student Table Card */}
                  {(() => {
                    let list = studentList;
                    if (studentManagementTab === 'only-active') list = list.filter(s => (s.currentStatus || 'Active') === 'Active');
                    else if (studentManagementTab === 'inactive') list = list.filter(s => s.currentStatus === 'Inactive');
                    else if (studentManagementTab === 'dropout') list = list.filter(s => s.currentStatus === 'Drop-out');
                    const filtered = filteredStudentList(list);
                    if (studentSortOrder === 'A-Z') {
                      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    }
                    const totalRecords = filtered.length;
                    const totalPages = Math.ceil(totalRecords / 20);
                    const startIndex = (studentCurrentPage - 1) * 20;
                    const currentRecords = filtered.slice(startIndex, startIndex + 20);
                    
                    return (
                      <div className="uxer-table-card">
                        <table className="uxer-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Course</th>
                              <th>Batch</th>
                              <th>Phone</th>
                              <th>Status</th>
                              <th>Verification</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentRecords.length === 0 ? (
                              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No students found.</td></tr>
                            ) : (
                              currentRecords.map((s, i) => {
                                const initials = (s.name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                const status = s.currentStatus || 'Active';
                                const statusClass = status === 'Active' ? 'active' : status === 'Inactive' ? 'inactive' : 'dropout';
                                const statusLabel = status === 'Drop-out' ? 'Drop-Out' : status;
                                return (
                                  <tr key={s.id || i}>
                                    <td>
                                      <div className="uxer-student-cell">
                                        <div className="uxer-avatar">{initials}</div>
                                        <span className="uxer-student-name">{s.name || 'Unknown'}</span>
                                      </div>
                                    </td>
                                    <td>{s.course || '-'}</td>
                                    <td>{s.batch || '-'}</td>
                                    <td>{s.phoneNumber || s.parentPhone || '-'}</td>
                                    <td><span className={`uxer-status-pill ${statusClass}`}>{statusLabel}</span></td>
                                    <td>
                                      {(s?.studentPhotoUrl || s?.identityDocUrl || s?.documents?.idProofUrl) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Uploaded</span>
                                          <button 
                                            onClick={() => { setSelectedStudentForVerification(s); setIsVerificationModalVisible(true); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue-600)', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                                          >
                                            <ExternalLink size={12} /> View
                                          </button>
                                        </div>
                                      ) : (
                                        <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Pending</span>
                                      )}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '16px' }}>
                                        <button
                                          onClick={() => { setSelectedStudentForProfile(s); setIsProfileModalVisible(true); }}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                                          title="View History"
                                        ><Eye size={18} /></button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                        <CustomPagination 
                          currentPage={studentCurrentPage} 
                          totalItems={totalRecords} 
                          itemsPerPage={20} 
                          onPageChange={setStudentCurrentPage} 
                        />
                      </div>
                    );
                  })()}

                  {/* Choice Modal for New Student */}
                  {addStudentTab === 'choice' && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="custom-modal-viewport-card" style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                        <button onClick={() => setAddStudentTab('single')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'absolute', top: '16px', right: '16px', color: '#64748b' }}><X size={20}/></button>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }}>Add Student</h2>
                        <button onClick={() => { setAddStudentTab('single'); setIsAddStudentModalVisible(true); }} className="uxer-btn-green" style={{ width: '100%', padding: '12px', fontSize: '16px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <UserCheck size={20} /> Add Single Student
                        </button>
                        <button onClick={() => { setAddStudentTab('bulk'); }} className="uxer-dropdown-btn" style={{ width: '100%', padding: '12px', fontSize: '16px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                           <UploadCloud size={20} /> Bulk Import (CSV/Excel)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bulk Import UI Modal */}
                  {addStudentTab === 'bulk' && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="custom-modal-viewport-card" style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', width: '600px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                         <button onClick={() => setAddStudentTab('single')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'absolute', top: '16px', right: '16px', color: '#64748b' }}><X size={20}/></button>
                         <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }}>Bulk Import Students</h2>
                         <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-indigo-800 text-sm text-center shadow-sm">
                            <strong>Instructions:</strong> Please upload a CSV file with columns <code>Name</code>, <code>Email</code>, <code>Gender</code>, <code>DOB</code>, <code>DateOfJoining</code>, <code>EnrollmentNo</code>, <code>Course</code>, <code>CourseFee</code>, <code>StudentPhone</code>, <code>ParentPhone</code>, <code>Status</code>.
                         </div>
                         <div className="w-full flex flex-col items-center gap-4">
                           <div className="w-full p-10 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all shadow-sm text-center" style={{ cursor: 'pointer' }}>
                             <UploadCloud className="w-14 h-14 text-indigo-500 mx-auto mb-4" />
                             <p className="text-xl font-semibold text-slate-700">Click or drag CSV file to this area to upload</p>
                             <p className="text-slate-500 mt-3 text-base">Strictly single CSV file upload.</p>
                           </div>
                         </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {activeTab === '4' && (
                <div className="w-full flex flex-col gap-6">
                  <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-4">
                    <h3 className="text-xl font-bold m-0" style={{ color: 'var(--text-main)' }}>My Batch & Course Schedule</h3>
                    <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-hover)', padding: '4px', borderRadius: '8px' }}>
                      <button 
                        onClick={() => setScheduleTab('ongoing')}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '14px', backgroundColor: scheduleTab === 'ongoing' ? 'var(--card-bg)' : 'transparent', color: scheduleTab === 'ongoing' ? 'var(--text-main)' : 'var(--text-secondary)', boxShadow: scheduleTab === 'ongoing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                      >
                        Assigned Classes (Ongoing)
                      </button>
                      <button 
                        onClick={() => setScheduleTab('history')}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '14px', backgroundColor: scheduleTab === 'history' ? 'var(--card-bg)' : 'transparent', color: scheduleTab === 'history' ? 'var(--text-main)' : 'var(--text-secondary)', boxShadow: scheduleTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                      >
                        History of Assigned Classes
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                     {(() => {
                       const currentDate = new Date();
                       
                       const filteredList = scheduleList.filter(batch => {
                         const searchVal = (globalSearchQuery || '').toLowerCase();
                         if (searchVal && !(batch.courseName || '').toLowerCase().includes(searchVal) &&
                                !(batch.classTiming || '').toLowerCase().includes(searchVal) &&
                                !(batch.startDate || '').toLowerCase().includes(searchVal)) {
                            return false;
                         }
                         
                         const endDate = new Date(batch.endDate);
                         endDate.setHours(23, 59, 59, 999);
                         
                         if (scheduleTab === 'ongoing') {
                           return currentDate <= endDate;
                         } else {
                           return currentDate > endDate;
                         }
                       });
                       
                       if (filteredList.length === 0) {
                         return (
                           <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)', gridColumn: '1 / -1' }}>
                              <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>
                                {scheduleTab === 'ongoing' ? 'No ongoing classes assigned to your schedule.' : 'No history of completed classes.'}
                              </p>
                           </div>
                         );
                       }
                       
                       return filteredList.map(batch => {
                         const isCompleted = scheduleTab === 'history';
                         return (
                           <div key={batch.id} 
                                onClick={() => setSelectedBatch(batch)}
                                className={isCompleted ? "completed-course-card" : ""}
                                style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
                           >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-royal-purple)' }}>{batch.courseName}</h4>
                                {isCompleted ? (
                                  <div className="completed-course-badge">Completed Class</div>
                                ) : (
                                  <div style={{ backgroundColor: 'var(--indigo-50, #eef2ff)', color: 'var(--indigo-600, #4f46e5)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Ongoing Class</div>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                                  <Clock style={{ width: '16px', height: '16px' }} />
                                  <span>{batch.classTiming || 'Timing Not Set'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                                  <CalendarIcon style={{ width: '16px', height: '16px' }} />
                                  <span>{batch.startDate} to {batch.endDate}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                                  <Users style={{ width: '16px', height: '16px' }} />
                                  <span>{studentList.filter(s => s.course === batch.courseName).length} Assigned Students</span>
                                </div>
                              </div>
                              
                              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                 <button style={{ width: '100%', padding: '10px', backgroundColor: isCompleted ? 'transparent' : 'var(--theme-bg-premium)', color: isCompleted ? '#4b5563' : 'var(--text-main)', border: isCompleted ? '1px solid #d1d5db' : '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>View Details & Attendance</button>
                              </div>
                           </div>
                         );
                       });
                     })()}
                  </div>

                  {/* Context Overlay Modal for Selected Batch */}
                  {selectedBatch && (() => {
                    const isBatchCompleted = selectedBatch.status === 'Completed' || new Date() > new Date(selectedBatch.endDate);
                    return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30, 41, 59, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1000 }}>
                      <div style={{ width: '450px', maxWidth: '100%', height: '100%', backgroundColor: 'var(--panel-solid-white)', padding: '20px', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary-crisp)' }}>{isBatchCompleted ? 'Class Overview' : 'Class Context'}</h3>
                          <button onClick={() => setSelectedBatch(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted-gray)' }}><XCircle /></button>
                        </div>
                        
                        <div style={{ backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-royal-purple)', fontSize: '18px', fontWeight: 'bold' }}>{selectedBatch.courseName}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted-gray)', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarIcon style={{ width: '16px', height: '16px' }} /> {selectedBatch.startDate} to {selectedBatch.endDate}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted-gray)', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock style={{ width: '16px', height: '16px' }} /> {selectedBatch.classTiming}</div>
                          </div>
                        </div>

                        {isBatchCompleted && (
                          <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '12px', marginBottom: '24px', borderRadius: '8px', color: '#991b1b', fontSize: '14px', fontWeight: '600' }}>
                            Class Completed - Attendance Locked
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary-crisp)' }}>Attendance Framework</h4>
                          {(!activeBatchEditable || isBatchCompleted) && <span style={{ padding: '4px 8px', backgroundColor: 'var(--danger-vibrant)', color: '#fff', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>LOCKED</span>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                          {activeBatchStudents.map((record) => (
                            <div key={record.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: (activeBatchEditable && !isBatchCompleted) ? 'pointer' : 'default', backgroundColor: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? 'var(--panel-solid-white)' : 'rgba(239, 68, 68, 0.05)' }} onClick={() => (activeBatchEditable && !isBatchCompleted) && toggleAttendance(record.id)}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--accent-royal-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                {record.name?.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: 'var(--text-primary-crisp)' }}>{record.name}</div>
                              <div>
                                <button style={{ width: '36px', padding: '6px', backgroundColor: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? 'var(--success-vibrant, #10b981)' : 'var(--bg-hover)', color: (attendanceState[record.id] === 'P' || !attendanceState[record.id]) ? '#fff' : '#64748b', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  P
                                </button>
                                <button style={{ width: '36px', padding: '6px', marginLeft: '8px', backgroundColor: attendanceState[record.id] === 'A' ? 'var(--danger-vibrant, #ef4444)' : 'var(--bg-hover)', color: attendanceState[record.id] === 'A' ? '#fff' : '#64748b', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  A
                                </button>
                              </div>
                            </div>
                          ))}
                          {activeBatchStudents.length === 0 && (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted-gray)' }}>No students enrolled.</div>
                          )}
                        </div>
                        
                        {activeBatchStudents.length > 0 && (
                          <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Session Topics Covered / Class Notes</label>
                            <textarea
                              value={sessionTopics}
                              onChange={(e) => setSessionTopics(e.target.value)}
                              disabled={!activeBatchEditable || isBatchCompleted}
                              placeholder="Enter what topics were discussed, chapters covered, or general class notes here..."
                              style={{ width: '100%', minHeight: '100px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit', backgroundColor: (!activeBatchEditable || isBatchCompleted) ? 'var(--bg-hover)' : '#fff' }}
                            ></textarea>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {(!isBatchCompleted && activeBatchEditable) && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleSubmitAttendance(false)} disabled={submittingAttendance} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--text-primary-crisp)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', cursor: submittingAttendance ? 'not-allowed' : 'pointer' }}>
                                Save as Draft
                              </button>
                              <button onClick={() => handleSubmitAttendance(true)} disabled={submittingAttendance} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--accent-royal-purple)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: submittingAttendance ? 'not-allowed' : 'pointer' }}>
                                Submit Final
                              </button>
                            </div>
                          )}
                          <button onClick={() => {}} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Download Report
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })()}
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

                {attendanceSubTab === 'daily' && (() => {
                  const todayStr = new Date().toLocaleDateString('en-CA');
                  const activeTodayBatches = scheduleList.filter(batch => 
                    batch.status !== 'Completed' && new Date() <= new Date(batch.endDate)
                  );
                  return (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Today's Batches</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                      {activeTodayBatches.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)', gridColumn: '1 / -1' }}>
                           <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>No active batches scheduled for today.</p>
                        </div>
                      )}
                      {activeTodayBatches.map(batch => (
                        <div key={batch.id} 
                             style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                        >
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                             <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-royal-purple)' }}>{batch.courseName}</h4>
                             <div style={{ backgroundColor: 'var(--indigo-50, #eef2ff)', color: 'var(--indigo-600, #4f46e5)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Active</div>
                           </div>
                           
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                               <Clock style={{ width: '16px', height: '16px' }} />
                               <span>{batch.classTiming || 'Timing Not Set'}</span>
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
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
                  );
                })()}

                {attendanceSubTab === 'history' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Attendance History</h3>
                    <div className="w-full overflow-x-auto">
                      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <table className="saas-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Batch Name</th>
                              <th>Time Slot</th>
                              <th>Total Students</th>
                              <th>Present</th>
                              <th>Absent</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistoryList.filter(r => {
                               const searchVal = (globalSearchQuery || '').toLowerCase();
                               const todayStr = new Date().toISOString().split('T')[0];
                               if (r.date === todayStr) return false;
                               if (!searchVal) return true;
                               return (r.batchName || '').toLowerCase().includes(searchVal) ||
                                      (r.date || '').toLowerCase().includes(searchVal);
                            }).map(r => {
                              return (
                                <tr 
                                  key={r.id} 
                                  onClick={() => {
                                    setSelectedAttendanceRecord(r);
                                    setIsAttendanceDetailsModalVisible(true);
                                  }} 
                                  style={{ cursor: 'pointer', backgroundColor: 'transparent', transition: 'background-color 0.2s' }}
                                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <td>
                                    <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <Calendar style={{ width: '16px', height: '16px', color: 'var(--slate-400, #94a3b8)' }} />
                                      {r.date}
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ padding: '4px 8px', backgroundColor: 'var(--indigo-50, #eef2ff)', color: 'var(--indigo-600, #4f46e5)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                      {r.batchName}
                                    </span>
                                  </td>
                                  <td>{r.slot}</td>
                                  <td>{r.records?.length || 0}</td>
                                  <td>{r.totalPresentees !== undefined ? r.totalPresentees : (r.records?.filter(rec => rec.status === 'P').length || 0)}</td>
                                  <td>{r.totalAbsentees !== undefined ? r.totalAbsentees : (r.records?.filter(rec => rec.status === 'A').length || 0)}</td>
                                  <td>
                                      <span style={{ padding: '4px 8px', backgroundColor: 'var(--border-color)', color: '#64748b', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>View Only</span>
                                  </td>
                                </tr>
                              );
                            })}
                            {attendanceHistoryList.length === 0 && (
                              <tr><td colSpan="7">No attendance history found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Attendance Details Modal */}
                      {isAttendanceDetailsModalVisible && selectedAttendanceRecord && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                            <button 
                              onClick={() => setIsAttendanceDetailsModalVisible(false)} 
                              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-400, #94a3b8)' }}
                            >
                              <X style={{ width: '24px', height: '24px' }} />
                            </button>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Student Attendance List</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                              {selectedAttendanceRecord.records && Array.isArray(selectedAttendanceRecord.records) ? selectedAttendanceRecord.records.map((rec, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                  <span style={{ fontWeight: '500' }}>{rec.studentName}</span>
                                  {rec.status === 'P' ? (
                                    <span style={{ color: 'var(--green-600, #16a34a)', backgroundColor: 'var(--green-50, #f0fdf4)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle style={{ width: '14px', height: '14px' }} /> Present</span>
                                  ) : (
                                    <span style={{ color: 'var(--red-600, #dc2626)', backgroundColor: 'var(--red-50, #fef2f2)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle style={{ width: '14px', height: '14px' }} /> Absent</span>
                                  )}
                                </div>
                              )) : <div style={{ color: '#64748b', fontStyle: 'italic' }}>No records found for this batch.</div>}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 'bold' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--green-500, #22c55e)' }}></div> Total Present: {selectedAttendanceRecord.totalPresentees || 0}</span>
                                <span style={{ color: 'var(--border-color)' }}>|</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--red-500, #ef4444)' }}></div> Total Absent: {selectedAttendanceRecord.totalAbsentees || 0}</span>
                              </div>
                              <button type="button" onClick={() => downloadAttendanceCSV(selectedAttendanceRecord)} style={{ padding: '8px 16px', backgroundColor: 'var(--indigo-600, #4f46e5)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Download style={{ width: '16px', height: '16px' }} /> Download Report
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === '6' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full mt-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="text-lg font-semibold text-slate-800" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Award className="w-5 h-5 text-blue-600" /> Student Marks Portal
                  </h3>
                  {(() => {
                    const assignedCourses = Array.from(new Set(scheduleList.map(b => b.courseName)));
                    return (
                      <select 
                        value={facultyMarksCourseFilter} 
                        onChange={e => setFacultyMarksCourseFilter(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer', minWidth: '200px' }}
                      >
                        <option value="All">All Assigned Courses</option>
                        {assignedCourses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    );
                  })()}
                </div>
                
                {(() => {
                  const searchVal = (globalSearchQuery || '').toLowerCase();
                  const assignedCourses = Array.from(new Set(scheduleList.map(b => b.courseName)));
                  const assignedStudents = studentList.filter(s => {
                    if (!assignedCourses.includes(s.course)) return false;
                    if (facultyMarksCourseFilter && facultyMarksCourseFilter !== 'All' && s.course !== facultyMarksCourseFilter) return false;
                    if (searchVal && !(s.name || '').toLowerCase().includes(searchVal) && !(s.enrollmentNo || '').toLowerCase().includes(searchVal)) return false;
                    return true;
                  });
                  
                  if (assignedStudents.length === 0) {
                    return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No students found.</div>;
                  }

                  return (
                    <div className="native-table-wrapper" style={{ overflowX: 'auto', marginBottom: '24px' }}>
                      <table className="saas-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Enrollment No</th>
                            <th>Course</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignedStudents.map(student => (
                            <tr key={student.id} style={{ transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{ fontWeight: '500' }}>{student.name}</td>
                              <td>{student.enrollmentNo || student.id.substring(0,6)}</td>
                              <td>{student.course}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudentForMarks(student);
                                    setFacultyMarksGlobalExamName('');
                                    setExamDate('');
                                    setExamSubjects([{ name: '', maxMarks: 100, obtained: '' }]);
                                    setIsMarksDetailsModalVisible(true);
                                  }} style={{ padding: '6px 12px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Enter Marks</button>
                                  
                                  {student.examHistory && student.examHistory.length > 0 && (
                                    <button onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudentForViewMarks(student);
                                      setIsViewMarksModalVisible(true);
                                    }} style={{ padding: '6px 12px', backgroundColor: 'var(--indigo-100, #e0e7ff)', color: 'var(--indigo-700, #4338ca)', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>View</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* View Marks Modal */}
            {isViewMarksModalVisible && selectedStudentForViewMarks && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                  <button 
                    onClick={() => setIsViewMarksModalVisible(false)} 
                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-400, #94a3b8)' }}
                  >
                    <X style={{ width: '24px', height: '24px' }} />
                  </button>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>Marks History: {selectedStudentForViewMarks.name}</h3>
                  
                  {selectedStudentForViewMarks.examHistory && selectedStudentForViewMarks.examHistory.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedStudentForViewMarks.examHistory.slice().reverse().map((exam, i) => (
                        <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ backgroundColor: 'var(--bg-hover)', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-main)' }}>Exam: {exam.examName || exam.testName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar style={{ width: '14px', height: '14px' }} /> {exam.examDate || exam.testDate || (exam.date && exam.date.split('T')[0])}
                            </div>
                          </div>
                          <div style={{ padding: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: '#64748b' }}>Subject</th>
                                  <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: '#64748b' }}>Max Marks</th>
                                  <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: '#64748b' }}>Obtained</th>
                                </tr>
                              </thead>
                              <tbody>
                                {exam.subjects && exam.subjects.map((sub, idx) => (
                                  <tr key={idx}>
                                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', fontWeight: '500' }}>{sub.name}</td>
                                    <td style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{sub.maxMarks}</td>
                                    <td style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{sub.obtained}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                                {(() => {
                                  const totalObtained = exam.subjects?.reduce((sum, sub) => sum + Number(sub.obtained || 0), 0) || exam.totalObtainedMarks || exam.totalObtained || 0;
                                  const totalMax = exam.subjects?.reduce((sum, sub) => sum + Number(sub.maxMarks || 0), 0) || exam.totalMaxMarks || exam.totalMax || 0;
                                  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
                                  let grade = 'F';
                                  if (percentage >= 90) grade = 'O';
                                  else if (percentage >= 80) grade = 'A+';
                                  else if (percentage >= 70) grade = 'A';
                                  else if (percentage >= 60) grade = 'B+';
                                  else if (percentage >= 50) grade = 'B';
                                  else if (percentage >= 45) grade = 'C';

                                  return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--indigo-50, #eef2ff)', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', color: 'var(--indigo-900)' }}>
                                      <span>Total: {totalObtained} / {totalMax}</span>
                                      <span>Percentage: {percentage}%</span>
                                      <span>Grade: {exam.grade || grade}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No marks history available.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === '7' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full mt-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen className="w-5 h-5 text-blue-600" /> Course Materials Management
                </h3>
                
                <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid var(--border-color)', marginBottom: '24px' }}>
                  <button 
                    onClick={() => setMaterialTab('upload')}
                    style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: materialTab === 'upload' ? '2px solid var(--blue-500, #3b82f6)' : '2px solid transparent', color: materialTab === 'upload' ? 'var(--blue-500, #3b82f6)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.2s' }}
                  >Upload Material</button>
                  <button 
                    onClick={() => setMaterialTab('tracking')}
                    style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: materialTab === 'tracking' ? '2px solid var(--blue-500, #3b82f6)' : '2px solid transparent', color: materialTab === 'tracking' ? 'var(--blue-500, #3b82f6)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.2s' }}
                  >Material Tracking & History</button>
                </div>

                {materialTab === 'upload' && (
                  <div style={{ backgroundColor: 'var(--bg-hover)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!materialFile || !materialTitle) return message.warning('Title and File are required');
                      if (!materialCourseFilter) return message.warning('Please select a target course');
                      
                      const assignedStudentsList = studentList.filter(s => s.course === materialCourseFilter);
                      if (assignedStudentsList.length === 0) return message.warning('No assigned students found for this course.');
                      const autoAssignedStudentIds = assignedStudentsList.map(s => s.id);
                      
                      setUploadingMaterial(true);
                      try {
                        await uploadCourseMaterial(user.organizationId, user.id, materialFile, materialTitle, materialDesc, autoAssignedStudentIds);
                        message.success('Course Material Uploaded & Sent Successfully!');
                        setMaterialTitle('');
                        setMaterialDesc('');
                        setMaterialFile(null);
                        setMaterialCourseFilter('');
                        // Refresh materials list
                        const materials = await getCourseMaterialsForStaff(user.id);
                        setStaffMaterials(materials);
                      } catch (err) {
                        message.error(err.message);
                      } finally {
                        setUploadingMaterial(false);
                      }
                    }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Target Course</label>
                          <select className="native-form-select" required style={{ width: '100%' }} value={materialCourseFilter} onChange={e => setMaterialCourseFilter(e.target.value)}>
                            <option value="">-- Select Course --</option>
                            {Array.from(new Set(scheduleList.map(b => b.courseName))).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {materialCourseFilter && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: 'var(--indigo-50)', color: 'var(--indigo-900)', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Users size={16} /> Auto-assigned to {studentList.filter(s => s.course === materialCourseFilter).length} students
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>File (PDF, PPT, Video)</label>
                          <input type="file" className="native-form-input" required onChange={e => setMaterialFile(e.target.files[0])} style={{ width: '100%' }} />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Material Title</label>
                        <input type="text" className="native-form-input" required value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Description (Optional)</label>
                        <textarea className="native-form-input" rows="3" value={materialDesc} onChange={e => setMaterialDesc(e.target.value)} />
                      </div>
                      
                      <button type="submit" disabled={uploadingMaterial} style={{ padding: '14px', backgroundColor: 'var(--blue-600)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', opacity: uploadingMaterial ? 0.7 : 1 }}>
                        {uploadingMaterial ? 'Uploading Material...' : 'Upload & Assign Material'}
                      </button>
                    </form>
                  </div>
                )}

                {materialTab === 'tracking' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
                    {staffMaterials.map(mat => (
                      <div key={mat.id} style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h5 style={{ margin: '0 0 6px 0', fontSize: '18px', color: 'var(--accent-royal-purple)' }}>{mat.title}</h5>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Paperclip size={14} /> {mat.fileName} • {new Date(mat.timestamp?.toDate ? mat.timestamp.toDate() : Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ padding: '6px 12px', backgroundColor: 'var(--indigo-50)', color: 'var(--indigo-900)', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Users size={14} /> Assigned to {mat.assignedStudentIds?.length || 0} students
                            </div>
                            <button 
                              onClick={() => {
                                setEditingMaterial(mat);
                                setIsEditMaterialModalVisible(true);
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--blue-600)' }}
                              title="Edit Material"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this material?')) {
                                  try {
                                    await deleteCourseMaterial(mat.id);
                                    message.success('Material deleted successfully');
                                    const materials = await getCourseMaterialsForStaff(user.id);
                                    setStaffMaterials(materials);
                                  } catch (err) {
                                    message.error(err.message);
                                  }
                                }
                              }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--red-600)' }}
                              title="Delete Material"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '4px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-main)' }}>View Status:</div>
                          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {mat.assignedStudentIds && mat.assignedStudentIds.map(sid => {
                              const st = studentList.find(s => s.id === sid);
                              const viewedRecord = (mat.viewedBy || []).find(v => v.studentId === sid);
                              const viewed = !!viewedRecord;
                              return (
                                <div key={sid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                  <span style={{ fontWeight: '500' }}>{st ? st.name : sid}</span>
                                  {viewed ? <span style={{ color: 'var(--green-600)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Viewed {viewedRecord.viewedAt ? new Date(viewedRecord.viewedAt).toLocaleDateString() : ''}</span> : <span style={{ color: 'var(--red-500)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> Pending</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {staffMaterials.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: 'var(--bg-hover)', borderRadius: '12px' }}>No materials uploaded yet.</div>}
                  </div>
                )}
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
              {activeBatchStudents.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Session Topics Covered / Class Notes</label>
                  <textarea
                    value={sessionTopics}
                    onChange={(e) => setSessionTopics(e.target.value)}
                    placeholder="Enter what topics were discussed, chapters covered, or general class notes here..."
                    style={{ width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit' }}
                  ></textarea>
                </div>
              )}
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
        <div className="saas-v3-modal-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
              <input type="email" placeholder="Enter student email" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => {
                editForm.setFieldsValue({email: e.target.value});
                if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(e.target.value)) {
                  e.target.setCustomValidity('Please enter a valid Email address');
                } else {
                  e.target.setCustomValidity('');
                }
              }} defaultValue={editForm.getFieldValue('email')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Student Phone Number</label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <span style={{ padding: '10px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '6px 0 0 6px', color: '#64748b' }}>+91 (IN)</span>
                <input type="text" placeholder="Student Phone" required style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '0 6px 6px 0', boxSizing: 'border-box' }} onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 10) val = val.slice(0, 10);
                  e.target.value = val;
                  editForm.setFieldsValue({phoneNumber: val});
                  if (!/^[6-9]\d{9}$/.test(val)) {
                    e.target.setCustomValidity('Please enter a valid 10-digit mobile number');
                  } else {
                    e.target.setCustomValidity('');
                  }
                }} defaultValue={editForm.getFieldValue('phoneNumber')?.replace('+91', '')} />
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
                  <span style={{ padding: '10px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '6px 0 0 6px', color: '#64748b' }}>+91 (IN)</span>
                  <input type="text" placeholder="Parent Phone" style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '0 6px 6px 0', boxSizing: 'border-box' }} onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 10) val = val.slice(0, 10);
                    e.target.value = val;
                    editForm.setFieldsValue({parentPhone: val});
                    if (val && !/^[6-9]\d{9}$/.test(val)) {
                      e.target.setCustomValidity('Please enter a valid 10-digit mobile number');
                    } else {
                      e.target.setCustomValidity('');
                    }
                  }} defaultValue={editForm.getFieldValue('parentPhone')?.replace('+91', '')} />
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
        <div className="saas-v3-modal-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green-600, #16a34a)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <CheckCircle2 style={{ width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Attendance Summary</h2>
          </div>
          
          <div style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '16px' }}>
              <div style={{ fontWeight: 'bold', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Batch</div>
              <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{selectedBatch?.courseName || 'N/A'}</div>
              
              <div style={{ fontWeight: 'bold', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Taken By</div>
              <div style={{ fontWeight: 'bold', textAlign: 'right' }}>{user?.name}</div>
              
              <div style={{ fontWeight: 'bold', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>Total Absentees</div>
              <div style={{ fontWeight: 'bold', color: 'var(--red-500, #ef4444)', textAlign: 'right', fontSize: '18px' }}>{absenteesList.length}</div>
            </div>
          </div>

          {absenteesList.length > 0 && (
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', maxHeight: '192px', overflowY: 'auto', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', margin: '0 0 8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Absent Students:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {absenteesList.map(s => (
                  <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold' }}>{s.name}</span>
                    {s.parentPhone ? (
                      <span style={{ fontSize: '12px', color: '#64748b', backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px' }}>{s.parentPhone}</span>
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




      {isEditNameModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="saas-v3-modal-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px", width: '400px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Edit Faculty Display Name</h2>
              <button onClick={() => setIsEditNameModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><XCircle /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newStaffName.trim()) return message.warning('Display name cannot be empty');
              setUpdatingName(true);
              try {
                await updateFacultyNameWithCascade(user.id, user.name, newStaffName, user.organizationId);
                message.success('Display name updated globally!');
                setIsEditNameModalVisible(false);
              } catch (err) {
                message.error('Failed to update name: ' + err.message);
              } finally {
                setUpdatingName(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Faculty Name</label>
                <input type="text" className="native-form-input" required value={newStaffName} onChange={e => setNewStaffName(e.target.value)} style={{ width: '100%' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsEditNameModalVisible(false)} disabled={updatingName} style={{ padding: '10px 16px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={updatingName} style={{ padding: '10px 16px', backgroundColor: 'var(--blue-600)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: updatingName ? 0.7 : 1 }}>{updatingName ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditMaterialModalVisible && editingMaterial && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="saas-v3-modal-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px", width: '500px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Edit Course Material</h2>
              <button onClick={() => { setIsEditMaterialModalVisible(false); setEditingMaterial(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><XCircle /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateCourseMaterial(editingMaterial.id, {
                  title: editingMaterial.title,
                  description: editingMaterial.description,
                  fileUrl: editingMaterial.fileUrl
                });
                message.success('Material updated successfully!');
                setIsEditMaterialModalVisible(false);
                setEditingMaterial(null);
                const materials = await getCourseMaterialsForStaff(user.id);
                setStaffMaterials(materials);
              } catch (err) {
                message.error(err.message);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Material Title</label>
                <input type="text" className="native-form-input" required value={editingMaterial.title} onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Description</label>
                <textarea className="native-form-input" rows="3" value={editingMaterial.description || ''} onChange={e => setEditingMaterial({...editingMaterial, description: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>File URL (Optional Override)</label>
                <input type="url" className="native-form-input" required value={editingMaterial.fileUrl || ''} onChange={e => setEditingMaterial({...editingMaterial, fileUrl: e.target.value})} style={{ width: '100%' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => { setIsEditMaterialModalVisible(false); setEditingMaterial(null); }} style={{ padding: '10px 16px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', backgroundColor: 'var(--blue-600)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {globalSearchModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="saas-v3-modal-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{globalSearchAction === 'edit' ? 'Edit Student Record' : 'Delete Student Record'}</h2>
              <button onClick={() => { setGlobalSearchModalVisible(false); setGlobalSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><XCircle /></button>
            </div>
            
            <div className="search-bar-wrapper" style={{ marginBottom: '24px' }}>
              <Search className="search-bar-icon" />
              <input 
                className="search-bar-input saas-v3-form-input"
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
                <div style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>Start typing to search for a student...</div>
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
                      <div style={{ fontSize: '13px', color: '#64748b' }}>ID: {student.enrollmentNo || student.id.substring(0,6)} | Mob: {student.phoneNumber}</div>
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

      {isVerificationModalVisible && selectedStudentForVerification && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', width: '90%', maxWidth: '700px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck style={{ color: '#2563eb' }} /> Document Verification
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Student: <strong>{selectedStudentForVerification.name}</strong> ({selectedStudentForVerification.enrollmentNo || selectedStudentForVerification.id.substring(0,6)})</p>
              </div>
              <button onClick={() => setIsVerificationModalVisible(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff' }}>
              <button 
                onClick={() => setVerificationTab('photo')}
                style={{ flex: 1, padding: '16px', border: 'none', background: verificationTab === 'photo' ? '#eff6ff' : 'transparent', color: verificationTab === 'photo' ? '#1d4ed8' : '#64748b', borderBottom: verificationTab === 'photo' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
              >
                <User size={18} /> Student Photo Preview
              </button>
              <button 
                onClick={() => setVerificationTab('id')}
                style={{ flex: 1, padding: '16px', border: 'none', background: verificationTab === 'id' ? '#eff6ff' : 'transparent', color: verificationTab === 'id' ? '#1d4ed8' : '#64748b', borderBottom: verificationTab === 'id' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
              >
                <FileText size={18} /> Identity Document Preview
              </button>
            </div>

            {/* Modal Content area */}
            <div style={{ padding: '32px', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
              
              {verificationTab === 'photo' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  {selectedStudentForVerification.studentPhotoUrl ? (
                    <>
                      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        <img src={selectedStudentForVerification.studentPhotoUrl} alt="Student Photo" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain' }} />
                      </div>
                      <a href={selectedStudentForVerification.studentPhotoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)' }}>
                        <ExternalLink size={16} /> Open Original Photo Link
                      </a>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748b' }}>
                      <User size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>No Photo Uploaded</h4>
                      <p style={{ margin: 0, fontSize: '14px' }}>The student has not uploaded a passport photo yet.</p>
                    </div>
                  )}
                </div>
              )}

              {verificationTab === 'id' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  {(selectedStudentForVerification.identityDocUrl || selectedStudentForVerification?.documents?.idProofUrl) ? (
                    <>
                      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', marginBottom: '24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {(() => {
                          const docUrl = selectedStudentForVerification.identityDocUrl || selectedStudentForVerification.documents.idProofUrl;
                          const isPdf = docUrl.toLowerCase().includes('.pdf');
                          if (isPdf) {
                            return (
                              <iframe src={docUrl} style={{ width: '100%', height: '400px', border: 'none', borderRadius: '8px' }} title="ID Document" />
                            );
                          } else {
                            return (
                              <img src={docUrl} alt="ID Document" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain' }} />
                            );
                          }
                        })()}
                      </div>
                      <a href={selectedStudentForVerification.identityDocUrl || selectedStudentForVerification?.documents?.idProofUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)' }}>
                        <ExternalLink size={16} /> Open Original Document Link
                      </a>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748b' }}>
                      <FileText size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>No ID Document Uploaded</h4>
                      <p style={{ margin: 0, fontSize: '14px' }}>The student has not uploaded an identity document yet.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default StaffDashboard;
