import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Form, Input, Button, Card, message, Layout, Typography, Table, Popconfirm, Modal, Select, DatePicker, TimePicker, Upload, Menu, Dropdown, Tabs, Collapse } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { createStaff, logoutUser, createStudent, getOrganizationStaff, getOrganizationStudents, subscribeToOrganizationStudents, fetchAdmissionsHierarchy, getISOWeekNumber, migrateAllStudentsToHierarchy, deleteUserDoc, updateUserDoc, createCourse, getOrganizationCourses, createCourseAssignment, getCourseAssignments, uploadCourseContentFile, deleteCourseAssignment, updateOrganizationLogo, getOrganizationDetails, getAttendanceHistoryByOrg, subscribeToAttendanceHistoryByOrg, updateCourse, createReceipt, updateStudentStatus, deleteCourse, deleteCourseModule, listenToOrganizationStatus, logTransaction, addStudentMarks, getStudentMarks, checkDuplicateReceipt } from '../../firebase/services';
import { Users, GraduationCap, LogOut, ShieldCheck, BookOpen, Calendar, UploadCloud, Settings, Briefcase, Search, Image as ImageIcon, Pencil, Trash2, FileSpreadsheet, ClipboardList, Download, CheckCircle, XCircle, Banknote, Clock, X, UserPlus, FileText, Award, Eye, ChevronDown, Grid, Filter, TrendingUp, TrendingDown, Home, LineChart, PieChart, Box, MessageSquare, Moon, Sliders, Plus } from 'lucide-react';
import { Checkbox } from 'antd';
import './AdminDashboard.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Dragger } = Upload;

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

const AdminDashboard = () => {
  const userStr = localStorage.getItem('lms_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isBillUploadEnabled = true;
  const [loading, setLoading] = useState(false);
  const [staffForm] = Form.useForm();
  const [studentForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [staffList, setStaffList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [courseForm] = Form.useForm();
  const [assignmentForm] = Form.useForm();
  const [courseList, setCourseList] = useState([]);
  const [assignmentList, setAssignmentList] = useState([]);
  const [attendanceHistoryList, setAttendanceHistoryList] = useState([]);
  const [courseFileList, setCourseFileList] = useState([]);
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [facultyRoleFilter, setFacultyRoleFilter] = useState('All');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseTab, setCourseTab] = useState('active');
  const selectedStudentIds = Form.useWatch('studentIds', assignmentForm) || [];
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [isAddStudentModalVisible, setIsAddStudentModalVisible] = useState(false);
  const [isAddFacultyModalVisible, setIsAddFacultyModalVisible] = useState(false);
  const [isViewFacultyModalVisible, setIsViewFacultyModalVisible] = useState(false);
  const [selectedViewFaculty, setSelectedViewFaculty] = useState(null);
  
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('org_logo') || null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  
  const [isFeeModalVisible, setIsFeeModalVisible] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState(null);
  const [feeForm] = Form.useForm();
  
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState(null);

  const [isAddSubjectModalVisible, setIsAddSubjectModalVisible] = useState(false);
  const [isEditCourseModalVisible, setIsEditCourseModalVisible] = useState(false);
  const [isEditSubjectModalVisible, setIsEditSubjectModalVisible] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [subjectToEdit, setSubjectToEdit] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedStudentForStatus, setSelectedStudentForStatus] = useState(null);
  const [statusUpdateForm] = Form.useForm();
  
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false);
  const [selectedStudentForTimeline, setSelectedStudentForTimeline] = useState(null);
  const [studentManagementTab, setStudentManagementTab] = useState('active');
  
  const [isViewAssignedStudentsModalVisible, setIsViewAssignedStudentsModalVisible] = useState(false);
  const [assignedStudentsList, setAssignedStudentsList] = useState([]);
  const [assignedStudentsCourseName, setAssignedStudentsCourseName] = useState('');
  
  // Student Journey Hub & Search Modal State
  const [journeySearchQuery, setJourneySearchQuery] = useState('');
  const [selectedJourneyStudent, setSelectedJourneyStudent] = useState(null);
  const [globalSearchModalVisible, setGlobalSearchModalVisible] = useState(false);
  const [globalSearchAction, setGlobalSearchAction] = useState(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // Marks Management State
  const [marksSearchText, setMarksSearchText] = useState('');
  const [marksCourseFilter, setMarksCourseFilter] = useState('All');
  const [isMarksDetailsModalVisible, setIsMarksDetailsModalVisible] = useState(false);
  const [selectedStudentForMarks, setSelectedStudentForMarks] = useState(null);
  const [isBreakdownModalVisible, setIsBreakdownModalVisible] = useState(false);
  const [selectedExamForBreakdown, setSelectedExamForBreakdown] = useState(null);
  
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [sentReminderId, setSentReminderId] = useState(null);

  const handleSendReminder = async (student, pendingAmount) => {
    try {
      setSendingReminderId(student.id);
      const newNotification = {
        id: "REM-" + Date.now(),
        type: "FEE_REMINDER",
        title: "Fee Payment Reminder",
        message: `Dear Student, you have a pending fee balance of ₹${pendingAmount}. Please clear it at the earliest.`,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        read: false
      };
      
      const currentNotifications = student.notifications || [];
      await updateUserDoc(student.id, { notifications: [...currentNotifications, newNotification] });
      
      setSendingReminderId(null);
      setSentReminderId(student.id);
      message.success("Fee reminder sent to student successfully!");
      
      setTimeout(() => setSentReminderId(null), 3000);
    } catch (error) {
      console.error("Error sending reminder:", error);
      setSendingReminderId(null);
      message.error("Failed to send reminder.");
    }
  };

  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
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
        window.location.reload();
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      message.error('Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Reports Module State
  const [activeReportTab, setActiveReportTab] = useState('admission');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [admissionReportCourseFilter, setAdmissionReportCourseFilter] = useState('All');
  const [isAdmissionSummaryModalVisible, setIsAdmissionSummaryModalVisible] = useState(false);
  const [drillDownPath, setDrillDownPath] = useState([]);
  const [drillDownData, setDrillDownData] = useState({ folders: [], students: [] });
  const [isDrillDownLoading, setIsDrillDownLoading] = useState(false);

  useEffect(() => {
    if (!isAdmissionSummaryModalVisible || !user?.organizationId) return;
    const fetchDrillDown = async () => {
      setIsDrillDownLoading(true);
      try {
        const data = await fetchAdmissionsHierarchy(user.organizationId, drillDownPath);
        setDrillDownData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsDrillDownLoading(false);
      }
    };
    fetchDrillDown();
  }, [drillDownPath, isAdmissionSummaryModalVisible, user?.organizationId]);

  const [facultyCurrentPage, setFacultyCurrentPage] = useState(1);
  const [courseCurrentPage, setCourseCurrentPage] = useState(1);
  const [billingCurrentPage, setBillingCurrentPage] = useState(1);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentTextSearch, setStudentTextSearch] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('All');
  const [studentAgeFilter, setStudentAgeFilter] = useState('All');
  const [studentAcademicYearFilter, setStudentAcademicYearFilter] = useState('All');
  const [studentSortOrder, setStudentSortOrder] = useState('');

  // Attendance Reports State
  const [attendanceReportTab, setAttendanceReportTab] = useState('daily');
  const [attendanceBatchFilter, setAttendanceBatchFilter] = useState('All');
  const [attendanceFacultyFilter, setAttendanceFacultyFilter] = useState('All');
  const [selectedAttendanceReport, setSelectedAttendanceReport] = useState(null);

  const [offlineFeeForm] = Form.useForm();
  const cashAmount = Form.useWatch('cashAmount', offlineFeeForm) || 0;
  const upiAmount = Form.useWatch('upiAmount', offlineFeeForm) || 0;
  const cardAmount = Form.useWatch('cardAmount', offlineFeeForm) || 0;
  const totalFeePaid = Number(cashAmount) + Number(upiAmount) + Number(cardAmount);

  // Billing Management State
  const [billingTab, setBillingTab] = useState('ledger');
  const [billingEntry, setBillingEntry] = useState(
    { date: new Date().toISOString().split('T')[0], billCode: `BC-${Math.floor(Math.random()*10000)}`, enrollmentNo: '', studentId: null, studentName: '', course: '', totalFees: 0, amountPaid: '', splitMode: false, cashAmount: '', upiAmount: '', cardAmount: '', mode: 'Cash', balance: 0, status: 'Pending', dueDate: '', payer: '', cashier: '', billMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }) }
  );
  const [billHistory, setBillHistory] = useState([]);
  const [billingStudentSearch, setBillingStudentSearch] = useState('');
  const [billingSearchQuery, setBillingSearchQuery] = useState('');

  // Journey Hub Overlay States
  const [isJourneyAttendanceModalVisible, setIsJourneyAttendanceModalVisible] = useState(false);
  const [selectedJourneyAttendanceDate, setSelectedJourneyAttendanceDate] = useState(null);
  const [isJourneyFeeModalVisible, setIsJourneyFeeModalVisible] = useState(false);
  const [isJourneyAcademicModalVisible, setIsJourneyAcademicModalVisible] = useState(false);
  const [isJourneyProfileModalVisible, setIsJourneyProfileModalVisible] = useState(false);

  const handleBillingEntryChange = (field, value) => {
    setBillingEntry(prev => {
      const updatedRow = { ...prev, [field]: value };
      if (field === 'enrollmentNo') {
        const student = studentList.find(s => s.enrollmentNo === value);
        if (student) {
          updatedRow.studentId = student.id;
          updatedRow.studentName = student.name;
          updatedRow.course = student.course || 'N/A';
          updatedRow.totalFees = Number(student.totalCourseFee || student.courseFee || 28000);
          const studentReceipts = billHistory.filter(t => t.studentId === student.id || (t.enrollmentNo && student.enrollmentNo && t.enrollmentNo === student.enrollmentNo));
          const totalPaid = studentReceipts.reduce((sum, item) => sum + (Number(item.amountPaid || item.totalAmount || item.amount) || 0), 0);
          updatedRow.previouslyPaid = totalPaid;
          updatedRow.remainingBalance = updatedRow.totalFees - updatedRow.previouslyPaid;
          
          if (updatedRow.mode === 'Split') {
            updatedRow.amountPaid = (Number(updatedRow.cashAmount) || 0) + (Number(updatedRow.upiAmount) || 0);
          }
          const paid = Number(updatedRow.amountPaid) || 0;
          updatedRow.balance = updatedRow.remainingBalance - paid;
          updatedRow.status = updatedRow.remainingBalance <= 0 ? 'Paid' : 'Pending';
        } else {
          updatedRow.studentId = null;
          updatedRow.studentName = '';
          updatedRow.course = '';
          updatedRow.totalFees = 0;
          updatedRow.previouslyPaid = 0;
          updatedRow.remainingBalance = 0;
          if (updatedRow.mode === 'Split') {
            updatedRow.amountPaid = (Number(updatedRow.cashAmount) || 0) + (Number(updatedRow.upiAmount) || 0);
          }
          const paid = Number(updatedRow.amountPaid) || 0;
          updatedRow.balance = 0 - paid;
          updatedRow.status = 'Pending';
        }
      }
      if (field === 'amountPaid' || field === 'cashAmount' || field === 'upiAmount' || field === 'mode') {
        if (updatedRow.mode === 'Split') {
          updatedRow.amountPaid = (Number(updatedRow.cashAmount) || 0) + (Number(updatedRow.upiAmount) || 0);
        }
        let paid = Number(updatedRow.amountPaid) || 0;
        
        // Form Guard: Restrict maximum enterable amount to remaining balance if > 0
        if (updatedRow.remainingBalance > 0 && paid > updatedRow.remainingBalance) {
          paid = updatedRow.remainingBalance;
          updatedRow.amountPaid = paid;
          if (field === 'amountPaid') {
            // we constrain it
          }
        }
        
        updatedRow.balance = (updatedRow.remainingBalance || 0) - paid;
        updatedRow.status = updatedRow.remainingBalance <= 0 ? 'Paid' : 'Pending';
      }
      return updatedRow;
    });
  };

  useEffect(() => {
    if (studentList.length === 0) return;
    
    let unsubscribe;
    const subscribeToBills = async () => {
      try {
        const { db } = await import('../../firebase/config');
        const { collection, onSnapshot, query } = await import('firebase/firestore');
        
        const q = query(collection(db, 'fee_transactions'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const orgStudentIds = new Set(studentList.map(s => s.id));
          const orgTransactions = transactions.filter(t => orgStudentIds.has(t.studentId));
          setBillHistory(orgTransactions);
        });
      } catch (error) {
        console.error("Error subscribing to bill history:", error);
      }
    };
    
    subscribeToBills();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [studentList]);

  const handleSaveBillingEntry = async () => {
    const row = billingEntry;
    if (!row.studentId) {
      message.error("Please enter a valid Enrollment No.");
      return;
    }
    const amount = Number(row.amountPaid) || 0;
    if (amount <= 0) {
      message.error("Amount Paid must be greater than 0");
      return;
    }

    if (row.mode === 'Split') {
      const splitSum = (Number(row.cashAmount) || 0) + (Number(row.upiAmount) || 0);
      if (splitSum !== amount) {
        message.error("Split amounts (Cash + GPay) must strictly equal the Total Payment Amount.");
        return;
      }
    }

    setLoading(true);
    try {
      const billNumber = row.billCode || `BILL-${Date.now()}`;
      const isDuplicate = await checkDuplicateReceipt(billNumber);
      if (isDuplicate) {
        message.warning("It's already saved!");
        setLoading(false);
        return;
      }

      await logTransaction('BILLING_MANAGEMENT', {
        studentId: row.studentId,
        adminId: user?.id,
        amount: amount,
        actionContext: 'Single Slot Billing Payment'
      });
      const receiptData = {
        studentId: row.studentId,
        course: row.course || 'N/A',
        paymentMode: row.mode,
        cashAmount: row.mode === 'Split' ? (Number(row.cashAmount) || 0) : 0,
        gpayAmount: row.mode === 'Split' ? (Number(row.upiAmount) || 0) : 0,
        paymentSplit: row.mode === 'Split' ? {
          cash: Number(row.cashAmount) || 0,
          upi: Number(row.upiAmount) || 0,
          card: 0
        } : { 
          cash: row.mode === 'Cash' ? amount : 0, 
          upi: row.mode === 'GPay' ? amount : 0, 
          card: row.mode === 'Card' ? amount : 0 
        },
        totalAmount: amount, 
        billNumber: billNumber,
        paymentDate: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
        paymentTime: new Date().toISOString(),
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
        payer: row.payer || 'Student',
        cashier: row.cashier || user?.name || 'Admin',
        remarks: 'Single Slot Entry'
      };
      await createReceipt(receiptData);
      
      const student = studentList.find(s => s.id === row.studentId);
      const courseFee = Number(student?.totalCourseFee || student?.courseFee || 28000);
      const currentPaid = Number(student?.paidFee || 0);
      const newPaid = currentPaid + amount;
      const newPending = courseFee - newPaid;
      
      const currentLedger = student?.feeLedger || [];
      const newBill = {
        receiptId: "REC-" + Date.now(),
        amountPaid: Number(amount),
        totalPaidSoFar: newPaid,
        remainingBalance: newPending,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN'),
        status: newPending <= 0 ? 'Paid' : 'Partial',
        paymentMode: row.mode,
        paymentSplit: row.mode === 'Split' ? {
          cash: Number(row.cashAmount) || 0,
          upi: Number(row.upiAmount) || 0
        } : null
      };

      await updateUserDoc(row.studentId, {
        paidFee: newPaid,
        pendingFee: newPending,
        feeLedger: [...currentLedger, newBill]
      });
      message.success("Payment recorded successfully!");
      fetchStaffAndStudents();
      setBillingEntry({ date: new Date().toISOString().split('T')[0], billCode: `BC-${Math.floor(Math.random()*10000)}`, enrollmentNo: '', studentId: null, studentName: '', course: '', totalFees: 0, amountPaid: '', splitMode: false, cashAmount: '', upiAmount: '', cardAmount: '', mode: 'Cash', balance: 0, status: 'Pending', dueDate: '', payer: '', cashier: '', billMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }) });
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTodaysCollectionCSV = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const allTransactions = [];
      studentList.forEach(student => {
        if (student.feeHistory) {
          student.feeHistory.forEach(fee => {
            const feeDate = fee.paymentDate ? new Date(fee.paymentDate).toISOString().split('T')[0] : '';
            if (feeDate === today) {
              allTransactions.push({
                "Date": feeDate,
                "Enrollment No": student.enrollmentNo || student.id,
                "Student Name": student.name,
                "Course": student.course || 'N/A',
                "Amount Paid": fee.amountPaid || (fee.cashAmount || 0) + (fee.upiAmount || 0) + (fee.cardAmount || 0),
                "Receipt No": fee.billNumber || 'Manual',
                "Data Masking": "[Aadhaar Redacted]"
              });
            }
          });
        }
      });
      if (allTransactions.length === 0) {
        message.info("No collections found for today.");
        return;
      }
      const csv = Papa.unparse(allTransactions);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Todays_Collection_${today}.csv`);
      link.click();
    } catch (e) {
      message.error("Failed to generate CSV: " + e.message);
    }
  };

  const downloadStudentLedgerCSV = async () => {
    if (!billingStudentSearch) {
      message.warning("Please enter a student name or enrollment no to track ledger.");
      return;
    }
    const student = studentList.find(s => s.name.toLowerCase() === billingStudentSearch.toLowerCase() || s.enrollmentNo === billingStudentSearch);
    if (!student) {
      message.error("Student not found.");
      return;
    }
    if (!student.feeHistory || student.feeHistory.length === 0) {
      message.info("No payment history found for this student.");
      return;
    }
    const transactions = student.feeHistory.map(fee => ({
      "Date": fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : 'N/A',
      "Enrollment No": student.enrollmentNo || student.id,
      "Student Name": student.name,
      "Course": student.course || 'N/A',
      "Course Fee": student.courseFee || 28000,
      "Amount Paid": fee.amountPaid || (fee.cashAmount || 0) + (fee.upiAmount || 0) + (fee.cardAmount || 0),
      "Receipt No": fee.billNumber || 'Manual',
      "Data Masking": "[Aadhaar Redacted]"
    }));
    const csv = Papa.unparse(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Student_Ledger_${student.name.replace(/\s+/g, '_')}.csv`);
    link.click();
  };

  const handleFeeSubmit = async (values) => {
    if (totalFeePaid <= 0) {
      message.error("Total amount must be greater than 0");
      return;
    }
    setLoading(true);
    try {
      const isDuplicate = await checkDuplicateReceipt(values.billNumber);
      if (isDuplicate) {
        message.warning("It's already saved!");
        setLoading(false);
        return;
      }

      await logTransaction('OFFLINE_FEE_COLLECTION', {
        studentId: selectedStudentForFee.id,
        adminId: user?.id,
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
      
      const currentPaid = selectedStudentForFee?.paidFee || selectedStudentForFee?.paidAmount || 0;
      const courseFee = selectedStudentForFee.courseFee || 28000;
      const newPaid = currentPaid + totalFeePaid;
      const newPending = courseFee - newPaid;
      
      const currentLedger = selectedStudentForFee.feeLedger || [];
      const newBill = {
        receiptId: "REC-" + Date.now(),
        amountPaid: Number(totalFeePaid),
        totalPaidSoFar: newPaid,
        remainingBalance: newPending,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN'),
        status: newPending <= 0 ? 'Paid' : 'Partial',
        paymentMode: values.paymentMode,
        paymentSplit: values.paymentMode === 'Split' ? {
          cash: Number(values.cashAmount) || 0,
          upi: Number(values.upiAmount) || 0
        } : null
      };

      await updateUserDoc(selectedStudentForFee.id, {
        paidFee: newPaid,
        pendingFee: newPending,
        feeLedger: [...currentLedger, newBill]
      });
      
      message.success("Fee collected successfully!");
      setIsFeeModalVisible(false);
      offlineFeeForm.resetFields();
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
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

  const renderHighlightedText = (text, query) => {
    if (!query || typeof text !== 'string') return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? <strong key={index} style={{ fontWeight: 700, color: '#000000' }}>{part}</strong> : part
    );
  };

  const fetchStaffAndStudents = async () => {
    if (!user?.organizationId) return;
    try {
      const [staff, courses, assignments, orgDetails] = await Promise.all([
        getOrganizationStaff(user.organizationId),
        getOrganizationCourses(user.organizationId),
        getCourseAssignments(user.organizationId),
        getOrganizationDetails(user.organizationId)
      ]);
      setStaffList(staff);
      setCourseList(courses);
      setAssignmentList(assignments);
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
    fetchStaffAndStudents();
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, [user?.organizationId]);

  useEffect(() => {
    if (user?.organizationId) {
      const unsubscribe = subscribeToOrganizationStudents(user.organizationId, (students) => {
        setStudentList(students);
      });
      return () => unsubscribe();
    }
  }, [user?.organizationId]);

  useEffect(() => {
    if (user?.organizationAccessId) {
      const unsubscribe = subscribeToAttendanceHistoryByOrg(user.organizationAccessId, (history) => {
        setAttendanceHistoryList(history.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
      });
      return () => unsubscribe();
    }
  }, [user?.organizationAccessId]);

  const handleDeleteUser = async (id) => {
    try {
      await deleteUserDoc(id);
      message.success("User removed successfully");
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditClick = (record) => {
    setEditingUser(record);
    editForm.setFieldsValue({
      name: record.name || "",
      email: record.email || "",
      phoneNumber: record.phoneNumber || "",
      enrollmentNo: record.enrollmentNo || "",
      course: record.course || "",
      gender: record.gender || "",
      dob: record.dob || "",
      dateOfJoining: record.dateOfJoining || "",
      courseFee: record.courseFee || "",
      parentPhone: record.parentPhone || "",
      status: record.currentStatus || record.status || 'Active',
      age: record.age !== undefined ? record.age : "",
      batch: record.batch !== undefined ? record.batch : "",
      degree: record.degree !== undefined ? record.degree : "",
      address: record.address !== undefined ? record.address : "",
      experience: record.experience !== undefined ? record.experience : "",
      facultyId: record.facultyId !== undefined ? record.facultyId : "",
      facultyRole: record.facultyRole || record.role !== 'staff' ? record.role : ""
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
        degree: values.degree !== undefined ? values.degree : (editingUser?.degree || ""),
        address: values.address !== undefined ? values.address : (editingUser?.address || ""),
        experience: values.experience !== undefined ? values.experience : (editingUser?.experience || ""),
        facultyId: values.facultyId !== undefined ? values.facultyId : (editingUser?.facultyId || ""),
        facultyRole: values.facultyRole !== undefined ? values.facultyRole : (editingUser?.facultyRole || ""),
      };

      // Ensure no undefined values are sent to Firebase updateDoc
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) {
          delete updatePayload[key];
        }
      });

      await updateUserDoc(editingUser.id, updatePayload);
      message.success("Profile updated successfully!");
      setIsEditModalVisible(false);
      
      // Force state synchronized refresh pipeline
      if (selectedJourneyStudent && selectedJourneyStudent.id === editingUser.id) {
        setSelectedJourneyStudent(prev => ({
          ...prev,
          ...updatePayload
        }));
      }
      setStudentList(prev => prev.map(s => s.id === editingUser.id ? { ...s, ...updatePayload } : s));

      fetchStaffAndStudents();
    } catch (error) {
      message.error("Failed to update profile: " + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const staffColumns = [
    { title: 'Faculty ID', dataIndex: 'facultyId', key: 'facultyId', width: 120, render: text => text || 'N/A' },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Role', dataIndex: 'facultyRole', key: 'facultyRole', width: 150, render: (text, record) => text || (record.role !== 'staff' ? record.role : 'N/A') },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 250 },
    { title: 'Actions', key: 'actions', width: 150, align: 'center', render: (_, record) => (
      <div className="flex gap-4 items-center justify-center">
        <Eye className="w-5 h-5 text-emerald-600 hover:text-emerald-800 cursor-pointer transition-colors" title="View" aria-label="View" onClick={() => { setSelectedViewFaculty(record); setIsViewFacultyModalVisible(true); }} />
        <Pencil className="w-5 h-5 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors" title="Edit" aria-label="Edit" onClick={() => handleEditClick(record)} />
        <Popconfirm title="Are you sure you want to remove this faculty member?" onConfirm={() => handleDeleteUser(record.id)} okText="Yes" cancelText="No">
          <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800 cursor-pointer transition-colors" title="Delete" aria-label="Delete" />
        </Popconfirm>
      </div>
    )}
  ];

  const handleStatusUpdateSubmit = async (values) => {
    setLoading(true);
    try {
      await updateStudentStatus(
        selectedStudentForStatus.id, 
        selectedStudentForStatus.statusHistory, 
        values.newStatus, 
        values.reason
      );
      message.success("Student status updated successfully!");
      setIsStatusModalVisible(false);
      statusUpdateForm.resetFields();
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFeeStatus = (record) => {
    const courseFee = record.courseFee || 28000;
    const paid = record.paidFee || 0;
    const pending = courseFee - paid;
    return pending <= 0 ? 'Paid' : 'Not Paid';
  };

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

  const getAcademicYearFromDOJ = (dateOfJoining) => {
    if (!dateOfJoining) return null;
    const dojDate = new Date(dateOfJoining);
    if (isNaN(dojDate.getTime())) return null;
    const year = dojDate.getFullYear();
    const month = dojDate.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    return `${startYear} - ${startYear + 1}`;
  };

  const generateStudentCSVData = (student) => {
    let present = 0, absent = 0;
    if (attendanceHistoryList) {
      const map = new Map();
      attendanceHistoryList.forEach(log => {
        if (log.isFinal === false) return;
        const rec = log.records?.find(r => r.studentName === student.name);
        if (rec) {
          const key = `${log.date}_${log.batchName}_${log.slot}`;
          if (!map.has(key)) map.set(key, rec.status);
        }
      });
      map.forEach(status => {
        if (status === 'P') present++;
        if (status === 'A') absent++;
      });
    }

    const paidFee = student.receipts?.reduce((sum, r) => sum + (r.totalAmount || 0), 0) || 0;

    return {
      "Enrollment ID": student.enrollmentNo || student.id,
      "Name": student.name,
      "Email": student.email || student.gmail || 'N/A',
      "Phone": student.phoneNumber || 'N/A',
      "Parent Phone": student.parentPhone || 'N/A',
      "Gender": student.gender || 'N/A',
      "Age": student.age || 'N/A',
      "DOB": student.dob || 'N/A',
      "Date of Joining": student.dateOfJoining || (student.createdAt ? new Date(student.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'),
      "Course": student.course || 'N/A',
      "Course Fee": student.courseFee || 28000,
      "Total Paid": paidFee,
      "Fee Status": (student.courseFee || 28000) - paidFee <= 0 ? 'Paid' : 'Not Paid',
      "Status": student.currentStatus || 'Active',
      "Classes Attended": present,
      "Classes Skipped": absent,
      "Exams": student.examHistory ? student.examHistory.map(e => `${e.examName}: ${e.marks} (${e.grade})`).join(' | ') : 'N/A',
      "Fee Transactions": student.feeHistory ? student.feeHistory.map(f => `₹${f.amountPaid || (f.cashAmount || 0) + (f.upiAmount || 0) + (f.cardAmount || 0) || 0} on ${f.paymentDate ? new Date(f.paymentDate).toLocaleDateString() : 'N/A'} (Receipt: ${f.billNumber || 'Manual'})`).join(' | ') : 'N/A',
      "Data Masking": "[Aadhaar Redacted]"
    };
  };

  const convertArrayToCSV = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return '';
    const headers = Object.keys(dataArray[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of dataArray) {
      const values = headers.map(header => {
        const val = row[header] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  const downloadCSVBlob = (csvString, filename) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSingleProfileDownload = (student) => {
    const data = [generateStudentCSVData(student)];
    const csv = convertArrayToCSV(data);
    downloadCSVBlob(csv, `${student.name.replace(/\s+/g, '_')}_Profile.csv`);
  };

  const handleBulkSingleCSV = (list) => {
    if (list.length === 0) return message.warning('No students to download.');
    const data = list.map(generateStudentCSVData);
    const csv = convertArrayToCSV(data);
    downloadCSVBlob(csv, `Master_Student_List_${new Date().getTime()}.csv`);
  };

  const handleBulkSeparateCSV = (list) => {
    if (list.length === 0) return message.warning('No students to download.');
    if (list.length > 20 && !window.confirm(`You are about to download ${list.length} separate files. Continue?`)) return;
    list.forEach((student, index) => {
      setTimeout(() => {
        handleSingleProfileDownload(student);
      }, index * 200);
    });
  };

  const filteredStudentList = (list) => {
    return list.filter(s => {
      const matchSearch = (s.name || '').toLowerCase().includes(studentTextSearch.toLowerCase()) || 
                          (s.enrollmentNo || '').toLowerCase().includes(studentTextSearch.toLowerCase());
      const matchCourse = studentCourseFilter === 'All' || s.course === studentCourseFilter;
      const bucket = getAgeBucket(s.dob);
      const matchAge = studentAgeFilter === 'All' || bucket === studentAgeFilter;
      
      const academicYear = getAcademicYearFromDOJ(s.dateOfJoining || (s.createdAt ? new Date(s.createdAt.seconds * 1000).toISOString() : null));
      const matchAcademicYear = studentAcademicYearFilter === 'All' || academicYear === studentAcademicYearFilter;

      return matchSearch && matchCourse && matchAge && matchAcademicYear;
    });
  };

  const renderStudentList = (list) => {
    if (list.length === 0) return <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>No students found matching your criteria.</div>;
    return (
      <div className="global-responsive-scroll-wrapper" style={{ overflowX: 'auto', backgroundColor: 'var(--card-bg)' }}>
        <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--theme-bg-premium)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Course</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Fees Status</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Gmail</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Phone Number</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(record => {
              const feeStatus = getFeeStatus(record);
              const feeBg = feeStatus === 'Paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
              const feeColor = feeStatus === 'Paid' ? 'var(--green-500, #22c55e)' : 'var(--red-500, #ef4444)';
              const status = record.currentStatus || 'Active';
              const statusBg = status === 'Active' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)';
              const statusColor = status === 'Active' ? 'var(--blue-500, #3b82f6)' : 'var(--slate-500, #64748b)';
              
              return (
                <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', backgroundColor: 'var(--card-bg)' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {record.documents?.profilePhotoUrl || record.photoUrl ? (
                        <img src={record.documents?.profilePhotoUrl || record.photoUrl} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', color: 'var(--blue-500, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '1px solid var(--border-color)' }}>
                          {record.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' }}>{record.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {record.enrollmentNo || record.id.substring(0,6).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>{record.course || 'N/A'}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: statusBg, color: statusColor, fontSize: '12px', fontWeight: 'bold' }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: feeBg, color: feeColor, fontSize: '12px', fontWeight: 'bold' }}>
                      {feeStatus}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{record.email || record.gmail || 'N/A'}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{record.phoneNumber || 'N/A'}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => { setSelectedStudentForProfile(record); setIsProfileModalVisible(true); }}
                      style={{ cursor: 'pointer', padding: '6px 12px', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                      View Docs
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };




  const handleDeleteAssignment = async (id) => {
    try {
      await deleteCourseAssignment(id);
      message.success("Assignment removed successfully");
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      await deleteCourse(id);
      message.success("Course deleted successfully");
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDeleteCourseModule = async (courseId, moduleToRemove, currentModulesString) => {
    try {
      await deleteCourseModule(courseId, moduleToRemove, currentModulesString);
      message.success("Module removed successfully");
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleAddSubjectToCourse = async () => {
    if (!newSubjectName.trim() || !courseToEdit) return;
    try {
      const updatedModules = courseToEdit.modules ? `${courseToEdit.modules}\n${newSubjectName.trim()}` : newSubjectName.trim();
      await updateCourse(courseToEdit.id, { modules: updatedModules });
      message.success("Module added successfully");
      setIsAddSubjectModalVisible(false);
      setNewSubjectName('');
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditCourseName = async () => {
    if (!newCourseName.trim() || !courseToEdit) return;
    try {
      await updateCourse(courseToEdit.id, { name: newCourseName.trim() });
      message.success("Course renamed successfully");
      setIsEditCourseModalVisible(false);
      setNewCourseName('');
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditSubjectName = async () => {
    if (!newSubjectName.trim() || !courseToEdit || !subjectToEdit) return;
    try {
      const modulesList = courseToEdit.modules.split(/[\n,]+/).map(m => m.trim()).filter(m => m);
      const index = modulesList.indexOf(subjectToEdit);
      if (index !== -1) {
        modulesList[index] = newSubjectName.trim();
        await updateCourse(courseToEdit.id, { modules: modulesList.join('\n') });
        message.success("Module renamed successfully");
        setIsEditSubjectModalVisible(false);
        setNewSubjectName('');
        fetchStaffAndStudents();
      }
    } catch (error) {
      message.error(error.message);
    }
  };


  const assignmentColumns = [
    { title: 'Course Name', dataIndex: 'courseName', key: 'courseName', width: 150 },
    { title: 'Faculty Name', dataIndex: 'staffName', key: 'staffName', width: 150 },
    { title: 'Class Timing', dataIndex: 'classTiming', key: 'classTiming', width: 150 },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', width: 120 },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', width: 120 },
    { title: 'Assigned Students', key: 'students', width: 150, align: 'center', render: (_, record) => (
      <button 
        onClick={() => {
          const detailedStudents = studentList.filter(s => record.studentIds?.includes(s.id));
          setAssignedStudentsList(detailedStudents);
          setAssignedStudentsCourseName(`${record.staffName || 'Faculty'} - ${record.courseName || 'Course'}`);
          setIsViewAssignedStudentsModalVisible(true);
        }}
        style={{ padding: '6px 12px', backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
      >
        View
      </button>
    )},
    { title: 'Actions', key: 'actions', width: 150, align: 'center', render: (_, record) => (
      <div className="flex gap-4 items-center justify-center">
        <Pencil className="w-5 h-5 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors" title="Edit" aria-label="Edit" onClick={() => message.info("Edit Assignment coming soon")} />
        <Popconfirm title="Are you sure you want to remove this assignment?" onConfirm={() => handleDeleteAssignment(record.id)} okText="Yes" cancelText="No">
          <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800 cursor-pointer transition-colors" title="Delete" aria-label="Delete" />
        </Popconfirm>
      </div>
    )}
  ];

  const handleCreateStaff = async (values) => {
    setLoading(true);
    try {
      if (values.phoneNumber && !values.phoneNumber.startsWith('+')) values.phoneNumber = `+91${values.phoneNumber}`;
      const orgAccessId = user.organizationAccessId;
      const result = await createStaff(user.organizationId, user.organizationName, values.name, values.email, orgAccessId, values.phoneNumber, values.age, values.experience, values.degree, values.address, values.facultyId);
      message.success(`Faculty created successfully linked to Organization Access ID.`);
      staffForm.resetFields();
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (info) => {
    // Only process when file status is undefined (which means it's intercepted by beforeUpload)
    const file = info.file;
    if (!file) return;

    setLogoUploading(true);
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
        await updateOrganizationLogo(user.organizationId, data.secure_url);
        setLogoUrl(data.secure_url);
        localStorage.setItem('org_logo', data.secure_url);
        message.success('Organization logo updated successfully!');
      } else {
        throw new Error(data.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCreateStudent = async (values) => {
    setLoading(true);
    try {
      if (values.phoneNumber && !values.phoneNumber.startsWith('+')) values.phoneNumber = `+91${values.phoneNumber}`;
      if (values.parentPhone && !values.parentPhone.startsWith('+')) values.parentPhone = `+91${values.parentPhone}`;
      const orgAccessId = user.organizationAccessId;
      const studentData = { 
        name: values.name, 
        email: values.email, 
        organizationAccessId: orgAccessId, 
        phoneNumber: values.phoneNumber,
        gender: values.gender,
        dob: values.dob || null,
        dateOfJoining: values.dateOfJoining || null,
        enrollmentNo: values.enrollmentNo,
        course: values.course,
        courseFee: values.courseFee,
        parentPhone: values.parentPhone,
        status: values.status,
        age: values.age,
        batch: values.batch || null
      };
      const result = await createStudent(user.organizationId, user.organizationName, studentData);
      message.success(`Student created successfully linked to Organization Access ID.`);
      studentForm.resetFields();
      setIsAddStudentModalVisible(false);
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processCSV = (file) => {
    setCsvUploading(true);
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
            status: row.Status || row.status || 'Active',
            batch: row.Batch || row.batch || null
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
        if (errorCount > 0) message.warning(`${errorCount} records failed.`);
        setCsvUploading(false);
        fetchStaffAndStudents();
      },
      error: (error) => {
        message.error(`Error parsing file: ${error.message}`);
        setCsvUploading(false);
      }
    });
    return false; // Prevent default upload behavior
  };

  const handleCreateCourse = async (values) => {
    setLoading(true);
    try {
      const contentObjects = [];

      if (courseFileList.length > 0) {
        message.loading({ content: 'Uploading course files...', key: 'uploadingFiles' });
        for (const fileObj of courseFileList) {
          const file = fileObj.originFileObj;
          const url = await uploadCourseContentFile(user.organizationId, file);
          contentObjects.push({
            name: file.name,
            type: file.type,
            url: url
          });
        }
        message.success({ content: 'Files uploaded!', key: 'uploadingFiles' });
      }

      const existingCourse = courseList.find(c => c.name.toLowerCase() === values.name.toLowerCase());
      
      let finalModules = values.modules;
      
      if (existingCourse) {
        const existingModules = existingCourse.modules || "";
        finalModules = existingModules ? `${existingModules}, ${values.modules}` : values.modules;
        
        await updateCourse(existingCourse.id, {
          modules: finalModules,
          contentUrl: values.contentUrl || existingCourse.contentUrl || null,
          contentObjects: [...(existingCourse.contentObjects || []), ...contentObjects]
        });
        message.success(`Course updated successfully. New modules appended.`);
      } else {
        await createCourse(user.organizationId, { 
          name: values.name, 
          modules: finalModules, 
          contentUrl: values.contentUrl || null,
          contentObjects: contentObjects 
        });
        message.success(`Course created successfully.`);
      }
      courseForm.resetFields();
      setCourseFileList([]);
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (values) => {
    setLoading(true);
    try {
      const staffMember = staffList.find(s => s.id === values.staffId);
      const studentNames = studentList.filter(s => values.studentIds.includes(s.id)).map(s => s.name);
      
      const assignmentData = {
        courseName: values.courseName,
        staffId: values.staffId,
        staffName: staffMember?.name || 'Unknown',
        classTiming: values.classTiming,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        studentIds: values.studentIds,
        enrolledStudentIds: values.studentIds,
        studentNames: studentNames
      };
      
      await createCourseAssignment(user.organizationId, assignmentData);
      message.success(`Course assigned successfully.`);
      assignmentForm.resetFields();
      fetchStaffAndStudents();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState('1');
  const [openKeys, setOpenKeys] = useState(['management']);

  const menuItems = [
    {
      key: 'management',
      icon: <Briefcase className="w-4 h-4" />,
      label: 'Management',
      children: [
        { key: '1', icon: <Users className="w-4 h-4" />, label: 'Manage Faculty' },
        { 
          key: '2', 
          icon: <GraduationCap className="w-4 h-4" />, 
          label: 'Manage Students'
        },
        { key: '3', icon: <BookOpen className="w-4 h-4" />, label: 'Course Management' },
        { key: 'view-courses', icon: <BookOpen className="w-4 h-4" />, label: 'View Course' },
        { key: '4', icon: <ClipboardList className="w-4 h-4" />, label: 'Attendance Reports' },
      ],
    },
    {
      key: 'settings',
      icon: <Settings className="w-4 h-4" />,
      label: 'Settings'
    }
  ];

  return (
    <>
    <div className="uxer-layout">
      <style>{`
        input.search-bar-input[type="text"], div.search-bar-wrapper > input[type="text"] { padding-left: 46px !important; }
        div.search-bar-wrapper > svg.search-bar-icon, svg.search-bar-icon { position: absolute !important; left: 14px !important; top: 50% !important; transform: translateY(-50%) !important; pointer-events: none !important; color: #6b7280 !important; z-index: 10 !important; }
        div.search-bar-wrapper { position: relative !important; display: flex !important; align-items: center !important; }
      `}</style>
      {/* Sidebar Navigation */}
      <aside className="uxer-sidebar">
        <div className="uxer-sidebar-logo">
          {logoUrl ? <img src={logoUrl} alt="Org Logo" style={{ maxHeight: '32px', maxWidth: '100%', objectFit: 'contain' }} /> : null}
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#111111', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.organizationName || 'AASC'}</span>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          <div className="uxer-sidebar-item" style={{ fontWeight: '800', fontSize: '16px', color: '#111111' }}><Home className="w-5 h-5" /> Dashboard</div>
          
          <div onClick={() => setActiveTab('1')} className={`uxer-sidebar-item ${activeTab === '1' ? 'active' : ''}`}><Users className="w-5 h-5" /> Manage Faculty</div>
          <div onClick={() => setActiveTab('2')} className={`uxer-sidebar-item ${(activeTab === '2' || activeTab === '2-1' || activeTab === '2-2') ? 'active' : ''}`}><Users className="w-5 h-5" /> Manage Students</div>

          <div onClick={() => setActiveTab('3')} className={`uxer-sidebar-item ${activeTab === '3' ? 'active' : ''}`}><BookOpen className="w-5 h-5" /> Course Management</div>
          <div onClick={() => setActiveTab('view-courses')} className={`uxer-sidebar-item ${activeTab === 'view-courses' ? 'active' : ''}`}><Eye className="w-5 h-5" /> View Course</div>
          <div onClick={() => setActiveTab('billing')} className={`uxer-sidebar-item ${activeTab === 'billing' ? 'active' : ''}`}><Banknote className="w-5 h-5" /> Billing Management</div>
          <div onClick={() => setActiveTab('admission')} className={`uxer-sidebar-item ${activeTab === 'admission' ? 'active' : ''}`}><UserPlus className="w-5 h-5" /> Student Admission</div>
          <div onClick={() => setActiveTab('reports')} className={`uxer-sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}><FileText className="w-5 h-5" /> Reports</div>


          <div onClick={() => setActiveTab('settings')} className={`uxer-sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}><Settings className="w-5 h-5" /> Settings</div>
        </div>

        <div style={{ padding: '0 8px', marginTop: 'auto' }}>
        </div>

        {/* Sidebar Bottom Profile Widget */}
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: 'auto -12px -20px -12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={avatarInputRef} onChange={handleAvatarUpload} />
            {user?.documents?.profilePhotoUrl || user?.photoUrl ? (
              <img onClick={() => avatarInputRef.current?.click()} src={user?.documents?.profilePhotoUrl || user?.photoUrl} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0, opacity: uploadingAvatar ? 0.5 : 1, cursor: 'pointer' }} />
            ) : (
              <div onClick={() => avatarInputRef.current?.click()} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 'bold', border: '1px solid var(--border-color)', flexShrink: 0, opacity: uploadingAvatar ? 0.5 : 1, cursor: 'pointer' }}>
                {uploadingAvatar ? <Clock style={{ width: '16px', height: '16px' }} /> : (user?.name?.charAt(0).toUpperCase() || 'A')}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name || 'Admin'}</span>
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
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#000000', margin: 0 }}>Admin Dashboard</h1>
          </div>
          <div className="uxer-header-right">
            {!(activeTab === '3' || activeTab === 'view-courses' || activeTab === 'admission') && (
              <div className="uxer-search">
                <Search className="w-4 h-4" style={{ color: '#999' }} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab === '1' ? 'faculty' : (activeTab === '2' || activeTab === '2-1' || activeTab === '2-2' ? 'students' : (activeTab === 'journey' ? 'student journey' : (activeTab === 'reports' ? 'reports...' : (activeTab === 'billing' ? 'billing records...' : '...'))))}`}
                  value={activeTab === '1' ? facultySearchQuery : (activeTab === '2' || activeTab === '2-1' || activeTab === '2-2' ? studentTextSearch : (activeTab === 'journey' ? journeySearchQuery : (activeTab === 'reports' ? reportSearchQuery : (activeTab === 'billing' ? billingSearchQuery : ''))))}
                  onChange={(e) => {
                    if (activeTab === '1') setFacultySearchQuery(e.target.value);
                    else if (activeTab === '2' || activeTab === '2-1' || activeTab === '2-2') setStudentTextSearch(e.target.value);
                    else if (activeTab === 'journey') setJourneySearchQuery(e.target.value);
                    else if (activeTab === 'reports') setReportSearchQuery(e.target.value);
                    else if (activeTab === 'billing') setBillingSearchQuery(e.target.value);
                  }}
                />
                <div className="uxer-shortcut">&#8984; F</div>
              </div>
            )}
            
            {activeTab === '1' && (
              <div style={{ position: 'relative' }}>
                <select 
                  value={facultyRoleFilter} 
                  onChange={(e) => setFacultyRoleFilter(e.target.value)} 
                  className="uxer-dropdown-btn"
                  style={{ appearance: 'none', paddingRight: '28px', backgroundColor: 'transparent', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  <option value="All">All Roles</option>
                  {Array.from(new Set(staffList.map(s => s.facultyRole || s.role).filter(Boolean).filter(r => r !== 'staff'))).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4" style={{ color: '#999', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            )}

            {(activeTab === '1' || activeTab === '2' || activeTab === '2-1' || activeTab === '2-2') && (
              <button 
                onClick={() => {
                   if (activeTab === '1') {
                     message.info('Faculty export not yet implemented');
                   } else {
                     handleBulkSingleCSV(filteredStudentList(studentList));
                   }
                }} 
                className="uxer-dropdown-btn"
              >
                Export <Download className="w-4 h-4" style={{ color: '#999', marginLeft: '6px' }} />
              </button>
            )}

            {activeTab === '1' && (
              <button onClick={() => setIsAddFacultyModalVisible(true)} className="uxer-btn-green">
                + New Faculty
              </button>
            )}
            
            {(activeTab === '2' || activeTab === '2-1' || activeTab === '2-2') && (
              <button onClick={() => setActiveTab('2-2')} className="uxer-btn-green">
                + New Student
              </button>
            )}
            
          </div>
        </header>

        {/* Content Wrapper */}
        <div style={{ width: '100%', boxSizing: 'border-box' }}>

          <div style={{ width: '100%' }}>
            {activeTab === '1' && (
                <div className="flex flex-col">
                  <div className="uxer-toolbar">
                    <div className="uxer-tabs">
                      <div className="uxer-tab active">All Faculty</div>
                    </div>
                    <div className="uxer-actions">
                    </div>
                  </div>

                  {(() => {
                    const filteredStaffList = staffList.filter(s => {
                      const q = facultySearchQuery.toLowerCase();
                      const matchesSearch = (s.name || '').toLowerCase().includes(q) || 
                             (s.email || '').toLowerCase().includes(q) || 
                             (s.facultyId || '').toLowerCase().includes(q);
                      const sRole = s.facultyRole || s.role;
                      const matchesRole = facultyRoleFilter === 'All' || (sRole && typeof sRole === 'string' && sRole.trim() === facultyRoleFilter.trim());
                      return matchesSearch && matchesRole;
                    });
                    return (
                      <div className="uxer-table-card">
                        <Table 
                          dataSource={filteredStaffList.slice((facultyCurrentPage - 1) * 20, facultyCurrentPage * 20)} 
                          columns={staffColumns} 
                          rowKey="id" 
                          pagination={false} 
                          scroll={{ x: 'max-content' }} 
                          className="uxer-ant-table" 
                        />
                        <CustomPagination 
                          currentPage={facultyCurrentPage} 
                          totalItems={filteredStaffList.length} 
                          itemsPerPage={20} 
                          onPageChange={setFacultyCurrentPage} 
                        />
                      </div>
                    );
                  })()}
                  {isAddFacultyModalVisible && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Add New Faculty Member</h2>
                          <button onClick={() => setIsAddFacultyModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
                        </div>
                        <form onSubmit={(e) => { 
                          e.preventDefault(); 
                          handleCreateStaff(staffForm.getFieldsValue()); 
                          setIsAddFacultyModalVisible(false);
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Faculty Name</label>
                            <input type="text" placeholder="Enter faculty name" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => staffForm.setFieldsValue({name: e.target.value})} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Faculty ID</label>
                            <input type="text" placeholder="Enter Faculty/Employee ID" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => staffForm.setFieldsValue({facultyId: e.target.value})} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Faculty Email</label>
                            <input type="email" placeholder="Enter faculty email" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => {
                              staffForm.setFieldsValue({email: e.target.value});
                              if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(e.target.value)) {
                                e.target.setCustomValidity('Please enter a valid Email address');
                              } else {
                                e.target.setCustomValidity('');
                              }
                            }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Faculty Phone Number</label>
                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                              <span style={{ padding: '10px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '6px 0 0 6px', color: 'var(--text-secondary)' }}>+91 (IN)</span>
                              <input type="text" placeholder="Enter faculty phone number" required style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '0 6px 6px 0', boxSizing: 'border-box' }} onChange={(e) => {
                                // Block letters by stripping non-digits if needed, or just warn
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length > 10) val = val.slice(0, 10);
                                e.target.value = val;
                                staffForm.setFieldsValue({phoneNumber: val});
                                if (!/^[6-9]\d{9}$/.test(val)) {
                                  e.target.setCustomValidity('Please enter a valid 10-digit mobile number');
                                } else {
                                  e.target.setCustomValidity('');
                                }
                              }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Role</label>
                            <input type="text" list="faculty-roles-add" placeholder="e.g. Programming Staff" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => staffForm.setFieldsValue({role: e.target.value})} />
                            <datalist id="faculty-roles-add">
                              {Array.from(new Set(staffList.map(s => s.role).filter(Boolean))).map(role => (
                                <option key={role} value={role} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Age (Optional)</label>
                            <input type="number" placeholder="Enter age" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => staffForm.setFieldsValue({age: e.target.value})} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Previous Experience / Workplace (Optional)</label>
                            <input type="text" placeholder="e.g. 5 Years at XYZ Institute" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => staffForm.setFieldsValue({experience: e.target.value})} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Degree / Qualification (Optional)</label>
                            <input type="text" placeholder="e.g. Ph.D. in Physics" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => staffForm.setFieldsValue({degree: e.target.value})} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Address (Optional)</label>
                            <textarea placeholder="Enter complete address" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }} onChange={(e) => staffForm.setFieldsValue({address: e.target.value})} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <button type="button" onClick={() => setIsAddFacultyModalVisible(false)} style={{ padding: '10px 24px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #f87171', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" disabled={loading} style={{ padding: '10px 24px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Create Faculty</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {isViewFacultyModalVisible && selectedViewFaculty && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="custom-modal-viewport-card" style={{ backgroundColor: '#ffffff', color: '#111827', width: '600px', maxWidth: '94%', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        
                        <button 
                          onClick={() => setIsViewFacultyModalVisible(false)}
                          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <X className="w-6 h-6 text-slate-400 hover:text-slate-700" />
                        </button>

                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px', color: '#111827' }}>
                          Faculty Details
                        </h2>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Faculty ID</div>
                            <div style={{ fontSize: '15px' }}>{selectedViewFaculty.facultyId || 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Full Name</div>
                            <div style={{ fontSize: '15px' }}>{selectedViewFaculty.name || 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                            <div style={{ fontSize: '15px' }}>{selectedViewFaculty.email || 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Phone Number</div>
                            <div style={{ fontSize: '15px' }}>{selectedViewFaculty.phoneNumber ? `+91 ${selectedViewFaculty.phoneNumber}` : 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Age</div>
                            <div style={{ fontSize: '15px' }}>{selectedViewFaculty.age || 'N/A'}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Previous Experience</div>
                            <div style={{ fontSize: '15px' }}>{selectedViewFaculty.experience || 'N/A'}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Degree / Qualification</div>
                            <div style={{ fontSize: '15px' }}>{selectedViewFaculty.degree || 'N/A'}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '13px', textTransform: 'uppercase', marginBottom: '4px' }}>Address</div>
                            <div style={{ fontSize: '15px', lineHeight: '1.5' }}>{selectedViewFaculty.address || 'N/A'}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                          <button 
                            onClick={() => setIsViewFacultyModalVisible(false)} 
                            style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#111827', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {isViewAssignedStudentsModalVisible && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '600px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Assigned Students for {assignedStudentsCourseName}</h2>
                      <button onClick={() => setIsViewAssignedStudentsModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
                    </div>
                    
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {assignedStudentsList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No students specifically assigned to this faculty entry.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {assignedStudentsList.map((student, idx) => (
                            <div key={idx} style={{ padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--theme-bg-premium)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--blue-100)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                                  {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{student.name}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{student.enrollmentNo || 'N/A'}</div>
                                </div>
                              </div>
                              <div style={{ 
                                padding: '4px 12px', 
                                borderRadius: '12px', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                backgroundColor: student.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                color: student.status === 'Active' ? '#166534' : '#991b1b'
                              }}>
                                {student.status || 'Active'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        onClick={() => setIsViewAssignedStudentsModalVisible(false)} 
                        style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#111827', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === '2' || activeTab === '2-1' || activeTab === '2-2') && (
                <div className="flex flex-col">
                  {isAddStudentModalVisible && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>Add Single Student</h2>
                        <form onSubmit={(e) => { 
                          e.preventDefault(); 
                          const currentVals = studentForm.getFieldsValue();
                          handleCreateStudent({
                            enrollmentNo: currentVals.enrollmentNo || "",
                            course: currentVals.course || "",
                            name: currentVals.name || "",
                            gender: currentVals.gender || "",
                            age: currentVals.age !== undefined ? currentVals.age : "",
                            batch: currentVals.batch || "",
                            dob: currentVals.dob || "",
                            dateOfJoining: currentVals.dateOfJoining || "",
                            courseFee: currentVals.courseFee !== undefined ? currentVals.courseFee : "",
                            phoneNumber: currentVals.phoneNumber || "",
                            parentPhone: currentVals.parentPhone || "",
                            status: currentVals.status || "Active",
                            email: currentVals.email || ""
                          }); 
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Enrollment No.</label>
                            <input type="text" placeholder="Enrollment Number" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({enrollmentNo: e.target.value})} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Course</label>
                            <input type="text" placeholder="Course Name" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => studentForm.setFieldsValue({course: e.target.value})} />
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
                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                              <span style={{ padding: '10px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '6px 0 0 6px', color: 'var(--text-secondary)' }}>+91 (IN)</span>
                              <input type="text" placeholder="Enter student phone number" required style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '0 6px 6px 0', boxSizing: 'border-box' }} onChange={(e) => {
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
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Parent Phone Number</label>
                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                              <span style={{ padding: '10px 12px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '6px 0 0 6px', color: 'var(--text-secondary)' }}>+91 (IN)</span>
                              <input type="text" placeholder="Parent Phone" style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '0 6px 6px 0', boxSizing: 'border-box' }} onChange={(e) => {
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
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                            <button type="button" onClick={() => setIsAddStudentModalVisible(false)} style={{ padding: '8px 16px', backgroundColor: 'var(--border-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button type="submit" disabled={loading} style={{ padding: '8px 16px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create Student</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {activeTab === '2-2' && (
                    <div className="w-full max-w-3xl flex flex-col gap-6">
                      <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-indigo-800 text-sm text-center shadow-sm">
                        <strong>Instructions:</strong> Please upload a CSV file with columns <code>Name</code>, <code>Email</code>, <code>Gender</code>, <code>DOB</code>, <code>DateOfJoining</code>, <code>EnrollmentNo</code>, <code>Course</code>, <code>CourseFee</code>, <code>StudentPhone</code>, <code>ParentPhone</code>, <code>Status</code>.
                      </div>
                      <div className="w-full flex flex-col items-center gap-4">
                        <Dragger
                          accept=".csv"
                          beforeUpload={processCSV}
                          showUploadList={false}
                          disabled={csvUploading}
                          className="w-full p-10 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all shadow-sm"
                        >
                          <p className="ant-upload-drag-icon">
                            <UploadCloud className="w-14 h-14 text-indigo-500 mx-auto mb-4" />
                          </p>
                          <p className="text-xl font-semibold text-slate-700">Click or drag CSV file to this area to upload</p>
                          <p className="text-slate-500 mt-3 text-base">
                            Strictly single CSV file upload. {csvUploading && <span className="text-indigo-600 font-semibold animate-pulse block mt-2">Processing...</span>}
                          </p>
                        </Dragger>
                        <Button size="large" className="w-full max-w-xs mt-2" onClick={() => setActiveTab('2')}>
                          Cancel Bulk Import
                        </Button>
                      </div>
                    </div>
                  )}

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
                          {courseList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <button 
                          className="uxer-action-btn"
                          onClick={() => setStudentSortOrder(prev => prev === 'A-Z' ? '' : 'A-Z')}
                        >
                          <TrendingUp className="w-4 h-4" style={{ marginRight: '6px' }} /> 
                          {studentSortOrder === 'A-Z' ? 'Sort: A-Z' : 'Sort'}
                        </button>
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
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentRecords.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No students found.</td></tr>
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
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                          <button
                                            onClick={() => { setEditingUser(s); editForm.setFieldsValue(s); setIsEditModalVisible(true); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                            title="Edit"
                                          ><Pencil size={18} /></button>
                                          <Popconfirm title="Are you sure you want to delete this student?" onConfirm={() => handleDeleteUser(s.id)} okText="Yes" cancelText="No">
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete">
                                              <Trash2 size={18} />
                                            </button>
                                          </Popconfirm>
                                          <button
                                            onClick={() => { setSelectedJourneyStudent(s); setIsJourneyProfileModalVisible(true); }}
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

                </div>
              )}

              {activeTab === '3' && (
                <div className="flex flex-col">
                  <div className="uxer-toolbar">
                    <div className="uxer-tabs">
                      <div className="uxer-tab active">Course Management</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="uxer-table-card" style={{ padding: '24px' }}>
                      <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500" /> Create Custom Course</h3>
                      <Form form={courseForm} layout="vertical" onFinish={handleCreateCourse}>
                        <Form.Item name="name" label="Course Name" rules={[{ required: true }]}>
                          <Input placeholder="Enter custom course name" size="large" />
                        </Form.Item>
                        <Form.Item name="modules" label="Modules">
                          <Input.TextArea placeholder="Enter course modules separated by commas or newlines" rows={3} />
                        </Form.Item>
                        <Form.Item name="contentUrl" label="Syllabus & GitHub Repository Links">
                          <Input placeholder="Enter Syllabus or GitHub URLs" size="large" />
                        </Form.Item>
                        <Form.Item label="Upload Official Syllabus PDF">
                          <Upload.Dragger
                            multiple
                            beforeUpload={() => false}
                            fileList={courseFileList}
                            onChange={(info) => setCourseFileList(info.fileList)}
                            className="bg-slate-50"
                          >
                            <p className="ant-upload-drag-icon flex justify-center">
                              <UploadCloud className="w-8 h-8 text-indigo-500" />
                            </p>
                            <p className="text-slate-600 font-medium">Click or drag files to upload</p>
                          </Upload.Dragger>
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full">
                          Create Course
                        </Button>
                      </Form>
                    </div>

                    <div className="uxer-table-card" style={{ padding: '24px' }}>
                      <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-green-500" /> Assign Faculty to Course</h3>
                      <Form form={assignmentForm} layout="vertical" onFinish={handleCreateAssignment}>
                        <Form.Item name="courseName" label="Select Course or Module" rules={[{ required: true }]}>
                          <Select 
                            showSearch
                            placeholder="Select a course or specific module" 
                            size="large" 
                            onChange={(val) => setSelectedCourseForEnrollment(val)}
                            onSearch={(val) => setCourseSearchQuery(val)}
                            filterOption={(input, option) =>
                              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            <Select.OptGroup label={<span className="font-bold text-slate-800">COURSES</span>}>
                              {courseList.map(course => {
                                const cleanName = (course.name || "").replace(" (Full Course)", "");
                                return (
                                  <Select.Option key={`course-${course.id}`} value={course.name}>
                                    {renderHighlightedText(cleanName, courseSearchQuery)}
                                  </Select.Option>
                                );
                              })}
                            </Select.OptGroup>
                            <Select.OptGroup label={<span className="font-bold text-slate-800">MODULES</span>}>
                              {Array.from(new Set(
                                courseList.flatMap(course => 
                                  (course.modules || "").split(/[\n,]+/).map(m => m.trim()).filter(m => m)
                                )
                              )).map(module => (
                                <Select.Option key={`module-${module}`} value={module}>
                                  {renderHighlightedText(module, courseSearchQuery)}
                                </Select.Option>
                              ))}
                            </Select.OptGroup>
                          </Select>
                        </Form.Item>
                        <Form.Item name="staffId" label="Assign Faculty Member" rules={[{ required: true }]}>
                          <Select placeholder="Select faculty" size="large">
                            {staffList.map(staff => <Select.Option key={staff.id} value={staff.id}>{staff.name}</Select.Option>)}
                          </Select>
                        </Form.Item>
                        <Form.Item name="classTiming" label="Class Timings" rules={[{ required: true }]}>
                          <Input placeholder="e.g., 10:00 AM - 11:30 AM" size="large" />
                        </Form.Item>
                        <Form.Item name="dateRange" label="Start & End Dates" rules={[{ required: true }]}>
                          <DatePicker.RangePicker className="w-full" size="large" />
                        </Form.Item>
                        <Form.Item name="studentIds" label="Assign Students" rules={[{ required: true }]}>
                          <Select
                            mode="multiple"
                            placeholder="Select students to enroll"
                            size="large"
                            maxTagCount={0}
                            maxTagPlaceholder={(omitted) => `${omitted.length} Students Selected`}
                            popupRender={() => {
                              const baseList = studentList.filter(s => !selectedCourseForEnrollment || s.course === selectedCourseForEnrollment);
                              
                              const sortedStudents = [...baseList].sort((a, b) => {
                                const q = studentSearchQuery.toLowerCase();
                                
                                const aMatch = q ? (a.name?.toLowerCase().includes(q) || a.enrollmentNo?.toLowerCase().includes(q)) : false;
                                const bMatch = q ? (b.name?.toLowerCase().includes(q) || b.enrollmentNo?.toLowerCase().includes(q)) : false;
                                
                                const aSelected = selectedStudentIds.includes(a.id);
                                const bSelected = selectedStudentIds.includes(b.id);
                                
                                if (q) {
                                  if (aMatch && !bMatch) return -1;
                                  if (!aMatch && bMatch) return 1;
                                }
                                
                                if (aSelected && !bSelected) return -1;
                                if (!aSelected && bSelected) return 1;
                                
                                return (a.name || '').localeCompare(b.name || '');
                              });
                              
                              return (
                                <div onMouseDown={(e) => e.preventDefault()}>
                                  <div className="p-3 border-b border-slate-200">
                                    <Input 
                                      placeholder="Search by name or enrollment number..." 
                                      value={studentSearchQuery}
                                      onChange={e => setStudentSearchQuery(e.target.value)}
                                      prefix={<Search className="w-4 h-4 text-slate-400" />}
                                      onKeyDown={e => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="max-h-60 overflow-y-auto p-2">
                                    <Checkbox.Group 
                                      className="w-full flex flex-col gap-2"
                                      value={selectedStudentIds}
                                      onChange={(checkedValues) => {
                                         assignmentForm.setFieldsValue({ studentIds: checkedValues });
                                      }}
                                    >
                                      {sortedStudents.map(student => (
                                        <Checkbox key={student.id} value={student.id} className="ml-0! w-full hover:bg-slate-50 p-2 rounded-md transition-colors border border-transparent">
                                          <div className="flex justify-between items-center w-full ml-2">
                                            <span className="font-medium text-slate-700">{student.name}</span>
                                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{student.enrollmentNo || 'N/A'}</span>
                                          </div>
                                        </Checkbox>
                                      ))}
                                      {sortedStudents.length === 0 && (
                                        <div className="text-center text-slate-500 py-4 text-sm">No students available for this course.</div>
                                      )}
                                    </Checkbox.Group>
                                  </div>
                                </div>
                              );
                            }}
                          >
                            {studentList.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                          </Select>
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full border-none">
                          Assign Course
                        </Button>
                      </Form>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                      <h3 className="text-lg font-semibold m-0 text-slate-800">Assigned Courses Roster</h3>
                      <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-hover)', padding: '4px', borderRadius: '8px' }}>
                        <button 
                          onClick={() => { setCourseTab('active'); setCourseCurrentPage(1); }}
                          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '14px', backgroundColor: courseTab === 'active' ? 'var(--card-bg)' : 'transparent', color: courseTab === 'active' ? 'var(--text-main)' : 'var(--text-secondary)', boxShadow: courseTab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                        >
                          Active Assigned Courses
                        </button>
                        <button 
                          onClick={() => { setCourseTab('history'); setCourseCurrentPage(1); }}
                          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold', fontSize: '14px', backgroundColor: courseTab === 'history' ? 'var(--card-bg)' : 'transparent', color: courseTab === 'history' ? 'var(--text-main)' : 'var(--text-secondary)', boxShadow: courseTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                        >
                          History of Assigned Courses
                        </button>
                      </div>
                    </div>
                    <div className="w-full overflow-x-auto">
                      {(() => {
                        const currentDate = new Date();
                        const filteredAssignments = assignmentList.filter(assignment => {
                          if (!assignment.endDate) return courseTab === 'active';
                          const endDate = new Date(assignment.endDate);
                          endDate.setHours(23, 59, 59, 999);
                          if (courseTab === 'active') {
                            return currentDate <= endDate;
                          } else {
                            return currentDate > endDate;
                          }
                        });
                        
                        return (
                          <>
                            <Table 
                              dataSource={filteredAssignments.slice((courseCurrentPage - 1) * 20, courseCurrentPage * 20)} 
                              columns={assignmentColumns} 
                              rowKey="id" 
                              pagination={false} 
                              scroll={{ x: 'max-content' }} 
                              rowClassName={(record) => courseTab === 'history' ? 'completed-course-card' : ''}
                            />
                            <CustomPagination 
                              currentPage={courseCurrentPage} 
                              totalItems={filteredAssignments.length} 
                              itemsPerPage={20} 
                              onPageChange={setCourseCurrentPage} 
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'view-courses' && (
                <div className="flex flex-col">
                  <div className="uxer-toolbar">
                    <div className="uxer-tabs">
                      <div className="uxer-tab active">Master Course Catalog</div>
                    </div>
                  </div>
                  <div className="uxer-table-card course-catalog-container" style={{ padding: '24px' }}>
                  <Collapse 
                    className="course-accordion bg-slate-50 border-slate-200"
                    items={courseList.map(course => ({
                      key: course.id,
                      label: <span className="font-bold text-slate-700">{(course.name || "").replace(" (Full Course)", "")}</span>,
                      className: "course-panel",
                      extra: (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          <Button type="text" size="small" icon={<Plus className="w-4 h-4 text-blue-600" />} onClick={(e) => { e.stopPropagation(); setCourseToEdit(course); setIsAddSubjectModalVisible(true); }} title="Add Module" />
                          <Button type="text" size="small" icon={<Pencil className="w-4 h-4 text-emerald-600" />} onClick={(e) => { e.stopPropagation(); setCourseToEdit(course); setNewCourseName(course.name); setIsEditCourseModalVisible(true); }} title="Edit Course Name" />
                          <Popconfirm title="Delete this entire course?" onConfirm={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }} okText="Yes" cancelText="No">
                            <Button type="text" danger size="small" icon={<Trash2 className="w-4 h-4" />} />
                          </Popconfirm>
                        </div>
                      ),
                      children: course.modules ? (
                        <div className="flex flex-col gap-2">
                          {course.modules.split(/[\n,]+/).map(m => m.trim()).filter(m => m).map(module => (
                            <div key={`${course.id}-${module}`} className="module-row flex justify-between items-center p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                              <span className="text-slate-600 font-medium">{module}</span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button type="text" size="small" icon={<Pencil className="w-4 h-4 text-emerald-600" />} onClick={() => { setCourseToEdit(course); setSubjectToEdit(module); setNewSubjectName(module); setIsEditSubjectModalVisible(true); }} title="Edit Module Name" />
                                <Popconfirm title="Remove this module from the course?" onConfirm={() => handleDeleteCourseModule(course.id, module, course.modules)} okText="Yes" cancelText="No">
                                  <Button type="text" danger size="small" icon={<Trash2 className="w-4 h-4" />} />
                                </Popconfirm>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic m-0 p-3">No specific modules defined.</p>
                      )
                    }))}
                  />
                  </div>
                </div>
              )}

              {false && (() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const filteredAttendance = attendanceHistoryList.filter(record => {
                  const matchTab = attendanceReportTab === 'daily' ? record.date === todayStr : record.date !== todayStr;
                  const matchBatch = attendanceBatchFilter === 'All' ? true : record.batchName === attendanceBatchFilter;
                  const matchFaculty = attendanceFacultyFilter === 'All' ? true : record.facultyName === attendanceFacultyFilter;
                  return matchTab && matchBatch && matchFaculty;
                });
                
                return (
                  <div style={{ backgroundColor: 'var(--panel-solid-white)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid var(--border-color)' }}>
                        <button 
                          onClick={() => setAttendanceReportTab('daily')}
                          style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: attendanceReportTab === 'daily' ? '2px solid var(--blue-500, #3b82f6)' : '2px solid transparent', color: attendanceReportTab === 'daily' ? 'var(--blue-500, #3b82f6)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.2s' }}
                        >Daily Attendance</button>
                        <button 
                          onClick={() => setAttendanceReportTab('history')}
                          style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: attendanceReportTab === 'history' ? '2px solid var(--blue-500, #3b82f6)' : '2px solid transparent', color: attendanceReportTab === 'history' ? 'var(--blue-500, #3b82f6)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.2s' }}
                        >Attendance History</button>
                      </div>

                      <div style={{ display: 'flex', gap: '16px' }}>
                        <select 
                          value={attendanceBatchFilter}
                          onChange={(e) => setAttendanceBatchFilter(e.target.value)}
                          style={{ padding: '10px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
                        >
                          <option value="All">All Batches</option>
                          {courseList.map(c => <option key={c.id} value={c.name}>{(c.name || "").replace(" (Full Course)", "")}</option>)}
                        </select>
                        
                        <select 
                          value={attendanceFacultyFilter}
                          onChange={(e) => setAttendanceFacultyFilter(e.target.value)}
                          style={{ padding: '10px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
                        >
                          <option value="All">All Faculty</option>
                          {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="global-responsive-scroll-wrapper" style={{ overflowX: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'var(--theme-bg-premium)', borderBottom: '2px solid var(--border-color)' }}>
                          <tr>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Batch Name</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Faculty</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Total Students</th>
                            <th style={{ padding: '16px', color: 'var(--green-600, #16a34a)', fontSize: '12px', textTransform: 'uppercase' }}>Present</th>
                            <th style={{ padding: '16px', color: 'var(--red-600, #dc2626)', fontSize: '12px', textTransform: 'uppercase' }}>Absent</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAttendance.length > 0 ? filteredAttendance.map(record => {
                            const totalPresent = record.totalPresentees !== undefined ? record.totalPresentees : (record.records?.filter(rec => rec.status === 'P').length || 0);
                            const totalAbsent = record.totalAbsentees !== undefined ? record.totalAbsentees : (record.records?.filter(rec => rec.status === 'A').length || 0);
                            return (
                                <tr key={`row-${record.id}`} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', transition: 'background-color 0.2s' }}>
                                  <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>{new Date(record.date).toLocaleDateString()}</td>
                                  <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px' }}>{record.batchName}</td>
                                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{record.facultyName}</td>
                                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{record.records?.length || 0}</td>
                                  <td style={{ padding: '16px', color: 'var(--green-600, #16a34a)', fontSize: '14px', fontWeight: 'bold' }}>{totalPresent}</td>
                                  <td style={{ padding: '16px', color: 'var(--red-600, #dc2626)', fontSize: '14px', fontWeight: 'bold' }}>{totalAbsent}</td>
                                  <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <button 
                                      onClick={() => setSelectedAttendanceReport(record)}
                                      style={{ padding: '8px 16px', backgroundColor: 'var(--blue-500, #3b82f6)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan="7" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                No attendance records found matching your filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {selectedAttendanceReport && (
                      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                        <div style={{ backgroundColor: 'var(--panel-solid-white)', width: '90%', maxWidth: '800px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                          
                          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                              Detailed Summary - {selectedAttendanceReport.batchName} ({new Date(selectedAttendanceReport.date).toLocaleDateString()})
                            </h4>
                            <button 
                              onClick={() => setSelectedAttendanceReport(null)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <X className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                            </button>
                          </div>
                          
                          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', alignContent: 'start' }}>
                            {selectedAttendanceReport.records && Array.isArray(selectedAttendanceReport.records) ? selectedAttendanceReport.records.map((r, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '15px' }}>{r.studentName}</span>
                                {r.status === 'P' ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green-600, #16a34a)', backgroundColor: 'rgba(22,163,74,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>Present</span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--red-600, #dc2626)', backgroundColor: 'rgba(220,38,38,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>Absent</span>
                                )}
                              </div>
                            )) : <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No records found for this batch.</p>}
                          </div>
                          
                          <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--green-500, #22c55e)' }}></div>
                                Total Present: {selectedAttendanceReport.totalPresentees !== undefined ? selectedAttendanceReport.totalPresentees : (selectedAttendanceReport.records?.filter(rec => rec.status === 'P').length || 0)}
                              </div>
                              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--red-500, #ef4444)' }}></div>
                                Total Absent: {selectedAttendanceReport.totalAbsentees !== undefined ? selectedAttendanceReport.totalAbsentees : (selectedAttendanceReport.records?.filter(rec => rec.status === 'A').length || 0)}
                              </div>
                            </div>
                            <button 
                              onClick={() => downloadAttendanceCSV(selectedAttendanceReport)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--blue-600, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                            >
                              <Download className="w-4 h-4" /> Download Report
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {activeTab === 'billing' && (
                <div className="flex flex-col">
                  
                  {/* Annual Financial Overview */}
                  <div className="uxer-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="uxer-stat-card">
                      <div className="uxer-stat-title">Cumulative Fees Collected</div>
                      <div className="uxer-stat-content">
                        <div className="uxer-stat-value">
                          ₹{billHistory.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="uxer-stat-card">
                      <div className="uxer-stat-title">Total Overdue Pending</div>
                      <div className="uxer-stat-content">
                        <div className="uxer-stat-value" style={{ color: 'var(--red-600, #dc2626)' }}>
                          ₹{studentList.reduce((sum, s) => { 
                            const courseFee = Number(s.totalCourseFee || s.courseFee || 28000);
                            const studentReceipts = billHistory.filter(t => t.studentId === s.id || (t.enrollmentNo && s.enrollmentNo && t.enrollmentNo === s.enrollmentNo));
                            const studentTotalPaid = studentReceipts.reduce((sSum, t) => sSum + (Number(t.amountPaid || t.totalAmount || t.amount) || 0), 0);
                            const pending = courseFee - studentTotalPaid;
                            return sum + (pending > 0 ? pending : 0);
                          }, 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Toolbar & Tabs */}
                  <div className="uxer-toolbar">
                    <div className="uxer-tabs">
                      <div 
                        className={`uxer-tab ${billingTab === 'ledger' ? 'active' : ''}`}
                        onClick={() => setBillingTab('ledger')}
                      >
                        Single Entry Ledger
                      </div>
                      <div 
                        className={`uxer-tab ${billingTab === 'history' ? 'active' : ''}`}
                        onClick={() => setBillingTab('history')}
                      >
                        Bill History
                      </div>
                      <div 
                        className={`uxer-tab ${billingTab === 'due_list' ? 'active' : ''}`}
                        onClick={() => setBillingTab('due_list')}
                      >
                        Fees Not Paid / Due List
                      </div>
                    </div>
                  </div>

                  {/* Tab 1: Single Entry Ledger */}
                  {billingTab === 'ledger' && (
                    <div className="uxer-table-card" style={{ padding: '24px', backgroundColor: 'var(--uxer-card)' }}>
                      <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>New Ledger Entry</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Date</label>
                          <input type="date" value={billingEntry.date} onChange={(e) => handleBillingEntryChange('date', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Bill Code</label>
                          <input type="text" value={billingEntry.billCode} onChange={(e) => handleBillingEntryChange('billCode', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: 'bold' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Enrollment No</label>
                          <input type="text" value={billingEntry.enrollmentNo} onChange={(e) => handleBillingEntryChange('enrollmentNo', e.target.value)} placeholder="Enter enrollment no" style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Student Info</label>
                          <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{billingEntry.studentName || 'N/A'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{billingEntry.course || 'N/A'} (Fees: ₹{billingEntry.totalFees})</div>
                          </div>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Payment Amount</label>
                          {billingEntry.remainingBalance <= 0 && billingEntry.studentId ? (
                            <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green-600, #16a34a)', borderRadius: '8px', fontWeight: 'bold' }}>
                              This student has cleared all fees.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="number" value={billingEntry.amountPaid} readOnly={billingEntry.mode === 'Split' || (billingEntry.remainingBalance <= 0 && billingEntry.studentId)} onChange={(e) => handleBillingEntryChange('amountPaid', e.target.value)} placeholder="Amount" style={{ width: '60%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: billingEntry.mode === 'Split' || (billingEntry.remainingBalance <= 0 && billingEntry.studentId) ? 'var(--bg-hover)' : 'var(--card-bg)', color: 'var(--text-main)', fontWeight: 'bold' }} />
                                <select value={billingEntry.mode} disabled={billingEntry.remainingBalance <= 0 && billingEntry.studentId} onChange={(e) => handleBillingEntryChange('mode', e.target.value)} className="uxer-form-select" style={{ width: '40%', padding: '10px', margin: 0 }}>
                                  <option value="Cash">Cash</option>
                                  <option value="GPay">GPay</option>
                                  <option value="Card">Card</option>
                                  <option value="Split">Split</option>
                                </select>
                              </div>
                              {billingEntry.mode === 'Split' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input type="number" value={billingEntry.cashAmount} disabled={billingEntry.remainingBalance <= 0 && billingEntry.studentId} onChange={(e) => handleBillingEntryChange('cashAmount', e.target.value)} placeholder="Cash Amount" style={{ width: '50%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)' }} />
                                  <input type="number" value={billingEntry.upiAmount} disabled={billingEntry.remainingBalance <= 0 && billingEntry.studentId} onChange={(e) => handleBillingEntryChange('upiAmount', e.target.value)} placeholder="GPay Amount" style={{ width: '50%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)' }} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Due Date (Optional)</label>
                          <input type="date" value={billingEntry.dueDate} onChange={(e) => handleBillingEntryChange('dueDate', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Payer & Cashier</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" placeholder="Payer" value={billingEntry.payer} onChange={(e) => handleBillingEntryChange('payer', e.target.value)} style={{ width: '50%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)' }} />
                            <input type="text" placeholder="Cashier" value={billingEntry.cashier} onChange={(e) => handleBillingEntryChange('cashier', e.target.value)} style={{ width: '50%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)' }} />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>Balance Summary</label>
                          <div style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {billingEntry.remainingBalance <= 0 && billingEntry.studentId ? (
                              <span style={{ fontWeight: 'bold', color: 'var(--green-600, #16a34a)' }}>Fully Paid / Cleared</span>
                            ) : (
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>₹{billingEntry.remainingBalance || 0} (Pending)</span>
                            )}
                            <span style={{ backgroundColor: (billingEntry.remainingBalance <= 0 && billingEntry.studentId) ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: (billingEntry.remainingBalance <= 0 && billingEntry.studentId) ? 'var(--green-600, #16a34a)' : 'var(--yellow-600, #ca8a04)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                              {(billingEntry.remainingBalance <= 0 && billingEntry.studentId) ? 'Cleared' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={handleSaveBillingEntry} 
                          disabled={billingEntry.remainingBalance <= 0 && billingEntry.studentId}
                          style={{ 
                            padding: '12px 24px', 
                            backgroundColor: (billingEntry.remainingBalance <= 0 && billingEntry.studentId) ? 'var(--bg-hover)' : 'var(--blue-600)', 
                            color: (billingEntry.remainingBalance <= 0 && billingEntry.studentId) ? 'var(--text-secondary)' : 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: (billingEntry.remainingBalance <= 0 && billingEntry.studentId) ? 'not-allowed' : 'pointer', 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px' 
                          }}
                        >
                          <CheckCircle size={18} /> Save Transaction
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab: Bill History */}
                  {billingTab === 'history' && (
                    <div className="uxer-table-card" style={{ padding: '24px', backgroundColor: 'var(--uxer-card)' }}>
                      <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>Bill Collection History</h3>
                      {(() => {
                        const filteredBillHistory = billHistory.filter(row => {
                          if (!billingSearchQuery) return true;
                          const q = billingSearchQuery.trim().toLowerCase();
                          const student = studentList.find(s => s.id === row.studentId);
                          const studentName = (student ? student.name : 'Unknown').toLowerCase();
                          const enrollmentNo = (student ? (student.enrollmentNo || student.enrollmentNumber || '') : '').toString().toLowerCase();
                          const billNum = (row.billNumber || '').toString().toLowerCase();
                          
                          return studentName.includes(q) || enrollmentNo.includes(q) || billNum.includes(q);
                        });

                        const groupedHistory = filteredBillHistory.reduce((acc, row) => {
                          const dateObj = new Date(row.paymentDate || row.timestamp?.seconds * 1000 || Date.now());
                          const monthStr = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
                          if (!acc[monthStr]) acc[monthStr] = [];
                          acc[monthStr].push(row);
                          return acc;
                        }, {});

                        if (Object.keys(groupedHistory).length === 0) {
                          return <div style={{ color: 'var(--text-secondary)' }}>No bill history available.</div>;
                        }

                        const handleExportMonthlyCSV = (month, rows) => {
                          const headers = ["Date", "Bill Number", "Student Name", "Course", "Amount Paid (INR)", "Payment Mode"];
                          const csvRows = [headers.join(",")];
                          let totalCollection = 0;

                          rows.forEach(row => {
                            const student = studentList.find(s => s.id === row.studentId);
                            const dateStr = new Date(row.paymentDate || row.timestamp?.seconds * 1000).toLocaleDateString();
                            const studentName = student ? student.name : 'Unknown';
                            const course = row.course || '';
                            const amount = row.totalAmount || 0;
                            const mode = row.paymentMode === 'Split' ? `Split (Cash: ${row.cashAmount || 0} | GPay: ${row.gpayAmount || 0})` : (row.paymentMode || 'Cash');
                            
                            totalCollection += Number(amount);
                            
                            csvRows.push(`"${dateStr}","${row.billNumber}","${studentName}","${course}","${amount}","${mode}"`);
                          });

                          csvRows.push(`,,,,"Total Collection","${totalCollection}"`);

                          const csvString = csvRows.join("\n");
                          const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.setAttribute("href", url);
                          link.setAttribute("download", `Monthly_Statement_${month.replace(' ', '_')}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        };

                        const handlePrintReceipt = (row) => {
                          const student = studentList.find(s => s.id === row.studentId);
                          const studentName = student ? student.name : 'Unknown';
                          const dateStr = new Date(row.paymentDate || row.timestamp?.seconds * 1000).toLocaleDateString();
                          const mode = row.paymentMode === 'Split' ? `Split (Cash: ${row.cashAmount || 0} | GPay: ${row.gpayAmount || 0})` : (row.paymentMode || 'Cash');
                          
                          const printWindow = window.open('', '_blank', 'width=800,height=600');
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Fee Receipt - ${row.billNumber}</title>
                                <style>
                                  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                                  .receipt-box { border: 1px solid #ddd; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                                  .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                                  .header .logo { max-height: 60px; width: auto; object-fit: contain; margin-bottom: 12px; }
                                  @media print { .header .logo { display: inline-block !important; -webkit-print-color-adjust: exact; } }
                                  .header h1 { margin: 0; color: #2563eb; }
                                  .header p { margin: 5px 0 0 0; color: #64748b; }
                                  .row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; }
                                  .label { font-weight: bold; color: #64748b; }
                                  .value { font-weight: 500; }
                                  .total-box { margin-top: 30px; padding-top: 20px; border-top: 2px dashed #ddd; display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #0f172a; }
                                  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
                                </style>
                              </head>
                              <body>
                                <div class="receipt-box">
                                  <div class="header">
                                    ${logoUrl ? `<img src="${logoUrl}" alt="Organization Logo" class="logo" />` : ''}
                                    <h1>${user?.organizationName || 'Organization'}</h1>
                                    <p>Fee Payment Receipt</p>
                                  </div>
                                  <div class="row">
                                    <span class="label">Receipt Number:</span>
                                    <span class="value">${row.billNumber}</span>
                                  </div>
                                  <div class="row">
                                    <span class="label">Date:</span>
                                    <span class="value">${dateStr}</span>
                                  </div>
                                  <div class="row">
                                    <span class="label">Student Name:</span>
                                    <span class="value">${studentName}</span>
                                  </div>
                                  <div class="row">
                                    <span class="label">Course:</span>
                                    <span class="value">${row.course || 'N/A'}</span>
                                  </div>
                                  <div class="row">
                                    <span class="label">Payment Mode:</span>
                                    <span class="value">${mode}</span>
                                  </div>
                                  <div class="total-box">
                                    <span>Total Amount Paid:</span>
                                    <span>₹${row.totalAmount}</span>
                                  </div>
                                  <div class="footer">
                                    This is a computer-generated receipt.
                                  </div>
                                </div>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.focus();
                          setTimeout(() => {
                            printWindow.print();
                            printWindow.close();
                          }, 250);
                        };

                        return (
                          <Collapse defaultActiveKey={[Object.keys(groupedHistory)[0]]} style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            {Object.entries(groupedHistory).map(([month, rows]) => {
                              const totalCollected = rows.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
                              return (
                                <Collapse.Panel 
                                  header={
                                    <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '16px' }}>
                                      <span>{month}</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{ color: 'var(--green-600)' }}>₹{totalCollected.toLocaleString()}</span>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleExportMonthlyCSV(month, rows); }}
                                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: 'var(--blue-500)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                          <Download size={14} /> Download Statement
                                        </button>
                                      </div>
                                    </div>
                                  }
                                  key={month}
                                >
                                  <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                      <thead style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <tr>
                                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>Date</th>
                                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>Bill Number</th>
                                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>Student Name</th>
                                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>Course</th>
                                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>Amount Paid</th>
                                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>Payment Mode</th>
                                          <th style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((row, idx) => {
                                          const student = studentList.find(s => s.id === row.studentId);
                                          const displayMode = row.paymentMode === 'Split' 
                                            ? `Split (Cash: ₹${row.cashAmount || 0} | GPay: ₹${row.gpayAmount || 0})` 
                                            : (row.paymentMode || 'Cash');
                                          return (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                              <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-main)' }}>{new Date(row.paymentDate || row.timestamp?.seconds * 1000).toLocaleDateString()}</td>
                                              <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-main)', fontWeight: 'bold' }}>{row.billNumber}</td>
                                              <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-main)' }}>{student ? student.name : 'Unknown'}</td>
                                              <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>{row.course}</td>
                                              <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--green-600)', fontWeight: 'bold' }}>₹{row.totalAmount}</td>
                                              <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>{displayMode}</td>
                                              <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                                <button onClick={() => handlePrintReceipt(row)} style={{ background: 'none', border: 'none', color: 'var(--blue-500)', cursor: 'pointer', padding: '4px' }} title="Print Receipt">
                                                  <FileText size={16} />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </Collapse.Panel>
                              );
                            })}
                          </Collapse>
                        );
                      })()}
                    </div>
                  )}

                  {/* Tab 2: Fees Not Paid / Due List */}
                  {billingTab === 'due_list' && (
                    <div className="uxer-table-card">
                      <div style={{ padding: '20px 24px', backgroundColor: 'var(--uxer-card)', borderBottom: '1px solid var(--uxer-border)' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>Outstanding Due List</h3>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Automatically tracked isolated list of students with pending balances.</p>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead style={{ borderBottom: '2px solid var(--border-color)' }}>
                            <tr>
                              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Enrollment No</th>
                              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Student Name</th>
                              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Course</th>
                              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Total Fees</th>
                              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Amount Paid</th>
                              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Pending Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const dueStudents = studentList.map(s => {
                                const total = Number(s.totalCourseFee || s.courseFee || 28000);
                                const studentReceipts = billHistory.filter(t => t.studentId === s.id || (t.enrollmentNo && s.enrollmentNo && t.enrollmentNo === s.enrollmentNo));
                                const paid = studentReceipts.reduce((sum, t) => sum + (Number(t.amountPaid || t.totalAmount || t.amount) || 0), 0);
                                const pending = total - paid;
                                return { ...s, dynamicTotal: total, dynamicPaid: paid, dynamicPending: pending };
                              }).filter(s => s.dynamicPending > 0);

                              if (dueStudents.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No outstanding dues across any students! 🎉</td>
                                  </tr>
                                );
                              }
                              
                              const totalDue = dueStudents.length;
                              const startIndex = (billingCurrentPage - 1) * 20;
                              const paginatedDue = dueStudents.slice(startIndex, startIndex + 20);
                              
                              return paginatedDue.map(s => {
                                return (
                                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px' }}>{s.enrollmentNo || s.id.substring(0, 6)}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px', fontWeight: 'bold' }}>{s.name}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{s.course || 'N/A'}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px' }}>₹{s.dynamicTotal.toLocaleString()}</td>
                                    <td style={{ padding: '16px', color: 'var(--green-600, #16a34a)', fontSize: '14px', fontWeight: 'bold' }}>₹{s.dynamicPaid.toLocaleString()}</td>
                                    <td style={{ padding: '16px', color: 'var(--red-600, #dc2626)', fontSize: '14px', fontWeight: 'bold' }}>₹{s.dynamicPending.toLocaleString()}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                        {(() => {
                          const dueStudents = studentList.map(s => {
                            const total = Number(s.totalCourseFee || s.courseFee || 28000);
                            const studentReceipts = billHistory.filter(t => t.studentId === s.id || (t.enrollmentNo && s.enrollmentNo && t.enrollmentNo === s.enrollmentNo));
                            const paid = studentReceipts.reduce((sum, t) => sum + (Number(t.amountPaid || t.totalAmount || t.amount) || 0), 0);
                            const pending = total - paid;
                            return { ...s, dynamicTotal: total, dynamicPaid: paid, dynamicPending: pending };
                          }).filter(s => s.dynamicPending > 0);
                          return (
                            <CustomPagination 
                              currentPage={billingCurrentPage} 
                              totalItems={dueStudents.length} 
                              itemsPerPage={20} 
                              onPageChange={setBillingCurrentPage} 
                            />
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="flex flex-col">
                  <div className="uxer-toolbar">
                    <div className="uxer-tabs">
                      <div className="uxer-tab active">Organization Settings</div>
                    </div>
                  </div>
                  <div className="uxer-table-card" style={{ padding: '24px' }}>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Logo Upload Widget */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-between" style={{ maxWidth: '300px' }}>
                      <div className="text-center w-full">
                        <h4 className="text-lg font-medium text-slate-700 mb-2">Organization Logo</h4>
                        <p className="text-xs text-slate-500 mb-6">Synchronized across all dashboards</p>
                      </div>
                      
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={() => false}
                        onChange={handleLogoUpload}
                        disabled={logoUploading}
                        className="w-full flex justify-center mb-4"
                      >
                        <div className="w-40 h-40 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center overflow-hidden cursor-pointer shadow-sm relative group bg-white">
                          {logoUrl ? (
                            <>
                              <img src={logoUrl} alt="Org Logo" className="w-full h-full object-contain p-2" />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ImageIcon className="w-8 h-8 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-600">
                              <UploadCloud className="w-8 h-8 mb-2" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Upload</span>
                            </div>
                          )}
                          {logoUploading && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                              <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                      </Upload>
                      {logoUrl && (
                        <Button 
                          type="primary" 
                          danger 
                          className="w-full mt-4" 
                          onClick={async () => {
                            setLogoUploading(true);
                            try {
                              await updateOrganizationLogo(user.organizationId, null);
                              setLogoUrl(null);
                              localStorage.removeItem('org_logo');
                              message.success('Organization logo removed successfully!');
                            } catch (error) {
                              message.error(error.message);
                            } finally {
                              setLogoUploading(false);
                            }
                          }}
                          loading={logoUploading}
                        >
                          Remove Logo
                        </Button>
                      )}
                    </div>

                    {/* Admin Profile Details Placeholder */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-700 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Admin Profile</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Name</p>
                            <p className="text-slate-800 font-medium">{user?.name || 'Administrator'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Email Address</p>
                            <p className="text-slate-800 font-medium">{user?.email}</p>
                          </div>
                        </div>
                      </div>
                      <Button className="mt-6 border-slate-300 text-slate-600 w-full" disabled>Edit Profile (Coming Soon)</Button>
                    </div>

                    {/* Security & Password Placeholder */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-700 mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-red-500" /> Security</h4>
                        <p className="text-sm text-slate-500 mb-4">Manage your password and security preferences. Ensure your account uses a strong, secure password.</p>
                      </div>
                      <Button className="border-slate-300 text-slate-600 w-full" disabled>Change Password (Coming Soon)</Button>
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {activeTab === 'journey' && (
                <div className="flex flex-col">
                  <div className="uxer-toolbar">
                    <div className="uxer-tabs">
                      <div className="uxer-tab active">Student Journey Hub</div>
                    </div>
                    <div className="uxer-actions">
                      <button 
                        onClick={() => {
                          const filteredJourneyStudents = studentList.filter(s => {
                            if (!journeySearchQuery) return true;
                            const q = journeySearchQuery.toLowerCase();
                            return (s.name || '').toLowerCase().includes(q) || 
                                   (s.enrollmentNo || '').toLowerCase().includes(q) || 
                                   (s.phoneNumber || '').includes(q) ||
                                   (s.batch || '').toLowerCase().includes(q);
                          });
                          handleBulkSingleCSV(filteredJourneyStudents);
                        }}
                        className="uxer-action-btn"
                      >
                        <Download className="w-4 h-4 text-green-600 mr-2" /> Download All
                      </button>
                    </div>
                  </div>
                  <div className="uxer-table-card" style={{ padding: '24px' }}>
                      
                    {/* Default Roster List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {studentList.filter(s => {
                        const q = journeySearchQuery.toLowerCase();
                        return (s.name || '').toLowerCase().includes(q) || 
                               (s.enrollmentNo || '').toLowerCase().includes(q) || 
                               (s.phoneNumber || '').includes(q) ||
                               (s.batch || '').toLowerCase().includes(q);
                      }).map(student => (
                        <div 
                          key={student.id} 
                          style={{ padding: '12px 24px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s ease-in-out' }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--accent-royal-purple)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                          onClick={() => {
                            setSelectedJourneyStudent(student);
                            setIsJourneyProfileModalVisible(true);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, flexWrap: 'wrap' }}>
                            {student.documents?.profilePhotoUrl || student.photoUrl ? (
                              <img src={student.documents?.profilePhotoUrl || student.photoUrl} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--accent-royal-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', border: '1px solid var(--border-color)' }}>
                                {student.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)' }}>{student.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {student.enrollmentNo || 'N/A'}</div>
                            </div>
                            <div style={{ flex: '1 1 150px', minWidth: '100px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Course</div>
                              <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{student.course || 'N/A'}</div>
                            </div>
                            <div style={{ flex: '1 1 150px', minWidth: '100px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Batch Year</div>
                              <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{student.batch || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJourneyStudent(student);
                              setIsJourneyProfileModalVisible(true);
                            }}
                            style={{ padding: '8px 16px', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--accent-royal-purple)', border: '1px solid var(--accent-royal-purple)', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px' }}
                          >
                            View Full Profile
                          </button>
                        </div>
                      ))}
                      {studentList.filter(s => {
                        const q = journeySearchQuery.toLowerCase();
                        return (s.name || '').toLowerCase().includes(q) || 
                               (s.enrollmentNo || '').toLowerCase().includes(q) || 
                               (s.phoneNumber || '').includes(q) ||
                               (s.batch || '').toLowerCase().includes(q);
                      }).length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>No students found matching your criteria.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

      {/* Journey Profile Modal Overlay */}
      {isJourneyProfileModalVisible && selectedJourneyStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '800px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '0', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header / Sticky Top */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--card-bg)', padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderRadius: '16px 16px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {selectedJourneyStudent.documents?.profilePhotoUrl || selectedJourneyStudent.photoUrl ? (
                  <img src={selectedJourneyStudent.documents?.profilePhotoUrl || selectedJourneyStudent.photoUrl} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--border-color)' }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--accent-royal-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px', border: '2px solid var(--border-color)' }}>
                    {selectedJourneyStudent.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)' }}>{selectedJourneyStudent.name}</h2>
                  <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Enrollment ID: {selectedJourneyStudent.enrollmentNo || 'N/A'} | Course: {selectedJourneyStudent.course || 'N/A'}</div>
                </div>
              </div>
              <button 
                onClick={() => { setIsJourneyProfileModalVisible(false); setSelectedJourneyStudent(null); }} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: '20px' }}>
              <div style={{ position: 'relative', paddingLeft: '40px' }}>
                 {/* Timeline Line */}
                 <div style={{ position: 'absolute', top: 0, bottom: 0, left: '15px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
                 
                 {/* Node: Joining & Leaving Dates */}
                 <div style={{ position: 'relative', marginBottom: '32px' }}>
                   <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--green-500, #22c55e)', border: '4px solid var(--card-bg)' }}></div>
                   <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '4px' }}>Enrollment Timeline</div>
                   <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                     <div style={{ flex: 1, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                       <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Date of Joining</div>
                       {selectedJourneyStudent.dateOfJoining || (selectedJourneyStudent.createdAt ? new Date(selectedJourneyStudent.createdAt.seconds * 1000).toLocaleDateString() : 'Timestamp Not Available')}
                       <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '8px' }}>Account Initialized</div>
                     </div>
                     
                     {(selectedJourneyStudent.currentStatus === 'Completed' || selectedJourneyStudent.currentStatus === 'Drop-out') && (
                       <div style={{ flex: 1, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                         <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Date of Leaving</div>
                         {selectedJourneyStudent.dateOfLeaving ? new Date(selectedJourneyStudent.dateOfLeaving).toLocaleDateString() : 'Not Recorded'}
                         <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '8px' }}>Status: {selectedJourneyStudent.currentStatus}</div>
                       </div>
                     )}
                   </div>
                 </div>
                 
                 {/* Personal Metadata Node */}
                 <div style={{ position: 'relative', marginBottom: '32px' }}>
                   <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--blue-400, #60a5fa)', border: '4px solid var(--card-bg)' }}></div>
                   <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '4px' }}>Personal Metadata</div>
                   <div style={{ fontSize: '15px', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                       <div><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', fontSize: '12px', textTransform: 'uppercase' }}>Gmail</span> {selectedJourneyStudent.email || 'N/A'}</div>
                       <div><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', fontSize: '12px', textTransform: 'uppercase' }}>Phone Number</span> {selectedJourneyStudent.phoneNumber || 'N/A'}</div>
                       <div><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', fontSize: '12px', textTransform: 'uppercase' }}>Parent/Guardian Mobile</span> {selectedJourneyStudent.parentPhone || 'N/A'}</div>
                       <div><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', fontSize: '12px', textTransform: 'uppercase' }}>Age</span> {selectedJourneyStudent.age || 'N/A'}</div>
                       <div><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', fontSize: '12px', textTransform: 'uppercase' }}>Batch</span> {selectedJourneyStudent.batch || 'N/A'}</div>
                       <div><span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', fontSize: '12px', textTransform: 'uppercase' }}>Identity Token</span> [Aadhaar Redacted]</div>
                     </div>
                   </div>
                 </div>

                 {/* Attendance Telemetry Node */}
                 <div style={{ position: 'relative', marginBottom: '32px' }}>
                   <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--yellow-500, #eab308)', border: '4px solid var(--card-bg)' }}></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                     <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Attendance Telemetry</div>
                     <button onClick={() => setIsJourneyAttendanceModalVisible(true)} style={{ background: 'none', border: 'none', color: 'var(--blue-500, #3b82f6)', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '13px' }}>View Details</button>
                   </div>
                   <div style={{ fontSize: '15px', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                     {(() => {
                       let present = 0, absent = 0;
                       const unique = [];
                       if (selectedJourneyStudent && attendanceHistoryList) {
                         const map = new Map();
                         attendanceHistoryList.forEach(log => {
                           if (log.isFinal === false) return; // Skip drafts
                           const rec = log.records?.find(r => r.studentName === selectedJourneyStudent.name);
                           if (rec) {
                             const key = `${log.date}_${log.batchName}_${log.slot}`;
                             if (!map.has(key)) {
                               map.set(key, { date: log.date, batch: log.batchName, slot: log.slot, status: rec.status, faculty: log.facultyName });
                             }
                           }
                         });
                         map.forEach(v => {
                           unique.push(v);
                           if (v.status === 'P') present++;
                           if (v.status === 'A') absent++;
                         });
                         unique.sort((a,b) => new Date(b.date) - new Date(a.date));
                       }
                       return (
                         <div style={{ display: 'flex', gap: '32px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Classes Attended (Present)</span>
                              <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--green-600, #16a34a)' }}>{present}</span>
                           </div>
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Classes Skipped (Absent)</span>
                              <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--red-600, #dc2626)' }}>{absent}</span>
                           </div>
                         </div>
                       );
                     })()}
                   </div>
                 </div>

                 {/* Academic Performance Node */}
                 <div style={{ position: 'relative', marginBottom: '32px' }}>
                   <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--indigo-500, #6366f1)', border: '4px solid var(--card-bg)' }}></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                     <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Academic Performance (Longitudinal)</div>
                     {selectedJourneyStudent.examHistory && selectedJourneyStudent.examHistory.length > 0 && (
                       <button onClick={() => setIsJourneyAcademicModalVisible(true)} style={{ background: 'none', border: 'none', color: 'var(--blue-500, #3b82f6)', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '13px' }}>View Details</button>
                     )}
                   </div>
                   <div style={{ fontSize: '15px', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                     {selectedJourneyStudent.examHistory && selectedJourneyStudent.examHistory.length > 0 ? (
                       <div style={{ overflowX: 'auto' }}>
                         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                           <thead>
                             <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                               <th style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Semester / Year</th>
                               <th style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Exam Name</th>
                               <th style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Marks</th>
                               <th style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>Grade</th>
                             </tr>
                           </thead>
                           <tbody>
                             {selectedJourneyStudent.examHistory.map((exam, idx) => (
                               <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                 <td style={{ padding: '12px 0' }}>{exam.semester || exam.year || 'Current'}</td>
                                 <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{exam.examName}</td>
                                 <td style={{ padding: '12px 0' }}>{exam.marks}</td>
                                 <td style={{ padding: '12px 0' }}>
                                   <span style={{ backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid var(--border-color)' }}>{exam.grade}</span>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     ) : (
                       <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No academic records found.</span>
                     )}
                   </div>
                 </div>
                 
                 {/* Detailed Fee Ledger Node */}
                 <div style={{ position: 'relative', marginBottom: '32px' }}>
                   {(() => {
                     const legacyAmount = selectedJourneyStudent?.paidFee || selectedJourneyStudent?.paidAmount || 0;
                     const studentBills = billHistory.filter(t => t.studentId === selectedJourneyStudent?.id || (t.enrollmentNo && selectedJourneyStudent?.enrollmentNo && t.enrollmentNo === selectedJourneyStudent.enrollmentNo));
                     const trueTotalPaid = studentBills.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
                     const displayPaid = trueTotalPaid > 0 ? trueTotalPaid : legacyAmount;
                     const hasLedgerOrLegacy = displayPaid > 0;
                     return (
                       <>
                         <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--teal-500, #14b8a6)', border: '4px solid var(--card-bg)' }}></div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                           <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Detailed Fee Ledger</div>
                           {hasLedgerOrLegacy && (
                             <button onClick={() => setIsJourneyFeeModalVisible(true)} style={{ background: 'none', border: 'none', color: 'var(--blue-500, #3b82f6)', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '13px' }}>View Details</button>
                           )}
                         </div>
                         <div style={{ fontSize: '15px', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                           {hasLedgerOrLegacy ? (
                             <div>
                               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                 <span style={{ color: 'var(--text-secondary)' }}>Total Course Fee:</span>
                                 <span style={{ fontWeight: 'bold' }}>₹{selectedJourneyStudent.courseFee || 28000}</span>
                               </div>
                               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                 <span style={{ color: 'var(--text-secondary)' }}>Total Paid:</span>
                                 <span style={{ fontWeight: 'bold', color: 'var(--green-600, #16a34a)' }}>₹{displayPaid}</span>
                               </div>
                             </div>
                           ) : (
                             <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No fee transactions recorded.</span>
                           )}
                         </div>
                       </>
                     );
                   })()}
                 </div>
                 
                 {/* Node: Course Enrollment */}
                 <div style={{ position: 'relative', marginBottom: '32px' }}>
                   <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--blue-500, #3b82f6)', border: '4px solid var(--card-bg)' }}></div>
                   <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '4px' }}>Course Registration</div>
                   <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                     {selectedJourneyStudent.course || 'No Course Assigned'}
                   </div>
                 </div>

                 {/* Node: Current Status */}
                 <div style={{ position: 'relative' }}>
                   <div style={{ position: 'absolute', left: '-33px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--accent-royal-purple)', border: '4px solid var(--card-bg)' }}></div>
                   <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '4px' }}>Current Status</div>
                   <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', backgroundColor: 'var(--theme-bg-premium)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                     {selectedJourneyStudent.currentStatus || 'Active'}
                     {selectedJourneyStudent.statusHistory && selectedJourneyStudent.statusHistory.length > 0 && (
                       <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                         {selectedJourneyStudent.statusHistory.map((h, i) => (
                           <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                             <strong style={{ color: 'var(--text-main)' }}>{h.status}</strong> - {h.reason} ({new Date(h.date).toLocaleDateString()})
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                   <button 
                     onClick={() => handleSingleProfileDownload(selectedJourneyStudent)}
                     style={{ padding: '12px 24px', backgroundColor: 'var(--theme-bg-premium)', color: 'var(--text-main)', border: '2px solid var(--accent-royal-purple, #6366f1)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                     onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-royal-purple, #6366f1)'; e.currentTarget.style.color = '#fff'; }}
                     onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--theme-bg-premium)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                   >
                     <Download className="w-5 h-5" /> Download Student Report
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admission' && (
        <div className="flex flex-col">
          <div className="uxer-toolbar">
            <div className="uxer-tabs">
              <div className="uxer-tab active">Student Admission & Enrollment</div>
            </div>
          </div>
          {/* Analytics Section */}
          <div className="uxer-stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="uxer-stat-card" style={{ position: 'relative' }}>
              <div className="uxer-stat-title">Today's Admissions</div>
              <div className="uxer-stat-content">
                <div className="uxer-stat-value">
                  {studentList.filter(s => {
                    const d = s.dateOfJoining || (s.createdAt ? new Date(s.createdAt.seconds * 1000).toISOString().split('T')[0] : null);
                    return d && d.startsWith(new Date().toISOString().split('T')[0]);
                  }).length}
                </div>
              </div>
              <button 
                onClick={() => { 
                  const d = new Date();
                  setDrillDownPath([String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), `Week ${getISOWeekNumber(d)}`, String(d.getDate()).padStart(2, '0')]); 
                  setIsAdmissionSummaryModalVisible(true); 
                }}
                className="uxer-action-btn"
                style={{ position: 'absolute', top: '16px', right: '16px', height: '28px', padding: '0 12px', fontSize: '12px' }}
              >View</button>
            </div>
            <div className="uxer-stat-card" style={{ position: 'relative' }}>
              <div className="uxer-stat-title">This Month</div>
              <div className="uxer-stat-content">
                <div className="uxer-stat-value">
                  {studentList.filter(s => {
                    const d = s.dateOfJoining ? new Date(s.dateOfJoining) : (s.createdAt ? new Date(s.createdAt.seconds * 1000) : null);
                    return d && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                  }).length}
                </div>
              </div>
              <button 
                onClick={() => { 
                  const d = new Date();
                  setDrillDownPath([String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0')]); 
                  setIsAdmissionSummaryModalVisible(true); 
                }}
                className="uxer-action-btn"
                style={{ position: 'absolute', top: '16px', right: '16px', height: '28px', padding: '0 12px', fontSize: '12px' }}
              >View</button>
            </div>
            <div className="uxer-stat-card" style={{ position: 'relative' }}>
              <div className="uxer-stat-title">This Year</div>
              <div className="uxer-stat-content">
                <div className="uxer-stat-value">
                  {studentList.filter(s => {
                    const d = s.dateOfJoining ? new Date(s.dateOfJoining) : (s.createdAt ? new Date(s.createdAt.seconds * 1000) : null);
                    return d && d.getFullYear() === new Date().getFullYear();
                  }).length}
                </div>
              </div>
              <button 
                onClick={() => { 
                  const d = new Date();
                  setDrillDownPath([String(d.getFullYear())]); 
                  setIsAdmissionSummaryModalVisible(true); 
                }}
                className="uxer-action-btn"
                style={{ position: 'absolute', top: '16px', right: '16px', height: '28px', padding: '0 12px', fontSize: '12px' }}
              >View</button>
            </div>
          </div>

          {/* Form Section */}
          <div className="uxer-table-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 'bold' }}>New Student Admission</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                const formData = new FormData(e.target);
                const values = Object.fromEntries(formData.entries());
                
                const studentData = {
                  name: values.name,
                  email: values.email || '',
                  organizationAccessId: user.organizationAccessId,
                  phoneNumber: values.phoneNumber,
                  enrollmentNo: values.enrollmentNo,
                  course: values.course,
                  batch: values.batch,
                  gender: values.gender,
                  dob: values.dob || '',
                  dateOfJoining: values.dateOfJoining,
                  courseFee: Number(values.courseFee) || 0,
                  parentPhone: values.parentPhone || '',
                  admissionMonth: values.admissionMonth || '',
                  remarks: values.remarks || ''
                };
                
                await createStudent(user.organizationId, user.organizationName, studentData);
                
                message.success('Admission created successfully!');
                e.target.reset();
                fetchStaffAndStudents();
              } catch(err) {
                message.error(err.message);
              } finally {
                setLoading(false);
              }
            }}>
              <div className="native-form-grid">
                {/* Row 1: Student Identity */}
                <div className="native-form-group">
                  <label className="uxer-form-label">Enrollment Number *</label>
                  <input type="text" name="enrollmentNo" className="uxer-form-input" required placeholder="e.g. ENR-2024-001" />
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Student Name *</label>
                  <input type="text" name="name" className="uxer-form-input" required placeholder="Full Name" />
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Date of Birth</label>
                  <input type="date" name="dob" className="uxer-form-input" />
                </div>

                {/* Row 2: Personal/Contact */}
                <div className="native-form-group">
                  <label className="uxer-form-label">Gender *</label>
                  <select name="gender" className="uxer-form-select" required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Mobile Number *</label>
                  <input type="text" name="phoneNumber" className="uxer-form-input" required placeholder="+91..." />
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Email Address</label>
                  <input type="email" name="email" className="uxer-form-input" placeholder="student@example.com" />
                </div>

                {/* Row 3: Academic/Course */}
                <div className="native-form-group">
                  <label className="uxer-form-label">Course Selection *</label>
                  <select name="course" className="uxer-form-select" required>
                    <option value="">Select Course</option>
                    {courseList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Batch *</label>
                  <input type="text" name="batch" className="uxer-form-input" required placeholder="e.g. 2025-2028 or Morning Batch" />
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Course Fee *</label>
                  <input type="number" name="courseFee" className="uxer-form-input" required placeholder="e.g. 25000" />
                </div>

                {/* Row 4: Admission Info */}
                <div className="native-form-group">
                  <label className="uxer-form-label">Join Date *</label>
                  <input type="date" name="dateOfJoining" className="uxer-form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Admission Month</label>
                  <input type="month" name="admissionMonth" className="uxer-form-input" defaultValue={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`} />
                </div>
                <div className="native-form-group">
                  <label className="uxer-form-label">Parent Mobile Number</label>
                  <input type="text" name="parentPhone" className="uxer-form-input" placeholder="+91..." />
                </div>

                {/* Row 5: Extra */}
                <div className="native-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="uxer-form-label">Remarks</label>
                  <textarea name="remarks" className="uxer-form-textarea" rows="3" placeholder="Any special notes..."></textarea>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="submit" className="uxer-action-btn" disabled={loading}>
                  {loading ? 'Processing...' : 'Complete Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="flex flex-col">
          <div className="uxer-toolbar">
            <div className="uxer-tabs">
              <div className={`uxer-tab ${activeReportTab === 'admission' ? 'active' : ''}`} onClick={() => setActiveReportTab('admission')}>Admission Reports</div>
              <div className={`uxer-tab ${activeReportTab === 'defaulters' ? 'active' : ''}`} onClick={() => setActiveReportTab('defaulters')}>Fee Defaulters</div>
              <div className={`uxer-tab ${activeReportTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveReportTab('attendance')}>Attendance Reports</div>
              <div className={`uxer-tab ${activeReportTab === 'marks' ? 'active' : ''}`} onClick={() => setActiveReportTab('marks')}>Performance & Marks</div>
            </div>
          </div>

          <div className="uxer-table-card" style={{ padding: '24px' }}>
            {activeReportTab === 'admission' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {(() => {
                  const now = new Date();
                  const startOfWeek = new Date(now);
                  startOfWeek.setDate(now.getDate() - now.getDay());
                  startOfWeek.setHours(0, 0, 0, 0);

                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  const startOfYear = new Date(now.getFullYear(), 0, 1);

                  let weekCount = 0;
                  let monthCount = 0;
                  let yearCount = 0;

                  studentList.forEach(s => {
                    const d = s.dateOfJoining ? new Date(s.dateOfJoining) : (s.createdAt ? new Date(s.createdAt.seconds * 1000) : null);
                    if (d) {
                      if (d >= startOfWeek) weekCount++;
                      if (d >= startOfMonth) monthCount++;
                      if (d >= startOfYear) yearCount++;
                    }
                  });

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #f1f5f9', position: 'relative' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>This Week</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>{weekCount}</div>
                        <button 
                          onClick={() => { 
                            const d = new Date();
                            setDrillDownPath([String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), `Week ${getISOWeekNumber(d)}`]); 
                            setIsAdmissionSummaryModalVisible(true); 
                          }}
                          style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >View</button>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #f1f5f9', position: 'relative' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>This Month</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>{monthCount}</div>
                        <button 
                          onClick={() => { 
                            const d = new Date();
                            setDrillDownPath([String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0')]); 
                            setIsAdmissionSummaryModalVisible(true); 
                          }}
                          style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >View</button>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #f1f5f9', position: 'relative' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>This Year</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>{yearCount}</div>
                        <button 
                          onClick={() => { 
                            const d = new Date();
                            setDrillDownPath([String(d.getFullYear())]); 
                            setIsAdmissionSummaryModalVisible(true); 
                          }}
                          style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >View</button>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: 'bold', color: '#475569' }}>Filter by Course:</label>
                  <select 
                    value={admissionReportCourseFilter} 
                    onChange={(e) => setAdmissionReportCourseFilter(e.target.value)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff', fontSize: '14px', minWidth: '200px', cursor: 'pointer' }}
                  >
                    <option value="All">All Courses</option>
                    {courseList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="uxer-table-wrapper">
                  <table className="uxer-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Student Name</th>
                        <th>Enrollment No</th>
                        <th>Course</th>
                        <th>Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentList
                        .filter(s => {
                          if (!(s.dateOfJoining || s.createdAt)) return false;
                          if (admissionReportCourseFilter !== 'All' && s.course !== admissionReportCourseFilter) return false;
                          if (reportSearchQuery.trim()) {
                            const q = reportSearchQuery.toLowerCase();
                            const matchName = (s.name || '').toLowerCase().includes(q);
                            const matchEnroll = (s.enrollmentNo || '').toLowerCase().includes(q);
                            if (!matchName && !matchEnroll) return false;
                          }
                          return true;
                        })
                        .sort((a,b) => {
                          const d1 = new Date(b.dateOfJoining || (b.createdAt ? b.createdAt.seconds * 1000 : 0));
                          const d2 = new Date(a.dateOfJoining || (a.createdAt ? a.createdAt.seconds * 1000 : 0));
                          return d1 - d2;
                        })
                        .slice(0, 100)
                        .map(s => {
                          const d = s.dateOfJoining ? new Date(s.dateOfJoining) : new Date(s.createdAt.seconds * 1000);
                          return (
                            <tr key={s.id}>
                              <td>{d.toLocaleDateString()}</td>
                              <td>{s.name}</td>
                              <td>{s.enrollmentNo || 'N/A'}</td>
                              <td>{s.course || 'N/A'}</td>
                              <td>{s.phoneNumber || 'N/A'}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeReportTab === 'defaulters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: 'bold', color: '#475569' }}>Filter by Course:</label>
                  <select 
                    value={admissionReportCourseFilter} 
                    onChange={(e) => setAdmissionReportCourseFilter(e.target.value)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff', fontSize: '14px', minWidth: '200px', cursor: 'pointer' }}
                  >
                    <option value="All">All Courses</option>
                    {courseList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="uxer-table-wrapper">
                  <table className="uxer-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Course</th>
                        <th>Total Fee</th>
                        <th>Paid Amount</th>
                        <th>Pending Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const defaulters = studentList.map(s => {
                          const courseFee = Number(s.totalCourseFee || s.courseFee || 28000);
                          const studentReceipts = billHistory.filter(t => t.studentId === s.id || (t.enrollmentNo && s.enrollmentNo && t.enrollmentNo === s.enrollmentNo));
                          const paid = studentReceipts.reduce((sum, t) => sum + (Number(t.amountPaid || t.totalAmount || t.amount) || 0), 0);
                          const pending = courseFee - paid;
                          return { ...s, dynamicTotal: courseFee, dynamicPaid: paid, dynamicPending: pending };
                        }).filter(s => {
                          const isDefaulter = s.dynamicPending > 0;
                          const matchesCourse = admissionReportCourseFilter === 'All' || s.course === admissionReportCourseFilter;
                          let matchesSearch = true;
                          if (reportSearchQuery.trim()) {
                            const q = reportSearchQuery.toLowerCase();
                            const matchName = (s.name || '').toLowerCase().includes(q);
                            const matchEnroll = (s.enrollmentNo || '').toLowerCase().includes(q);
                            matchesSearch = matchName || matchEnroll;
                          }
                          return isDefaulter && matchesCourse && matchesSearch;
                        });

                        if (defaulters.length === 0) {
                          return (
                            <tr>
                              <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No fee defaulters found!</td>
                            </tr>
                          );
                        }

                        return defaulters.map(s => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>{s.course || 'N/A'}</td>
                            <td>₹{s.dynamicTotal}</td>
                            <td style={{ color: 'var(--green-600)' }}>₹{s.dynamicPaid}</td>
                            <td style={{ color: 'var(--red-600)', fontWeight: 'bold' }}>₹{s.dynamicPending}</td>
                            <td>
                              <button 
                                onClick={() => handleSendReminder(s, s.dynamicPending)}
                                disabled={sendingReminderId === s.id || sentReminderId === s.id}
                                className="uxer-tab" 
                                style={{ border: '1px solid var(--border-color)', backgroundColor: sentReminderId === s.id ? 'var(--green-600)' : undefined, color: sentReminderId === s.id ? '#fff' : undefined }}
                              >
                                {sendingReminderId === s.id ? 'Sending...' : (sentReminderId === s.id ? 'Sent ✓' : 'Send Reminder')}
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReportTab === 'attendance' && (() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const filteredAttendance = attendanceHistoryList.filter(record => {
                  const matchTab = attendanceReportTab === 'daily' ? record.date === todayStr : record.date !== todayStr;
                  const matchBatch = attendanceBatchFilter === 'All' ? true : record.batchName === attendanceBatchFilter;
                  const matchFaculty = attendanceFacultyFilter === 'All' ? true : record.facultyName === attendanceFacultyFilter;
                  let matchesSearch = true;
                  if (reportSearchQuery.trim()) {
                    const q = reportSearchQuery.toLowerCase();
                    const matchBatchName = (record.batchName || '').toLowerCase().includes(q);
                    const matchFacultyName = (record.facultyName || '').toLowerCase().includes(q);
                    const matchStudent = record.records?.some(r => (r.studentName || '').toLowerCase().includes(q) || (r.enrollmentNo || '').toLowerCase().includes(q));
                    matchesSearch = matchBatchName || matchFacultyName || matchStudent;
                  }
                  return matchTab && matchBatch && matchFaculty && matchesSearch;
                });
                
                return (
                  <div style={{ backgroundColor: 'var(--panel-solid-white)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '24px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid var(--border-color)' }}>
                        <button 
                          onClick={() => setAttendanceReportTab('daily')}
                          style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: attendanceReportTab === 'daily' ? '2px solid var(--blue-500, #3b82f6)' : '2px solid transparent', color: attendanceReportTab === 'daily' ? 'var(--blue-500, #3b82f6)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.2s' }}
                        >Daily Attendance</button>
                        <button 
                          onClick={() => setAttendanceReportTab('history')}
                          style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: attendanceReportTab === 'history' ? '2px solid var(--blue-500, #3b82f6)' : '2px solid transparent', color: attendanceReportTab === 'history' ? 'var(--blue-500, #3b82f6)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.2s' }}
                        >Attendance History</button>
                      </div>

                      <div style={{ display: 'flex', gap: '16px' }}>
                        <select 
                          value={attendanceBatchFilter}
                          onChange={(e) => setAttendanceBatchFilter(e.target.value)}
                          style={{ padding: '10px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
                        >
                          <option value="All">All Batches</option>
                          {courseList.map(c => <option key={c.id} value={c.name}>{(c.name || "").replace(" (Full Course)", "")}</option>)}
                        </select>
                        
                        <select 
                          value={attendanceFacultyFilter}
                          onChange={(e) => setAttendanceFacultyFilter(e.target.value)}
                          style={{ padding: '10px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
                        >
                          <option value="All">All Faculty</option>
                          {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="global-responsive-scroll-wrapper" style={{ overflowX: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'var(--theme-bg-premium)', borderBottom: '2px solid var(--border-color)' }}>
                          <tr>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Batch Name</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Faculty</th>
                            <th style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Total Students</th>
                            <th style={{ padding: '16px', color: 'var(--green-600, #16a34a)', fontSize: '12px', textTransform: 'uppercase' }}>Present</th>
                            <th style={{ padding: '16px', color: 'var(--red-600, #dc2626)', fontSize: '12px', textTransform: 'uppercase' }}>Absent</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAttendance.length > 0 ? filteredAttendance.map(record => {
                            const totalPresent = record.totalPresentees !== undefined ? record.totalPresentees : (record.records?.filter(rec => rec.status === 'P').length || 0);
                            const totalAbsent = record.totalAbsentees !== undefined ? record.totalAbsentees : (record.records?.filter(rec => rec.status === 'A').length || 0);
                            return (
                                <tr key={`row-${record.id}`} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', transition: 'background-color 0.2s' }}>
                                  <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>{new Date(record.date).toLocaleDateString()}</td>
                                  <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '14px' }}>{record.batchName}</td>
                                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{record.facultyName}</td>
                                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{record.records?.length || 0}</td>
                                  <td style={{ padding: '16px', color: 'var(--green-600, #16a34a)', fontSize: '14px', fontWeight: 'bold' }}>{totalPresent}</td>
                                  <td style={{ padding: '16px', color: 'var(--red-600, #dc2626)', fontSize: '14px', fontWeight: 'bold' }}>{totalAbsent}</td>
                                  <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <button 
                                      onClick={() => setSelectedAttendanceReport(record)}
                                      style={{ padding: '8px 16px', backgroundColor: 'var(--blue-500, #3b82f6)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan="7" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                No attendance records found matching your filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {selectedAttendanceReport && (
                      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                        <div style={{ backgroundColor: 'var(--panel-solid-white)', width: '90%', maxWidth: '800px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                          
                          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                              Detailed Summary - {selectedAttendanceReport.batchName} ({new Date(selectedAttendanceReport.date).toLocaleDateString()})
                            </h4>
                            <button 
                              onClick={() => setSelectedAttendanceReport(null)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <X className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                            </button>
                          </div>

                          {selectedAttendanceReport.sessionTopics && (
                            <div style={{ padding: '24px 24px 0 24px' }}>
                              <h5 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>Session Topics / Class Notes</h5>
                              <div style={{ backgroundColor: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                {selectedAttendanceReport.sessionTopics}
                              </div>
                            </div>
                          )}
                          
                          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', alignContent: 'start' }}>
                            {selectedAttendanceReport.records && Array.isArray(selectedAttendanceReport.records) ? selectedAttendanceReport.records.map((r, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '15px' }}>{r.studentName}</span>
                                {r.status === 'P' ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green-600, #16a34a)', backgroundColor: 'rgba(22,163,74,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>Present</span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--red-600, #dc2626)', backgroundColor: 'rgba(220,38,38,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>Absent</span>
                                )}
                              </div>
                            )) : <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No records found for this batch.</p>}
                          </div>
                          
                          <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--green-500, #22c55e)' }}></div>
                                Total Present: {selectedAttendanceReport.totalPresentees !== undefined ? selectedAttendanceReport.totalPresentees : (selectedAttendanceReport.records?.filter(rec => rec.status === 'P').length || 0)}
                              </div>
                              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--red-500, #ef4444)' }}></div>
                                Total Absent: {selectedAttendanceReport.totalAbsentees !== undefined ? selectedAttendanceReport.totalAbsentees : (selectedAttendanceReport.records?.filter(rec => rec.status === 'A').length || 0)}
                              </div>
                            </div>
                            <button 
                              onClick={() => downloadAttendanceCSV(selectedAttendanceReport)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--blue-600, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                            >
                              <Download className="w-4 h-4" /> Download Report
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            {activeReportTab === 'staff_attendance' && (
              <div className="uxer-table-wrapper">
                <table className="uxer-table">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Designation</th>
                      <th>Status (Today)</th>
                      <th>Login Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff, i) => (
                      <tr key={staff.id}>
                        <td>{staff.name}</td>
                        <td>Faculty</td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                            backgroundColor: i % 3 === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                            color: i % 3 === 0 ? 'var(--red-500)' : 'var(--green-500)' 
                          }}>
                            {i % 3 === 0 ? 'Absent' : 'Present'}
                          </span>
                        </td>
                        <td>{i % 3 === 0 ? '-' : `09:${10 + i} AM`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeReportTab === 'marks' && (
              <div className="flex flex-col">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 className="uxer-form-title" style={{ margin: 0 }}>Marks Management</h2>
                  <button 
                    onClick={() => {
                      const flatMarks = studentList.filter(s => {
                        if (marksCourseFilter !== 'All' && s.course !== marksCourseFilter) return false;
                        if (reportSearchQuery) {
                          const q = reportSearchQuery.toLowerCase();
                          const sName = s.name ? String(s.name).toLowerCase() : '';
                          const sEnrollment = (s.enrollmentNo || s.enrollmentNumber || '').toString().toLowerCase();
                          return (sName.includes(q) || sEnrollment.includes(q));
                        }
                        return true;
                      }).flatMap(s => {
                        const history = s.examHistory || [];
                        if (history.length === 0) {
                          return [{
                            'Student Name': s.name || 'N/A',
                            'Enrollment No': s.enrollmentNo || s.enrollmentNumber || 'N/A',
                            'Course': s.course || 'N/A',
                            'Exam Name': '-',
                            'Marks': '-',
                            'Grade': '-',
                            'Date': '-'
                          }];
                        }
                        return history.map(exam => ({
                          'Student Name': s.name || 'N/A',
                          'Enrollment No': s.enrollmentNo || s.enrollmentNumber || 'N/A',
                          'Course': s.course || 'N/A',
                          'Exam Name': exam.examName,
                          'Marks': exam.marks,
                          'Grade': exam.grade,
                          'Date': exam.date ? new Date(exam.date).toLocaleDateString() : 'N/A'
                        }));
                      });
                      
                      if (flatMarks.length === 0) return;
                      const csv = Papa.unparse(flatMarks);
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `Marks_Report_${marksCourseFilter}.csv`;
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Download size={16} /> Download CSV
                  </button>
                </div>

                <div className="native-form-card" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div style={{ width: 'auto', flexShrink: 0 }}>
                      <select 
                        className="uxer-form-select" 
                        value={marksCourseFilter} 
                        onChange={(e) => setMarksCourseFilter(e.target.value)}
                        style={{ margin: 0 }}
                      >
                        <option value="All">All Courses</option>
                        {Array.from(new Set(studentList.map(s => s.course).filter(Boolean))).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="native-form-card">
                  <div className="uxer-table-wrapper">
                    <table className="uxer-table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Enrollment No</th>
                          <th>Course</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredStudents = studentList.filter(s => {
                            if (!s.examHistory || s.examHistory.length === 0) return false;
                            if (marksCourseFilter !== 'All' && s.course !== marksCourseFilter) return false;
                            if (reportSearchQuery) {
                              const q = reportSearchQuery.toLowerCase();
                              const sName = s.name ? String(s.name).toLowerCase() : '';
                              const sEnrollment = (s.enrollmentNo || s.enrollmentNumber || '').toString().toLowerCase();
                              return (sName.includes(q) || sEnrollment.includes(q));
                            }
                            return true;
                          });
                          
                          if (filteredStudents.length === 0) {
                            return <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No students found matching your criteria.</td></tr>;
                          }

                          return filteredStudents.map((s, i) => (
                            <tr key={s.id || i}>
                              <td style={{ fontWeight: '500' }}>{s.name}</td>
                              <td>{s.enrollmentNo || s.enrollmentNumber || 'N/A'}</td>
                              <td>{s.course || 'N/A'}</td>
                              <td>
                                <button
                                  onClick={() => {
                                    setSelectedStudentForMarks(s);
                                    setIsMarksDetailsModalVisible(true);
                                  }}
                                  className="uxer-action-btn"
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                >
                                  <Eye size={16} style={{ marginRight: '6px' }} /> View
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


          </div>
        </div>
      </main>

      {isAdmissionSummaryModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: '#ffffff', color: '#111827', width: '800px', maxWidth: '94%', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            
            <button 
              onClick={() => setIsAdmissionSummaryModalVisible(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <X className="w-6 h-6 text-slate-400 hover:text-slate-700" />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span 
                  style={{ cursor: 'pointer', color: drillDownPath.length === 0 ? '#111827' : '#3b82f6' }} 
                  onClick={() => setDrillDownPath([])}
                >
                  Admissions
                </span>
                {drillDownPath.map((segment, idx) => (
                  <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#9ca3af' }}>/</span>
                    <span 
                      style={{ cursor: idx === drillDownPath.length - 1 ? 'default' : 'pointer', color: idx === drillDownPath.length - 1 ? '#111827' : '#3b82f6' }}
                      onClick={() => setDrillDownPath(drillDownPath.slice(0, idx + 1))}
                    >
                      {segment}
                    </span>
                  </span>
                ))}
              </h2>
              <button 
                onClick={() => {
                  const now = new Date();
                  const filteredList = studentList.filter(s => {
                    const dStr = s.dateOfJoining || (s.createdAt ? new Date(s.createdAt.seconds * 1000).toISOString().split('T')[0] : null);
                    const d = dStr ? new Date(dStr) : null;
                    if (!dStr || !d) return false;
                    
                    const sYear = String(d.getFullYear());
                    const sMonth = String(d.getMonth() + 1).padStart(2, '0');
                    const sWeek = `Week ${getISOWeekNumber(d)}`;
                    const sDay = String(d.getDate()).padStart(2, '0');

                    if (drillDownPath.length > 0 && sYear !== drillDownPath[0]) return false;
                    if (drillDownPath.length > 1 && sMonth !== drillDownPath[1]) return false;
                    if (drillDownPath.length > 2 && sWeek !== drillDownPath[2]) return false;
                    if (drillDownPath.length > 3 && sDay !== drillDownPath[3]) return false;

                    return true;
                  }).map(s => {
                    const dStr = s.dateOfJoining || (s.createdAt ? new Date(s.createdAt.seconds * 1000).toISOString().split('T')[0] : null);
                    const dateObj = new Date(dStr);
                    return {
                      'Join Date': dateObj.toLocaleDateString(),
                      'Enrollment No': s.enrollmentNo || 'N/A',
                      'Student Name': s.name || 'N/A',
                      'Course': s.course || 'N/A',
                      'Batch': s.batch || 'N/A',
                      'Gender': s.gender || 'N/A',
                      'Mobile': s.phoneNumber || 'N/A',
                    };
                  });

                  if (filteredList.length === 0) return;
                  const csv = Papa.unparse(filteredList);
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  const viewName = drillDownPath.length > 0 ? drillDownPath.join('_') : 'All';
                  link.setAttribute('download', `Admissions_${viewName}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px', marginRight: '32px' }}
              >
                <Download size={16} /> Download CSV
              </button>
            </div>
            
            <div style={{ flex: 1, minHeight: '300px' }}>
              {isDrillDownLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '16px' }}>Loading reporting data...</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {drillDownPath.length < 4 && drillDownData.folders?.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                        {drillDownData.folders.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => setDrillDownPath([...drillDownPath, item.id])}
                            style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                          >
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{item.name || item.date || item.id}</div>
                            {item.date && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{new Date(item.date).toLocaleDateString()}</div>}
                            <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 'bold', marginTop: '8px', backgroundColor: '#e0f2fe', padding: '4px 12px', borderRadius: '16px' }}>
                              {item.count || 0} Record{item.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {drillDownPath.length > 0 && (
                      <div className="uxer-table-wrapper" style={{ marginTop: (drillDownPath.length < 4 && drillDownData.folders?.length > 0) ? '16px' : '0' }}>
                        <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
                          Students List ({drillDownData.students?.length || 0})
                        </div>
                        <table className="uxer-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Student Name</th>
                              <th>Enrollment No</th>
                              <th>Course</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drillDownData.students?.map(s => {
                              const dStr = s.dateOfJoining || (s.createdAt ? new Date(s.createdAt.seconds * 1000).toISOString().split('T')[0] : null);
                              const dateObj = new Date(dStr);
                              return (
                                <tr 
                                  key={s.id} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    setSelectedJourneyStudent(s);
                                    setIsJourneyProfileModalVisible(true);
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>{dateObj.toLocaleDateString()}</td>
                                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0284c7' }}>{s.name}</td>
                                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>{s.enrollmentNo || 'N/A'}</td>
                                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>{s.course || 'N/A'}</td>
                                </tr>
                              );
                            })}
                            {(!drillDownData.students || drillDownData.students.length === 0) && (
                              <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>No students found for this period.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {drillDownPath.length === 0 && (!drillDownData.folders || drillDownData.folders.length === 0) && (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>No records found.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: '32px', padding: '16px 24px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold', color: '#0369a1', fontSize: '16px' }}>
                Total Admissions {drillDownPath.length > 0 ? `(${drillDownPath[drillDownPath.length-1]})` : '(All Time)'}:
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#0284c7' }}>
                {studentList.filter(s => {
                    const dStr = s.dateOfJoining || (s.createdAt ? new Date(s.createdAt.seconds * 1000).toISOString().split('T')[0] : null);
                    const d = dStr ? new Date(dStr) : null;
                    if (!d) return false;
                    
                    const sYear = String(d.getFullYear());
                    const sMonth = String(d.getMonth() + 1).padStart(2, '0');
                    const sWeek = `Week ${getISOWeekNumber(d)}`;
                    const sDay = String(d.getDate()).padStart(2, '0');

                    if (drillDownPath.length > 0 && sYear !== drillDownPath[0]) return false;
                    if (drillDownPath.length > 1 && sMonth !== drillDownPath[1]) return false;
                    if (drillDownPath.length > 2 && sWeek !== drillDownPath[2]) return false;
                    if (drillDownPath.length > 3 && sDay !== drillDownPath[3]) return false;
                    return true;
                }).length}
              </div>
            </div>

          </div>
        </div>
      )}
    {isEditModalVisible && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Edit {editingUser?.role !== 'student' ? 'Faculty' : 'Student'} Profile</h2>
            <button onClick={() => setIsEditModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
          </div>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const formData = new FormData(e.target);
            const data = editForm.getFieldsValue(true);
            data.age = formData.get('age') || data.age;
            data.batch = formData.get('batch') || data.batch;
            data.experience = formData.get('experience') || data.experience;
            data.role = formData.get('role') || data.role;
            if (formData.get('status')) data.status = formData.get('status');
            handleEditSubmit(data); 
          }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Full Name</label>
              <input type="text" placeholder="Enter name" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({name: e.target.value})} defaultValue={editForm.getFieldValue('name')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Email</label>
              <input type="email" placeholder="Enter email" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => {
                editForm.setFieldsValue({email: e.target.value});
                if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(e.target.value)) {
                  e.target.setCustomValidity('Please enter a valid Email address');
                } else {
                  e.target.setCustomValidity('');
                }
              }} defaultValue={editForm.getFieldValue('email')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Phone Number</label>
              <input type="text" placeholder="Enter phone number" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => {
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
            {editingUser?.role === 'student' && (
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
                  <select name="status" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({status: e.target.value})} defaultValue={editForm.getFieldValue('status')}>
                    <option value="Active">Active</option>
                    <option value="Passed Out">Passed Out</option>
                    <option value="Completed">Completed</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Drop-out">Drop-out</option>
                  </select>
                </div>
              </div>
            )}
            {editingUser?.role !== 'student' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Faculty ID</label>
                  <input type="text" name="facultyId" placeholder="Enter Faculty/Employee ID" required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({facultyId: e.target.value})} defaultValue={editForm.getFieldValue('facultyId')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Role</label>
                  <input type="text" name="role" list="faculty-roles-edit" placeholder="e.g. Programming Staff" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({role: e.target.value})} defaultValue={editForm.getFieldValue('role')} />
                  <datalist id="faculty-roles-edit">
                    {Array.from(new Set(staffList.map(s => s.role).filter(Boolean))).map(role => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Age (Optional)</label>
                  <input type="number" name="age" placeholder="Enter age" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({age: e.target.value})} defaultValue={editForm.getFieldValue('age')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Previous Experience / Workplace (Optional)</label>
                  <input type="text" name="experience" placeholder="e.g. 5 Years at XYZ Institute" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({experience: e.target.value})} defaultValue={editForm.getFieldValue('experience')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Degree / Qualification</label>
                  <input type="text" name="degree" placeholder="e.g. M.Sc Computer Science" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => editForm.setFieldsValue({degree: e.target.value})} defaultValue={editForm.getFieldValue('degree')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Address</label>
                  <textarea name="address" placeholder="Enter complete address" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }} onChange={(e) => editForm.setFieldsValue({address: e.target.value})} defaultValue={editForm.getFieldValue('address')} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button type="button" onClick={() => setIsEditModalVisible(false)} style={{ padding: '8px 16px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button type="submit" disabled={editLoading} style={{ padding: '8px 16px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    )}

      {isFeeModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card modal-flex-layout-group" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Offline Fee Collection - {selectedStudentForFee?.name || ''}</h2>
              <button onClick={() => setIsFeeModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
            </div>
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
            
            <form onSubmit={(e) => { e.preventDefault(); handleFeeSubmit(offlineFeeForm.getFieldsValue()); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Bill ID / Receipt Number</label>
                <input type="text" placeholder="Enter manual Bill ID" required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold', boxSizing: 'border-box' }} onChange={(e) => offlineFeeForm.setFieldsValue({billNumber: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Payment Date</label>
                <input type="date" required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => offlineFeeForm.setFieldsValue({paymentDate: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Payment Time</label>
                <input type="time" required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => offlineFeeForm.setFieldsValue({paymentTime: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Cash Amount</label>
                <input type="number" min="0" defaultValue="0" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => offlineFeeForm.setFieldsValue({cashAmount: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>UPI/GPay Amount</label>
                <input type="number" min="0" defaultValue="0" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => offlineFeeForm.setFieldsValue({upiAmount: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Card Amount</label>
                <input type="number" min="0" defaultValue="0" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => offlineFeeForm.setFieldsValue({cardAmount: Number(e.target.value)})} />
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
                         offlineFeeForm.setFieldsValue({receiptFile: e.target.files[0]}); 
                         try {
                           await logTransaction('UPLOAD_BILL_DOCUMENT', {
                             token: '[Aadhaar Redacted]',
                             studentId: selectedStudentForFee?.id,
                             adminId: user?.id,
                             adminName: user?.name
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
                <textarea rows={3} placeholder="Enter any transaction notes" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => offlineFeeForm.setFieldsValue({remarks: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsFeeModalVisible(false)} style={{ padding: '8px 16px', backgroundColor: 'var(--border-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '8px 16px', backgroundColor: 'var(--green-600, #16a34a)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStatusModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Update Student Status</h2>
              <button onClick={() => setIsStatusModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleStatusUpdateSubmit(statusUpdateForm.getFieldsValue()); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>New Status</label>
                <select required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box' }} onChange={(e) => statusUpdateForm.setFieldsValue({newStatus: e.target.value})} defaultValue="Active">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Drop-out">Drop-out</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Reason / Remarks</label>
                <textarea required placeholder="E.g., Took a 4-month break, Completed final exams, etc." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', boxSizing: 'border-box', minHeight: '80px' }} onChange={(e) => statusUpdateForm.setFieldsValue({reason: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsStatusModalVisible(false)} style={{ padding: '8px 16px', backgroundColor: 'var(--border-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '8px 16px', backgroundColor: 'var(--blue-600, #2563eb)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTimelineModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '600px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>Status Timeline - {selectedStudentForTimeline?.name}</h2>
            <div className="timeline-container">
              {selectedStudentForTimeline?.statusHistory?.length > 0 ? (
                selectedStudentForTimeline.statusHistory.map((log, index) => (
                  <div key={index} className="timeline-item p-4 mb-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`status-badge status-badge-${log.status.toLowerCase().replace(' ', '-')}`}>{log.status}</span>
                      <span className="text-xs text-slate-500 font-semibold">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 m-0"><strong>Reason:</strong> {log.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center italic">No history available for this student.</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: 'var(--slate-800, #1e293b)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }} onClick={() => setIsTimelineModalVisible(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isProfileModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '600px', maxWidth: '94%', borderRadius: '12px', padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Student Profile Details</h2>
            <div className="modal-flex-layout-group" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
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
                        adminId: user?.id,
                        adminName: user?.name
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
                          handleEditClick(student);
                       } else if (globalSearchAction === 'delete') {
                          if (window.confirm(`Are you sure you want to permanently delete ${student.name}?`)) {
                             handleDeleteUser(student.id);
                          }
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

      {/* Student Journey Attendance Drill-Down Overlay */}
      {isJourneyAttendanceModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '600px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{selectedJourneyAttendanceDate ? `Sessions on ${new Date(selectedJourneyAttendanceDate).toLocaleDateString()}` : 'Attendance History'}</h2>
              <button onClick={() => { setIsJourneyAttendanceModalVisible(false); setSelectedJourneyAttendanceDate(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(() => {
                const uniqueSessions = [];
                if (selectedJourneyStudent && attendanceHistoryList) {
                  const map = new Map();
                  attendanceHistoryList.forEach(log => {
                    if (log.isFinal === false) return;
                    const rec = log.records?.find(r => r.studentName === selectedJourneyStudent.name);
                    if (rec) {
                      const key = `${log.date}_${log.batchName}_${log.slot}`;
                      if (!map.has(key)) {
                        map.set(key, { date: log.date, batch: log.batchName, slot: log.slot, status: rec.status, faculty: log.facultyName });
                      }
                    }
                  });
                  map.forEach(v => uniqueSessions.push(v));
                  uniqueSessions.sort((a,b) => new Date(b.date) - new Date(a.date));
                }

                if (!selectedJourneyAttendanceDate) {
                  // Show list of unique dates
                  const uniqueDates = [...new Set(uniqueSessions.map(s => s.date))];
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {uniqueDates.map((dateStr, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedJourneyAttendanceDate(dateStr)}
                          style={{ padding: '16px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}
                        >
                          <span>{new Date(dateStr).toLocaleDateString()}</span>
                          <span style={{ fontSize: '12px', color: 'var(--blue-500, #3b82f6)' }}>View Sessions →</span>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  // Drill down to specific sessions for that date
                  const sessionsOnDate = uniqueSessions.filter(s => s.date === selectedJourneyAttendanceDate);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button 
                        onClick={() => setSelectedJourneyAttendanceDate(null)}
                        style={{ padding: '8px 16px', alignSelf: 'flex-start', marginBottom: '16px', cursor: 'pointer', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 'bold' }}
                      >
                        ← Back to Dates
                      </button>
                      {sessionsOnDate.map((u, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>{u.batch}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Slot: {u.slot} | Faculty: {u.faculty}</div>
                          </div>
                          {u.status === 'P' ? (
                            <span style={{ padding: '6px 12px', backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--green-600, #16a34a)', fontWeight: 'bold', borderRadius: '6px', fontSize: '13px' }}>Present</span>
                          ) : (
                            <span style={{ padding: '6px 12px', backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--red-600, #dc2626)', fontWeight: 'bold', borderRadius: '6px', fontSize: '13px' }}>Absent</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Student Journey Fee Drill-Down Overlay */}
      {isJourneyFeeModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '800px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Detailed Fee Ledger</h2>
              <button onClick={() => setIsJourneyFeeModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(() => {
                const legacyAmount = selectedJourneyStudent?.paidFee || selectedJourneyStudent?.paidAmount || 0;
                const studentBills = billHistory.filter(t => t.studentId === selectedJourneyStudent?.id || (t.enrollmentNo && selectedJourneyStudent?.enrollmentNo && t.enrollmentNo === selectedJourneyStudent.enrollmentNo));
                
                let displayLedger = studentBills.map(bill => {
                  const rawDateStr = bill.paymentDate || bill.date || null;
                  const dateObj = new Date(rawDateStr || bill.timestamp?.seconds * 1000 || Date.now());
                  let timeStr = dateObj.toLocaleTimeString('en-IN');
                  
                  // Fix legacy 5:30 AM bug caused by UTC date-only strings
                  if (timeStr.toLowerCase() === '5:30:00 am' || timeStr.toLowerCase() === '05:30:00 am') {
                    timeStr = bill.time || '';
                  }
                  
                  let paymentModeStr = bill.paymentMode || bill.mode || 'Cash / Manual Entry';
                  if (paymentModeStr === 'Split') {
                     paymentModeStr = `Split (Cash: ₹${bill.cashAmount || bill.paymentSplit?.cash || 0} | UPI: ₹${bill.gpayAmount || bill.upiAmount || bill.paymentSplit?.upi || 0})`;
                  } else if (paymentModeStr === 'UPI' || paymentModeStr === 'GPay') {
                     paymentModeStr = 'UPI / GPay';
                  }
                  
                  return {
                    receiptId: bill.billNumber || bill.billCode || bill.id,
                    date: dateObj.toLocaleDateString('en-IN'),
                    time: timeStr,
                    amountPaid: bill.totalAmount || bill.amountPaid || bill.amount,
                    status: paymentModeStr
                  };
                });
                
                if (displayLedger.length === 0 && legacyAmount > 0) {
                  displayLedger = [{
                    receiptId: "LEGACY-REC",
                    date: new Date(selectedJourneyStudent.dateOfJoining || Date.now()).toLocaleDateString('en-IN'),
                    time: "",
                    amountPaid: legacyAmount,
                    status: "Cash / Manual Entry"
                  }];
                }
                
                if (displayLedger.length === 0) {
                  return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No fee transactions recorded</div>;
                }
                
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--theme-bg-premium)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Receipt ID</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Date & Time</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Amount Paid</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Payment Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLedger.map((bill, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 'bold' }}>{bill.receiptId}</td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)' }}>{bill.date} {bill.time || ''}</td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--green-600, #16a34a)', fontWeight: 'bold' }}>₹{bill.amountPaid || 0}</td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(22, 163, 74, 0.1)', color: 'var(--green-600, #16a34a)', fontWeight: 'bold', fontSize: '12px' }}>
                              {bill.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Student Journey Academic Drill-Down Overlay */}
      {isJourneyAcademicModalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '800px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Academic Performance Details</h2>
              <button onClick={() => setIsJourneyAcademicModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X /></button>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--theme-bg-premium)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Semester/Year</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Exam Name</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Date Conducted</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Marks Obtained</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Percentage</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '2px solid var(--border-color)' }}>Final Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedHistory = [...(selectedJourneyStudent?.examHistory || [])].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
                    return sortedHistory.map((exam, idx) => {
                      const maxMarks = exam.maxMarks || 100;
                      const percentage = ((parseFloat(exam.marks) / maxMarks) * 100).toFixed(1);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 'bold' }}>{exam.semester || exam.year || 'Current'}</td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)' }}>{exam.examName}</td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{exam.date ? new Date(exam.date).toLocaleDateString() : 'N/A'}</td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--indigo-600, #4f46e5)', fontWeight: 'bold' }}>{exam.marks} / {maxMarks}</td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)' }}>{percentage}%</td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                            <span style={{ backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{exam.grade}</span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {isAddSubjectModalVisible && courseToEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '100%', borderRadius: '16px', padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => { setIsAddSubjectModalVisible(false); setCourseToEdit(null); setNewSubjectName(''); }} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X className="w-6 h-6" />
            </button>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>Add Module</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Module Name</label>
                <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Enter new module name" />
              </div>
              <Button type="primary" onClick={handleAddSubjectToCourse} style={{ width: '100%', marginTop: '8px', height: '40px' }}>Add Module</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {isEditCourseModalVisible && courseToEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '100%', borderRadius: '16px', padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => { setIsEditCourseModalVisible(false); setCourseToEdit(null); setNewCourseName(''); }} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X className="w-6 h-6" />
            </button>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>Edit Course</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Course Name</label>
                <Input value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="Enter course name" />
              </div>
              <Button type="primary" onClick={handleEditCourseName} style={{ width: '100%', marginTop: '8px', height: '40px' }}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Module Modal */}
      {isEditSubjectModalVisible && courseToEdit && subjectToEdit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1200, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.6))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', width: '500px', maxWidth: '100%', borderRadius: '16px', padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => { setIsEditSubjectModalVisible(false); setCourseToEdit(null); setSubjectToEdit(''); setNewSubjectName(''); }} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X className="w-6 h-6" />
            </button>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>Edit Module</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Module Name</label>
                <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="Enter module name" />
              </div>
              <Button type="primary" onClick={handleEditSubjectName} style={{ width: '100%', marginTop: '8px', height: '40px' }}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Marks Details Modal */}
      {isMarksDetailsModalVisible && selectedStudentForMarks && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: '#ffffff', color: '#111827', width: '800px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => {
                setIsMarksDetailsModalVisible(false);
                setSelectedStudentForMarks(null);
              }}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X className="w-6 h-6" />
            </button>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 'bold' }}>Test History: {selectedStudentForMarks.name}</h2>
            
            <div className="uxer-table-wrapper">
              <table className="uxer-table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Date Conducted</th>
                    <th>Marks Obtained</th>
                    <th>Grade</th>
                    <th>Staff Role</th>
                    <th>Uploaded By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudentForMarks.examHistory && selectedStudentForMarks.examHistory.length > 0 ? (
                    selectedStudentForMarks.examHistory.map((exam, i) => {
                      const fallbackAssignment = assignmentList.find(a => a.courseName === selectedStudentForMarks.course && a.studentIds?.includes(selectedStudentForMarks.id));
                      const fallbackStaff = fallbackAssignment ? fallbackAssignment.staffName : 'N/A';
                      const staffName = exam.uploadedByStaffName || exam.updatedBy || fallbackStaff;
                      const assignedRole = exam.staffRole || 'Faculty';

                      let totalObtained = exam.totalObtained !== undefined ? exam.totalObtained : Number(exam.marks) || 0;
                      let totalMax = exam.totalMax !== undefined ? exam.totalMax : 100;
                      let computedPercentage = exam.percentage !== undefined ? exam.percentage : ((totalObtained / totalMax) * 100).toFixed(2);
                      
                      const getGrade = (pct) => {
                        if (pct >= 90) return 'A+';
                        if (pct >= 80) return 'A';
                        if (pct >= 70) return 'B';
                        if (pct >= 60) return 'C';
                        return 'Fail';
                      };
                      
                      let computedGrade = exam.grade || getGrade(computedPercentage);

                      if (exam.subjects && Array.isArray(exam.subjects) && exam.subjects.length > 0) {
                        totalObtained = exam.subjects.reduce((sum, sub) => sum + (Number(sub.marks) || 0), 0);
                        totalMax = exam.subjects.reduce((sum, sub) => sum + (Number(sub.maxMarks) || 100), 0);
                        computedPercentage = ((totalObtained / totalMax) * 100).toFixed(2);
                        computedGrade = getGrade(computedPercentage);
                      }

                      return (
                        <tr key={i}>
                          <td>{exam.examName}</td>
                          <td>{exam.testDate || (exam.date ? new Date(exam.date).toLocaleDateString() : 'N/A')}</td>
                          <td style={{ fontWeight: 'bold' }}>
                            {totalObtained}/{totalMax} ({computedPercentage}%)
                          </td>
                          <td>
                            <span style={{ backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid var(--border-color)' }}>
                              {computedGrade}
                            </span>
                          </td>
                          <td><span style={{ textTransform: 'capitalize' }}>{assignedRole}</span></td>
                          <td>{staffName}</td>
                          <td>
                            <button
                              onClick={() => {
                                setSelectedExamForBreakdown({ ...exam, fallbackStaff, computedPercentage, computedGrade, totalObtained, totalMax });
                                setIsBreakdownModalVisible(true);
                              }}
                              className="uxer-action-btn"
                              style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)' }}
                            >
                              View Breakdown
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>No test history available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isBreakdownModalVisible && selectedExamForBreakdown && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.5))', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="custom-modal-viewport-card" style={{ backgroundColor: '#ffffff', color: '#111827', width: '700px', maxWidth: '94%', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => {
                setIsBreakdownModalVisible(false);
                setSelectedExamForBreakdown(null);
              }}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X className="w-6 h-6" />
            </button>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold' }}>Subject Breakdown: {selectedExamForBreakdown.examName}</h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>Date: {selectedExamForBreakdown.testDate || (selectedExamForBreakdown.date ? new Date(selectedExamForBreakdown.date).toLocaleDateString() : 'N/A')}</p>
            
            <div className="uxer-table-wrapper" style={{ marginBottom: '24px' }}>
              <table className="uxer-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Marks Obtained</th>
                    <th>Max Marks</th>
                    <th>Subject Handled By</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExamForBreakdown.subjects && selectedExamForBreakdown.subjects.length > 0 ? (
                    selectedExamForBreakdown.subjects.map((sub, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{sub.subjectName || sub.name || 'Unknown'}</td>
                        <td>{sub.marks || 0}</td>
                        <td>{sub.maxMarks || 100}</td>
                        <td>{sub.handledBy || selectedExamForBreakdown.uploadedByStaffName || selectedExamForBreakdown.fallbackStaff}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>General / Overall</td>
                      <td>{selectedExamForBreakdown.marks || selectedExamForBreakdown.totalObtained || 0}</td>
                      <td>{selectedExamForBreakdown.totalMax || 100}</td>
                      <td>{selectedExamForBreakdown.subjectHandled || selectedExamForBreakdown.uploadedByStaffName || selectedExamForBreakdown.fallbackStaff}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Total Marks</span>
                <strong style={{ fontSize: '18px' }}>{selectedExamForBreakdown.totalObtained}/{selectedExamForBreakdown.totalMax}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Percentage</span>
                <strong style={{ fontSize: '18px' }}>{selectedExamForBreakdown.computedPercentage}%</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Overall Grade</span>
                <strong style={{ fontSize: '18px', color: 'var(--blue-600)' }}>{selectedExamForBreakdown.computedGrade}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
};

export default AdminDashboard;
