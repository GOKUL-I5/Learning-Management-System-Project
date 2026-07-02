import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Form, Input, Button, Card, message, Layout, Typography, Table, Popconfirm, Modal, Select, DatePicker, Upload, Menu } from 'antd';
import { createStaff, logoutUser, createStudent, getOrganizationStaff, getOrganizationStudents, deleteUserDoc, updateUserDoc, createCourse, getOrganizationCourses, createCourseAssignment, getCourseAssignments, uploadCourseContentFile, deleteCourseAssignment, updateOrganizationLogo, getOrganizationDetails, getAttendanceHistoryByOrg } from '../../firebase/services';
import { Users, GraduationCap, LogOut, ShieldCheck, BookOpen, Calendar, UploadCloud, Settings, Search, Image as ImageIcon, Pencil, Trash2, FileSpreadsheet, ClipboardList, Download, CheckCircle, XCircle } from 'lucide-react';
import { Checkbox } from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Dragger } = Upload;

const AdminDashboard = () => {
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
  const selectedStudentIds = Form.useWatch('studentIds', assignmentForm) || [];
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  
  const userStr = localStorage.getItem('lms_user');
  const user = userStr ? JSON.parse(userStr) : null;

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

  const fetchStaffAndStudents = async () => {
    if (!user?.organizationId) return;
    try {
      const [staff, students, courses, assignments, orgDetails] = await Promise.all([
        getOrganizationStaff(user.organizationId),
        getOrganizationStudents(user.organizationId),
        getOrganizationCourses(user.organizationId),
        getCourseAssignments(user.organizationId),
        getOrganizationDetails(user.organizationId),
        getAttendanceHistoryByOrg(user.organizationAccessId)
      ]);
      setStaffList(staff);
      setStudentList(students);
      setCourseList(courses);
      setAssignmentList(assignments);
      setAttendanceHistoryList(history.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
      if (orgDetails.logoUrl) setLogoUrl(orgDetails.logoUrl);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStaffAndStudents();
  }, [user?.organizationId]);

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
      name: record.name,
      email: record.email,
      phoneNumber: record.phoneNumber
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async (values) => {
    setEditLoading(true);
    try {
      if (values.phoneNumber && !values.phoneNumber.startsWith('+')) values.phoneNumber = `+91${values.phoneNumber}`;
      if (values.parentPhone && !values.parentPhone.startsWith('+')) values.parentPhone = `+91${values.parentPhone}`;
      await updateUserDoc(editingUser.id, values);
      message.success("Profile updated successfully!");
      setIsEditModalVisible(false);
      fetchStaffAndStudents();
    } catch (error) {
      message.error("Failed to update profile: " + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const staffColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 250 },
    { title: 'Actions', key: 'actions', width: 150, align: 'center', render: (_, record) => (
      <div className="flex gap-4 items-center justify-center">
        <Pencil className="w-5 h-5 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors" title="Edit" aria-label="Edit" onClick={() => handleEditClick(record)} />
        <Popconfirm title="Are you sure you want to remove this faculty member?" onConfirm={() => handleDeleteUser(record.id)} okText="Yes" cancelText="No">
          <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800 cursor-pointer transition-colors" title="Delete" aria-label="Delete" />
        </Popconfirm>
      </div>
    )}
  ];

  const studentColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 250 },
    { title: 'Actions', key: 'actions', width: 150, align: 'center', render: (_, record) => (
      <div className="flex gap-4 items-center justify-center">
        <Pencil className="w-5 h-5 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors" title="Edit" aria-label="Edit" onClick={() => handleEditClick(record)} />
        <Popconfirm title="Are you sure you want to remove this student?" onConfirm={() => handleDeleteUser(record.id)} okText="Yes" cancelText="No">
          <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800 cursor-pointer transition-colors" title="Delete" aria-label="Delete" />
        </Popconfirm>
      </div>
    )}
  ];

  const handleDeleteAssignment = async (id) => {
    try {
      await deleteCourseAssignment(id);
      message.success("Assignment removed successfully");
      fetchStaffAndStudents();
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
    { title: 'Students Enrolled', key: 'students', width: 200, render: (_, record) => record.studentNames?.join(', ') || 'None' },
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
      const result = await createStaff(user.organizationId, user.organizationName, values.name, values.email, orgAccessId, values.phoneNumber);
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
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        await updateOrganizationLogo(user.organizationId, data.secure_url);
        setLogoUrl(data.secure_url);
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
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        dateOfJoining: values.dateOfJoining ? values.dateOfJoining.format('YYYY-MM-DD') : null,
        enrollmentNo: values.enrollmentNo,
        course: values.course,
        courseFee: values.courseFee,
        parentPhone: values.parentPhone,
        status: values.status
      };
      const result = await createStudent(user.organizationId, user.organizationName, studentData);
      message.success(`Student created successfully linked to Organization Access ID.`);
      studentForm.resetFields();
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

      await createCourse(user.organizationId, { 
        name: values.name, 
        description: values.description, 
        contentUrl: values.contentUrl || null,
        contentObjects: contentObjects 
      });

      message.success(`Course created successfully.`);
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
      icon: <Settings className="w-4 h-4" />,
      label: 'Management',
      children: [
        { key: '1', icon: <Users className="w-4 h-4" />, label: 'Manage Faculty' },
        { 
          key: '2', 
          icon: <GraduationCap className="w-4 h-4" />, 
          label: 'Manage Students',
          children: [
            { key: '2-1', label: 'Add Single Student' },
            { key: '2-2', icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Bulk Import' },
          ]
        },
        { key: '3', icon: <BookOpen className="w-4 h-4" />, label: 'Course Management' },
        { key: '4', icon: <ClipboardList className="w-4 h-4" />, label: 'Attendance Reports' },
      ],
    },
  ];

  return (
    <Layout className="min-h-screen bg-slate-50">
      <Header className="bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Organization Logo" className="h-8 object-contain" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          )}
          <h1 className="text-xl font-bold text-slate-800 m-0">Organization Admin Dashboard</h1>
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
        <Sider width={250} theme="light" className="border-r border-slate-200 hidden md:flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-white">
          <div className="p-6 border-b border-slate-100 flex flex-col items-center justify-center">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleLogoUpload}
              disabled={logoUploading}
              className="w-full flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center overflow-hidden cursor-pointer shadow-sm relative group bg-slate-50">
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt="Org Logo" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImageIcon className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
                  </div>
                )}
                {logoUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </Upload>
            <h4 className="text-sm font-semibold text-slate-700 mt-4 text-center">{user?.organizationName || 'Organization'}</h4>
            <p className="text-xs text-slate-400 text-center mt-1">Click logo to update</p>
          </div>

          <div className="flex-1">
            <Menu
              mode="inline"
              selectedKeys={[activeTab]}
              openKeys={openKeys}
              onOpenChange={setOpenKeys}
              onClick={({ key }) => setActiveTab(key)}
              items={menuItems}
              className="border-r-0 pt-2"
            />
          </div>
        </Sider>

        <Layout className="p-4 md:p-8 h-[calc(100vh-64px)] overflow-y-auto">
          <Content className="max-w-5xl mx-auto w-full">
            <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-indigo-900 mb-1">Welcome back, {user?.name}</h2>
                <p className="text-indigo-700 m-0">Managing <span className="font-semibold">{user?.organizationName}</span></p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm">
                <span className="text-xs text-slate-500 block">Organization Access ID</span>
                <span className="font-mono font-bold text-slate-800">{user?.organizationAccessId}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              {activeTab === '1' && (
                <div className="flex flex-col gap-8 items-center">
                  <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Add New Faculty Member</h3>
                    <Form form={staffForm} layout="vertical" onFinish={handleCreateStaff}>
                      <Form.Item name="name" label="Faculty Name" rules={[{ required: true }]}>
                        <Input placeholder="Enter faculty name" size="large" />
                      </Form.Item>
                      <Form.Item name="email" label="Faculty Email" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="Enter faculty email" size="large" />
                      </Form.Item>
                      <Form.Item name="phoneNumber" label="Faculty Phone Number" rules={[{ required: true }]}>
                        <Input placeholder="Enter faculty phone number" size="large" addonBefore={<span>+91 (IN)</span>} />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full bg-indigo-600">
                        Create Faculty Member
                      </Button>
                    </Form>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Manage Faculty</h3>
                    <div className="w-full overflow-x-auto">
                      <Table dataSource={staffList} columns={staffColumns} rowKey="id" pagination={{ pageSize: 5 }} scroll={{ x: 'max-content' }} />
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === '2-1' || activeTab === '2-2') && (
                <div className="flex flex-col gap-8 items-center">
                  {activeTab === '2-1' && (
                    <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                      <h3 className="text-lg font-semibold mb-4 text-slate-800">Add Single Student</h3>
                      <Form form={studentForm} layout="vertical" onFinish={handleCreateStudent}>
                        <Form.Item name="enrollmentNo" label="Enrollment No." rules={[{ required: true }]}>
                          <Input placeholder="Enrollment Number" size="large" />
                        </Form.Item>
                        <Form.Item name="course" label="Course" rules={[{ required: true }]}>
                          <Input placeholder="Course Name" size="large" />
                        </Form.Item>
                        <Form.Item name="name" label="Student Name" rules={[{ required: true }]}>
                          <Input placeholder="Enter student name" size="large" />
                        </Form.Item>
                        <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                          <Select placeholder="Select Gender" size="large">
                            <Select.Option value="Male">Male</Select.Option>
                            <Select.Option value="Female">Female</Select.Option>
                            <Select.Option value="Other">Other</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="dob" label="Date of Birth" rules={[{ required: true }]}>
                          <DatePicker className="w-full" size="large" />
                        </Form.Item>
                        <Form.Item name="dateOfJoining" label="Date of Joining" rules={[{ required: true }]}>
                          <DatePicker className="w-full" size="large" />
                        </Form.Item>
                        <Form.Item name="courseFee" label="Course Fee">
                          <Input type="number" placeholder="Course Fee" size="large" />
                        </Form.Item>
                        <Form.Item name="phoneNumber" label="Student Phone Number" rules={[{ required: true }]}>
                          <Input placeholder="Enter student phone number" size="large" addonBefore={<span>+91 (IN)</span>} />
                        </Form.Item>
                        <Form.Item name="parentPhone" label="Parent Phone Number">
                          <Input placeholder="Parent Phone" size="large" addonBefore={<span>+91 (IN)</span>} />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                          <Select placeholder="Select Status" size="large">
                            <Select.Option value="Active">Active</Select.Option>
                            <Select.Option value="Passed Out">Passed Out</Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="email" label="Student Email" rules={[{ required: true, type: 'email' }]}>
                          <Input placeholder="Enter student email" size="large" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full bg-blue-600">
                          Create Student
                        </Button>
                      </Form>
                    </div>
                  )}

                  {activeTab === '2-2' && (
                    <div className="w-full max-w-3xl flex flex-col gap-6">
                      <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 text-indigo-800 text-sm text-center shadow-sm">
                        <strong>Instructions:</strong> Please upload a CSV file with columns <code>Name</code>, <code>Email</code>, <code>Gender</code>, <code>DOB</code>, <code>DateOfJoining</code>, <code>EnrollmentNo</code>, <code>Course</code>, <code>CourseFee</code>, <code>StudentPhone</code>, <code>ParentPhone</code>, <code>Status</code>.
                      </div>
                      <div className="w-full">
                        <Dragger
                          accept=".csv"
                          beforeUpload={processCSV}
                          showUploadList={false}
                          disabled={csvUploading}
                          className="p-10 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all shadow-sm"
                        >
                          <p className="ant-upload-drag-icon">
                            <UploadCloud className="w-14 h-14 text-indigo-500 mx-auto mb-4" />
                          </p>
                          <p className="text-xl font-semibold text-slate-700">Click or drag CSV file to this area to upload</p>
                          <p className="text-slate-500 mt-3 text-base">
                            Strictly single CSV file upload. {csvUploading && <span className="text-indigo-600 font-semibold animate-pulse block mt-2">Processing...</span>}
                          </p>
                        </Dragger>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Manage Students</h3>
                    <div className="w-full overflow-x-auto">
                      <Table dataSource={studentList} columns={studentColumns} rowKey="id" pagination={{ pageSize: 5 }} scroll={{ x: 'max-content' }} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === '3' && (
                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                      <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500" /> Create Custom Course</h3>
                      <Form form={courseForm} layout="vertical" onFinish={handleCreateCourse}>
                        <Form.Item name="name" label="Course Name" rules={[{ required: true }]}>
                          <Input placeholder="Enter custom course name" size="large" />
                        </Form.Item>
                        <Form.Item name="description" label="Description">
                          <Input.TextArea placeholder="Course description" rows={3} />
                        </Form.Item>
                        <Form.Item name="contentUrl" label="Content Link (Drive/Docs)">
                          <Input placeholder="Enter URL" size="large" />
                        </Form.Item>
                        <Form.Item label="Upload Content Files (PDFs/Images)">
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
                        <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full bg-indigo-600">
                          Create Course
                        </Button>
                      </Form>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                      <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-green-500" /> Assign Faculty to Course</h3>
                      <Form form={assignmentForm} layout="vertical" onFinish={handleCreateAssignment}>
                        <Form.Item name="courseName" label="Select Course or Module" rules={[{ required: true }]}>
                          <Select placeholder="Select a course or specific module (e.g., Python, Tally, MS Office)" size="large" onChange={(val) => setSelectedCourseForEnrollment(val)}>
                            {courseList.map(course => <Select.Option key={course.id} value={course.name}>{course.name}</Select.Option>)}
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
                        <Form.Item name="studentIds" label="Enroll Students" rules={[{ required: true }]}>
                          <Select
                            mode="multiple"
                            placeholder="Select students to enroll"
                            size="large"
                            maxTagCount={0}
                            maxTagPlaceholder={(omitted) => `${omitted.length} Students Selected`}
                            dropdownRender={() => {
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
                        <Button type="primary" htmlType="submit" loading={loading} size="large" className="w-full bg-green-600 border-none hover:bg-green-700 text-white">
                          Assign Course
                        </Button>
                      </Form>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Assigned Courses Roster</h3>
                    <div className="w-full overflow-x-auto">
                      <Table dataSource={assignmentList} columns={assignmentColumns} rowKey="id" pagination={{ pageSize: 5 }} scroll={{ x: 'max-content' }} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === '4' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full">
                  <h3 className="text-lg font-semibold mb-4 text-slate-800">Organization Attendance Reports</h3>
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
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Total Present: {record.totalPresentees !== undefined ? record.totalPresentees : (record.records?.filter(rec => rec.status === 'P').length || 0)}</span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Total Absent: {record.totalAbsentees !== undefined ? record.totalAbsentees : (record.records?.filter(rec => rec.status === 'A').length || 0)}</span>
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
                        { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
                        { title: 'Batch Name', dataIndex: 'batchName', key: 'batchName', width: 150 },
                        { title: 'Faculty', dataIndex: 'facultyName', key: 'facultyName', width: 150 },
                        { title: 'Time Slot', dataIndex: 'slot', key: 'slot', width: 150 },
                        { title: 'Total Students', render: (_, r) => r.records?.length || 0, width: 120 },
                        { title: 'Present', render: (_, r) => r.totalPresentees !== undefined ? r.totalPresentees : (r.records?.filter(rec => rec.status === 'P').length || 0), className: 'text-green-600 font-semibold', width: 100 },
                        { title: 'Absent', render: (_, r) => r.totalAbsentees !== undefined ? r.totalAbsentees : (r.records?.filter(rec => rec.status === 'A').length || 0), className: 'text-red-600 font-semibold', width: 100 }
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          </Content>
        </Layout>
      </Layout>
      
      <Modal
        title={`Edit ${editingUser?.role === 'staff' ? 'Faculty' : 'Student'} Profile`}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="Enter name" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Enter email" />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}>
            <Input placeholder="Enter phone number" />
          </Form.Item>
          <Form.Item className="mb-0 text-right">
            <Button onClick={() => setIsEditModalVisible(false)} className="mr-2">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={editLoading}>Save Changes</Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;
