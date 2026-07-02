import { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Card, Avatar, Button, Upload, message, Table, Modal, Form, Input, DatePicker, Select, Tag, Checkbox, Popconfirm } from 'antd';
import axios from 'axios';
import { InboxOutlined } from '@ant-design/icons';
import { createStudent, logoutUser, getOrganizationStudents, deleteUserDoc, updateUserDoc, getStaffAssignments, updateCourseAssignment, getOrganizationDetails, saveAttendanceHistory, getAttendanceHistoryByFaculty } from '../../firebase/services';
import { LogOut, Calendar as CalendarIcon, Clock, Users, BookOpen, ChevronRight, Upload as UploadIcon, FileText, ClipboardList, Pencil, Download, CheckCircle, XCircle, GraduationCap, UploadCloud, FileSpreadsheet, Calendar, Video, ArrowLeft, Mic, MicOff, Monitor, Paperclip, CheckCircle2, Trash2, ChevronDown, UserCheck, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

const { Header, Content, Sider } = Layout;
const { Dragger } = Upload;
const { Option } = Select;

const StaffDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [studentForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [studentList, setStudentList] = useState([]);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [scheduleList, setScheduleList] = useState([]);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [attendanceState, setAttendanceState] = useState({});
  const [isSubmitSummaryModalVisible, setIsSubmitSummaryModalVisible] = useState(false);
  const [absenteesList, setAbsenteesList] = useState([]);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [attendanceHistoryList, setAttendanceHistoryList] = useState([]);

  const isAttendanceEditable = (timingString) => {
    if (!timingString) return true;
    try {
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

  const activeBatchEditable = selectedBatch ? isAttendanceEditable(selectedBatch.classTiming) : false;

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

  const handleSubmitAttendance = async () => {
    setSubmittingAttendance(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentAttendanceLog = selectedBatch.attendance || {};
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
      
      currentAttendanceLog[today] = newAttendanceRecord;
      await updateCourseAssignment(selectedBatch.id, { attendance: currentAttendanceLog });
      
      const totalAbsentees = records.filter(r => r.status === 'A').length;
      const totalPresentees = records.filter(r => r.status === 'P').length;
      
      // Save history to Firestore
      await saveAttendanceHistory(user.organizationAccessId, {
        batchName: selectedBatch.courseName,
        date: today,
        slot: selectedBatch.classTiming,
        facultyName: user.name,
        totalAbsentees: totalAbsentees,
        totalPresentees: totalPresentees,
        records: records
      });
      
      message.success("Attendance submitted successfully!");
      setAbsenteesList(absentees);
      setIsSubmitSummaryModalVisible(true);
      fetchStudents();
    } catch (e) {
      message.error("Failed to submit attendance: " + e.message);
    } finally {
      setSubmittingAttendance(false);
    }
  };

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

  const fetchStudents = async () => {
    if (!user?.organizationId) return;
    try {
      const [students, assignments, orgDetails] = await Promise.all([
        getOrganizationStudents(user.organizationId),
        getStaffAssignments(user.organizationId, user.id),
        getOrganizationDetails(user.organizationId)
      ]);
      setStudentList(students);
      setScheduleList(assignments);
      if (orgDetails.logoUrl) setLogoUrl(orgDetails.logoUrl);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAttendanceHistory();
  }, [user?.organizationId]);

  const handleDeleteStudent = async (id) => {
    try {
      await deleteUserDoc(id);
      message.success("User removed successfully");
      fetchStudents();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditClick = (record) => {
    setEditingStudent(record);
    editForm.setFieldsValue({
      name: record.name,
      email: record.email,
      course: record.course,
      courseFee: record.courseFee,
      phoneNumber: record.phoneNumber,
      parentPhone: record.parentPhone,
      status: record.status,
      enrollmentNo: record.enrollmentNo
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    setEditLoading(true);
    try {
      if (values.phoneNumber && !values.phoneNumber.startsWith('+')) values.phoneNumber = `+91${values.phoneNumber}`;
      if (values.parentPhone && !values.parentPhone.startsWith('+')) values.parentPhone = `+91${values.parentPhone}`;
      await updateUserDoc(editingStudent.id, values);
      message.success("Profile updated successfully!");
      setIsEditModalVisible(false);
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

  const studentColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: 'Course', dataIndex: 'course', key: 'course', width: 100 },
    {
      title: 'Actions', key: 'actions', width: 180, align: 'center', render: (_, record) => (
        <div className="flex gap-4 items-center justify-center">
          <Pencil className="w-5 h-5 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors" title="Edit" aria-label="Edit" onClick={() => handleEditClick(record)} />
          <Popconfirm title="Are you sure you want to remove this student?" onConfirm={() => handleDeleteStudent(record.id)} okText="Yes" cancelText="No">
            <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800 cursor-pointer transition-colors" title="Delete" aria-label="Delete" />
          </Popconfirm>
        </div>
      )
    }
  ];

  const handleCreateStudent = async (values) => {
    setLoading(true);
    try {
      const studentData = {
        name: values.name,
        email: values.email,
        organizationAccessId: user.organizationAccessId,
        gender: values.gender,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        dateOfJoining: values.dateOfJoining ? values.dateOfJoining.format('YYYY-MM-DD') : null,
        enrollmentNo: values.enrollmentNo,
        course: values.course,
        courseFee: values.courseFee,
        phoneNumber: values.phoneNumber,
        parentPhone: values.parentPhone,
        status: values.status
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
    <Layout className="min-h-screen bg-slate-50">
      <Header className="bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Organization Logo" className="h-8 object-contain" />
          ) : (
            <Users className="w-6 h-6 text-blue-600" />
          )}
          <h1 className="text-xl font-bold text-slate-800 m-0">Faculty Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.organizationName}</div>
          </div>
          <Button icon={<LogOut className="w-4 h-4" />} onClick={logoutUser}>
            Logout
          </Button>
        </div>
      </Header>

      <Layout>
        <Sider width={250} theme="light" className="border-r border-slate-200 hidden md:block">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => setActiveTab(key)}
            items={[
              { key: '1', icon: <GraduationCap className="w-4 h-4" />, label: 'Add Single Student' },
              { key: '2', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Bulk Import' },
              { key: '4', icon: <Calendar className="w-4 h-4" />, label: 'My Schedule' },
              { key: '5', icon: <ClipboardList className="w-4 h-4" />, label: 'Attendance Management' },
              { key: '3', icon: <Users className="w-4 h-4" />, label: 'Manage Students' },
            ]}
            className="h-full border-r-0 pt-4"
          />
        </Sider>

        <Layout className="p-4 md:p-8">
          <Content className="max-w-5xl mx-auto w-full">
            <div className="bg-white p-2 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              {activeTab === '1' && (
                <div className="mt-4 flex justify-center">
                  <div className="w-full max-w-2xl">
                    <Form form={studentForm} layout="vertical" onFinish={handleCreateStudent}>
                      <Form.Item name="enrollmentNo" label="Enrollment No." rules={[{ required: true }]}>
                        <Input placeholder="Enrollment Number" />
                      </Form.Item>
                      <Form.Item name="course" label="Course" rules={[{ required: true }]}>
                        <Input placeholder="Course Name" />
                      </Form.Item>
                      <Form.Item name="name" label="Student Name" rules={[{ required: true }]}>
                        <Input placeholder="Enter student name" />
                      </Form.Item>
                      <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                        <Select placeholder="Select Gender">
                          <Option value="Male">Male</Option>
                          <Option value="Female">Female</Option>
                          <Option value="Other">Other</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="dob" label="Date of Birth" rules={[{ required: true }]}>
                        <DatePicker className="w-full" />
                      </Form.Item>
                      <Form.Item name="dateOfJoining" label="Date of Joining" rules={[{ required: true }]}>
                        <DatePicker className="w-full" />
                      </Form.Item>
                      <Form.Item name="courseFee" label="Course Fee">
                        <Input type="number" placeholder="Course Fee" />
                      </Form.Item>
                      <Form.Item name="phoneNumber" label="Student Phone Number" rules={[{ required: true }]}>
                        <Input placeholder="Student Phone" />
                      </Form.Item>
                      <Form.Item name="parentPhone" label="Parent Phone Number">
                        <Input placeholder="Parent Phone" />
                      </Form.Item>
                      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select placeholder="Select Status">
                          <Option value="Active">Active</Option>
                          <Option value="Passed Out">Passed Out</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="email" label="Student Email" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="Enter student email" />
                      </Form.Item>
                      <Form.Item name="sendSMS" valuePropName="checked" initialValue={true}>
                        <Checkbox>Send Welcome WhatsApp Notification to Student & Parent</Checkbox>
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full bg-blue-600">
                        Create Student
                      </Button>
                    </Form>
                  </div>
                </div>
              )}

              {activeTab === '2' && (
                <div className="mt-6 flex flex-col items-center justify-center w-full px-4 sm:px-8">
                  <div className="w-full max-w-3xl flex flex-col gap-6">
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-blue-800 text-sm text-center shadow-sm">
                      <strong>Instructions:</strong> Please upload a CSV file with columns <code>Name</code>, <code>Email</code>, <code>Gender</code>, <code>DOB</code>, <code>DateOfJoining</code>, <code>EnrollmentNo</code>, <code>Course</code>, <code>CourseFee</code>, <code>StudentPhone</code>, <code>ParentPhone</code>, <code>Status</code>.
                    </div>
                    <div className="w-full">
                      <Dragger
                        accept=".csv"
                        beforeUpload={processCSV}
                        showUploadList={false}
                        disabled={uploading}
                        className="p-10 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        <p className="ant-upload-drag-icon">
                          <UploadCloud className="w-14 h-14 text-blue-500 mx-auto mb-4" />
                        </p>
                        <p className="text-xl font-semibold text-slate-700">Click or drag CSV file to this area to upload</p>
                        <p className="text-slate-500 mt-3 text-base">
                          Strictly single CSV file upload. {uploading && <span className="text-blue-600 font-semibold animate-pulse block mt-2">Processing...</span>}
                        </p>
                      </Dragger>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === '4' && (
                <div className="mt-6 w-full">
                  {!selectedBatch ? (
                    <div className="w-full flex flex-col gap-6">
                      <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-slate-800">My Assigned Batches</h3>
                        <p className="text-slate-500 mt-1">Select a batch to view details, mark attendance, and launch classes.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scheduleList.map((batch, index) => (
                          <div 
                            key={batch.id || index} 
                            onClick={() => setSelectedBatch(batch)}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="text-lg font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-lg">Batch {index + 1}</h4>
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">{batch.studentNames?.length || 0} Students</span>
                              </div>
                              <h5 className="text-xl font-bold text-slate-800 mb-2">{batch.courseName}</h5>
                              <div className="space-y-2 text-slate-600">
                                <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {batch.startDate} to {batch.endDate}</p>
                                <p className="flex items-center gap-2"><Users className="w-4 h-4" /> {batch.classTiming}</p>
                              </div>
                            </div>
                            <Button type="primary" className="mt-6 w-full bg-slate-800 hover:bg-slate-700">View Batch Details</Button>
                          </div>
                        ))}
                        {scheduleList.length === 0 && (
                          <div className="col-span-full text-center py-10 text-slate-500">
                            No batches assigned to you yet.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-6">
                      <div className="flex items-center justify-between mb-2">
                        <Button type="text" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => setSelectedBatch(null)} className="flex items-center text-slate-600 hover:text-slate-900">
                          Back to Batches
                        </Button>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 sm:p-8 shadow-md text-white flex flex-col justify-between items-start gap-6 transition-all duration-300">
                        <div>
                          <span className="bg-blue-800/50 text-blue-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">Active Batch</span>
                          <h2 className="text-2xl sm:text-3xl font-bold mb-2">{selectedBatch.courseName}</h2>
                          <div className="flex flex-wrap gap-4 text-blue-100 text-sm">
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {selectedBatch.startDate} - {selectedBatch.endDate}</span>
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {selectedBatch.classTiming}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-4">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">Student Attendance Roster</h3>
                            <p className="text-slate-500 text-sm m-0">
                              {activeBatchEditable ? 'You can edit attendance freely within the class duration.' : 'Editing is now blocked as the class time has passed.'}
                            </p>
                          </div>
                          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm font-semibold text-slate-700">
                            Total: {activeBatchStudents.length}
                          </div>
                        </div>
                        <Table
                          dataSource={activeBatchStudents}
                          rowKey="id"
                          pagination={{ pageSize: 10 }}
                          columns={[
                            { title: 'Student Name', dataIndex: 'name', key: 'name', className: 'font-medium text-slate-700' },
                            { 
                              title: 'Attendance Status', 
                              key: 'status', 
                              align: 'center', 
                              render: (_, record) => {
                                const status = attendanceState[record.id] || 'A';
                                return (
                                  <button
                                    onClick={() => toggleAttendance(record.id)}
                                    disabled={!activeBatchEditable}
                                    className={`w-12 h-10 rounded-lg font-bold text-lg text-white shadow-sm transition-all ${status === 'P' ? 'bg-green-500 hover:bg-green-600 scale-105' : 'bg-red-400 hover:bg-red-500'} ${!activeBatchEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {status}
                                  </button>
                                );
                              }
                            }
                          ]}
                        />
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                          <Button 
                            type="primary" 
                            size="large" 
                            className="bg-blue-600 hover:bg-blue-700 px-8" 
                            onClick={handleSubmitAttendance}
                            loading={submittingAttendance}
                            disabled={!activeBatchEditable}
                          >
                            Submit Attendance
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {activeTab === '3' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Student Roster</h3>
                <div className="w-full overflow-x-auto">
                  <Table 
                    dataSource={studentList} 
                    columns={studentColumns} 
                    rowKey="id" 
                    pagination={{ pageSize: 5 }} 
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              </div>
            )}
            {activeTab === '5' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full mt-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Attendance Management (History)</h3>
                <div className="w-full overflow-x-auto">
                  <Table 
                    dataSource={attendanceHistoryList} 
                    rowKey="id" 
                    pagination={{ pageSize: 10 }} 
                    scroll={{ x: 'max-content' }}
                    expandedRowKeys={expandedRowId ? [expandedRowId] : []}
                    onRow={(record) => ({
                      onClick: () => setExpandedRowId(expandedRowId === record.id ? null : record.id),
                      className: "cursor-pointer hover:bg-slate-50 transition-colors"
                    })}
                    expandable={{
                      showExpandColumn: false,
                      expandedRowRender: record => (
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner my-2">
                          <h4 className="font-bold text-slate-800 mb-4 text-lg border-b border-slate-200 pb-2">Student Attendance List</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                            {record.records && Array.isArray(record.records) ? record.records.map((r, i) => (
                              <div key={i} className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded-lg shadow-sm hover:border-blue-200 transition-colors">
                                <span className="font-medium text-slate-700">{r.studentName}</span>
                                {r.status === 'P' ? (
                                  <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-bold"><CheckCircle className="w-4 h-4" /> Present</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-bold"><XCircle className="w-4 h-4" /> Absent</span>
                                )}
                              </div>
                            )) : <p className="p-4 text-slate-500 italic col-span-full">No records found for this batch.</p>}
                          </div>
                          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="text-slate-700 font-semibold mb-3 sm:mb-0 text-lg flex items-center gap-4">
                              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Total Present: {record.totalPresentees || 0}</span>
                              <span className="text-slate-300">|</span>
                              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Total Absent: {record.totalAbsentees || 0}</span>
                            </div>
                            <Button 
                              type="primary" 
                              icon={<Download className="w-4 h-4" />} 
                              onClick={(e) => { e.stopPropagation(); downloadAttendanceCSV(record); }}
                              className="bg-indigo-600 hover:bg-indigo-700 border-none shadow-md px-6"
                            >
                              Download Report
                            </Button>
                          </div>
                        </div>
                      )
                    }}
                    columns={[
                      { title: 'Date', dataIndex: 'date', key: 'date' },
                      { title: 'Batch Name', dataIndex: 'batchName', key: 'batchName' },
                      { title: 'Time Slot', dataIndex: 'slot', key: 'slot' },
                      { title: 'Total Students', render: (_, r) => r.records?.length || 0 },
                      { title: 'Present', render: (_, r) => r.totalPresentees !== undefined ? r.totalPresentees : (r.records?.filter(rec => rec.status === 'P').length || 0), className: 'text-green-600 font-semibold' },
                      { title: 'Absent', render: (_, r) => r.totalAbsentees !== undefined ? r.totalAbsentees : (r.records?.filter(rec => rec.status === 'A').length || 0), className: 'text-red-600 font-semibold' },
                      { 
                        title: 'Action', 
                        render: (_, r) => {
                          const today = new Date().toISOString().split('T')[0];
                          const isToday = r.date === today;
                          const editable = isToday && isAttendanceEditable(r.slot);
                          
                          if (editable) {
                            return (
                              <Button 
                                type="primary" 
                                size="small" 
                                icon={<Pencil className="w-3 h-3" />} 
                                className="bg-blue-600 hover:bg-blue-700 border-none flex items-center"
                                onClick={() => {
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
                                    setActiveTab('4');
                                  } else {
                                    message.error("Batch details not found in schedule.");
                                  }
                                }}
                              >
                                Edit
                              </Button>
                            );
                          } else {
                            return <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-semibold border border-slate-200">Closed</span>;
                          }
                        }
                      }
                    ]}
                  />
                </div>
              </div>
            )}
      </Content>
      </Layout>
    </Layout>
    
    <Modal
      title="Edit Student Profile"
      open={isEditModalVisible}
      onCancel={() => setIsEditModalVisible(false)}
      footer={null}
      destroyOnHidden={true}
    >
      <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
          <Input placeholder="Enter student name" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input placeholder="Enter student email" />
        </Form.Item>
        <Form.Item name="enrollmentNo" label="Enrollment No." rules={[{ required: true }]}>
          <Input placeholder="Enrollment Number" />
        </Form.Item>
        <Form.Item name="course" label="Course" rules={[{ required: true }]}>
          <Input placeholder="Course Name" />
        </Form.Item>
        <Form.Item name="courseFee" label="Course Fee">
          <Input type="number" placeholder="Course Fee" />
        </Form.Item>
        <Form.Item name="phoneNumber" label="Student Phone Number" rules={[{ required: true }]}>
          <Input placeholder="Student Phone" addonBefore={<span>+91 (IN)</span>} />
        </Form.Item>
        <Form.Item name="parentPhone" label="Parent Phone Number">
          <Input placeholder="Parent Phone" addonBefore={<span>+91 (IN)</span>} />
        </Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select placeholder="Select Status">
            <Option value="Active">Active</Option>
            <Option value="Passed Out">Passed Out</Option>
          </Select>
        </Form.Item>
        <Form.Item className="mb-0 text-right">
          <Button onClick={() => setIsEditModalVisible(false)} className="mr-2">Cancel</Button>
          <Button type="primary" htmlType="submit" loading={editLoading}>Save Changes</Button>
        </Form.Item>
      </Form>
    </Modal>
    
    <Modal
      title={
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-6 h-6" />
          <span className="text-xl">Attendance Summary</span>
        </div>
      }
      open={isSubmitSummaryModalVisible}
      onCancel={() => setIsSubmitSummaryModalVisible(false)}
      footer={
        <div className="flex flex-col gap-3 mt-6">
          <Button type="primary" onClick={handleSendWhatsAppAlerts} loading={submittingAttendance} className="bg-green-600 hover:bg-green-700 w-full h-10 text-base" disabled={absenteesList.length === 0}>
            Send WhatsApp Notifications to Parents
          </Button>
          <Button onClick={() => setIsSubmitSummaryModalVisible(false)} className="w-full h-10">Close</Button>
        </div>
      }
      destroyOnHidden={true}
      width={450}
      className="rounded-xl overflow-hidden"
    >
      <div className="py-4 px-2">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
          <div className="grid grid-cols-2 gap-y-4 text-slate-700">
            <div className="font-semibold text-slate-500 text-sm uppercase">Batch</div>
            <div className="font-bold text-slate-800 text-right">{selectedBatch?.courseName || 'N/A'}</div>
            
            <div className="font-semibold text-slate-500 text-sm uppercase">Taken By</div>
            <div className="font-bold text-slate-800 text-right">{user?.name}</div>
            
            <div className="font-semibold text-slate-500 text-sm uppercase">Total Absentees</div>
            <div className="font-bold text-red-500 text-right text-lg">{absenteesList.length}</div>
          </div>
        </div>
        
        {absenteesList.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-lg p-3 max-h-48 overflow-y-auto mt-4">
            <p className="text-sm font-semibold text-slate-600 mb-2 border-b border-slate-100 pb-2">Absent Students:</p>
            <ul className="list-none p-0 m-0 space-y-2">
              {absenteesList.map(s => (
                <li key={s.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-700">{s.name}</span>
                  {s.parentPhone ? <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{s.parentPhone}</span> : <span className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded">No phone</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  </Layout>
);
};

export default StaffDashboard;
