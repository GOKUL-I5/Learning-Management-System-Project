import { useState, useEffect } from 'react';
import { Layout, Card, Avatar, Upload, message, Button, Menu } from 'antd';
import { logoutUser, uploadProfilePhoto, getStudentAssignments, getOrganizationCourses, subscribeToStudentAssignments, getOrganizationDetails, updateUserDoc } from '../../firebase/services';
import { LogOut, BookOpen, User, Building, Mail, Key, Calendar, Clock, ExternalLink, FileText, Download, Video, Pencil, Check, X } from 'lucide-react';

const { Header, Content, Sider } = Layout;

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
  const [editNameValue, setEditNameValue] = useState('');

  useEffect(() => {
    if (!user?.organizationId || !user?.id) return;
    
    // Fetch courses and org details once
    Promise.all([
      getOrganizationCourses(user.organizationId),
      getOrganizationDetails(user.organizationId)
    ]).then(([courses, orgDetails]) => {
      if (orgDetails.logoUrl) setLogoUrl(orgDetails.logoUrl);

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

  const handlePhotoUpload = async (info) => {
    const file = info.file;
    if (!file) return;

    setUploading(true);
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
        await updateUserDoc(user.id, { photoUrl: data.secure_url });
        const updatedUser = { ...user, photoUrl: data.secure_url };
        setUser(updatedUser);
        localStorage.setItem('lms_user', JSON.stringify(updatedUser));
        message.success('Profile photo updated successfully!');
      } else {
        throw new Error(data.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      message.error(error.message);
    } finally {
      setUploading(false);
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

  return (
    <Layout className="min-h-screen bg-slate-50">
      <Header className="bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Organization Logo" className="h-8 object-contain" />
          ) : (
            <BookOpen className="w-6 h-6 text-green-600" />
          )}
          <h1 className="text-xl font-bold text-slate-800 m-0">Student Portal</h1>
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
              { key: 'dashboard', icon: <User className="w-4 h-4" />, label: 'Dashboard' },
              { key: 'course', icon: <FileText className="w-4 h-4" />, label: 'View Course' },
            ]}
            className="h-full border-r-0 pt-4"
          />
        </Sider>

        <Layout className="p-4 md:p-8">
          <Content className="max-w-5xl mx-auto w-full">
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-3xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex items-center gap-6">
            <Upload
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handlePhotoUpload}
              disabled={uploading}
            >
              <div className="relative group cursor-pointer">
                <Avatar 
                  size={80} 
                  src={user?.photoUrl}
                  className="bg-white text-green-600 text-3xl font-bold shadow-md hover:opacity-80 transition-opacity"
                >
                  {!user?.photoUrl && user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-semibold">Upload</span>
                </div>
              </div>
            </Upload>
            <div>
              {!isEditingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-3xl font-bold m-0">{user?.name}</h2>
                  <Pencil 
                    className="text-gray-200 hover:text-white h-5 w-5 cursor-pointer ml-2 transition-colors" 
                    onClick={() => { setIsEditingName(true); setEditNameValue(user?.name || ''); }} 
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <input 
                    type="text" 
                    value={editNameValue} 
                    onChange={(e) => setEditNameValue(e.target.value)} 
                    className="text-2xl font-bold text-slate-800 bg-white border border-slate-300 rounded px-3 py-1 outline-none focus:border-green-500 w-64 shadow-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <Button 
                    size="middle" 
                    type="primary" 
                    className="bg-green-600 border-none flex items-center justify-center shadow-sm hover:bg-green-700" 
                    icon={<Check className="w-4 h-4" />} 
                    onClick={handleSaveName} 
                  />
                  <Button 
                    size="middle" 
                    className="flex items-center justify-center bg-white/20 text-white border-transparent hover:bg-white/30 hover:text-white"
                    icon={<X className="w-4 h-4" />} 
                    onClick={() => setIsEditingName(false)} 
                  />
                </div>
              )}
              <p className="text-green-50 text-lg m-0 opacity-90">{user?.organizationName}</p>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            title={<span className="flex items-center gap-2 text-slate-800"><User className="w-5 h-5 text-green-500" /> Profile Details</span>}
            className="shadow-sm border-slate-200 rounded-2xl"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email Address</div>
                  <div className="text-slate-800 font-medium">{user?.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <Building className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Organization</div>
                  <div className="text-slate-800 font-medium">{user?.organizationName}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <Key className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Enrollment No.</div>
                  <div className="text-slate-800 font-medium">{user?.enrollmentNo || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <User className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">DOB & Gender</div>
                  <div className="text-slate-800 font-medium">{user?.dob || 'N/A'} | {user?.gender || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Organization Access ID</div>
                  <div className="text-slate-800 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-sm">{user?.organizationAccessId}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card 
            title={<span className="flex items-center gap-2 text-slate-800"><BookOpen className="w-5 h-5 text-teal-500" /> Assigned Course</span>}
            className="shadow-sm border-slate-200 rounded-2xl flex flex-col justify-center min-h-[300px]"
          >
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
                    <Button 
                      type="primary" 
                      size="large" 
                      icon={<Video className="w-5 h-5 animate-pulse" />} 
                      className="bg-red-500 hover:bg-red-600 border-none shadow-md flex items-center gap-2"
                      onClick={() => window.open(`https://meet.jit.si/${assignment.liveRoomName}`, '_blank')}
                    >
                      Join Live Class
                    </Button>
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
                <Button 
                  type="primary" 
                  size="large" 
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 border-none shadow-md"
                  onClick={() => setActiveTab('course')}
                >
                  Go to Course Materials
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <BookOpen className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-600 font-medium mb-1">No course assigned yet</h3>
                <p className="text-slate-400 text-sm">Your admin will assign you to a specific batch and schedule soon.</p>
              </div>
            )}
          </Card>
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
                      <Button 
                        type="primary" 
                        size="large" 
                        icon={<ExternalLink className="w-4 h-4" />} 
                        className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 border-none flex justify-between items-center px-6"
                        onClick={() => window.open(courseContentUrl, '_blank')}
                      >
                        <span className="flex items-center gap-2">Open External Drive Link</span>
                        <ExternalLink className="w-4 h-4 ml-4" />
                      </Button>
                    )}
                    
                    {contentObjects.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Attached Files</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {contentObjects.map((fileObj, idx) => (
                            <Button
                              key={idx}
                              size="large"
                              icon={<FileText className="w-5 h-5 text-blue-500" />}
                              className="w-full text-left flex items-center justify-between shadow-sm border border-slate-200 hover:border-blue-400 hover:text-blue-600 h-auto py-4"
                              onClick={() => window.open(fileObj.url, '_blank')}
                            >
                              <span className="truncate flex-1 ml-3 font-medium">{fileObj.name}</span>
                              <Download className="w-5 h-5 text-slate-400" />
                            </Button>
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
          </div>
        )}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default StudentDashboard;
