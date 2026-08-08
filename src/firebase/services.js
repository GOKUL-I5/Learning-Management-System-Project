import { db, auth, storage } from './config';
import { GoogleAuthProvider, signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc as firestoreAddDoc,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
  updateDoc as firestoreUpdateDoc,
  onSnapshot,
  setDoc as firestoreSetDoc,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const sanitizePayload = (obj) => {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePayload(item));
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      sanitized[key] = "";
    } else if (value && typeof value === 'object' && typeof value.toDate !== 'function') {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const addDoc = (collRef, data) => {
  return firestoreAddDoc(collRef, sanitizePayload(data));
};

const updateDoc = (docRef, data) => {
  return firestoreUpdateDoc(docRef, sanitizePayload(data));
};

const setDoc = (docRef, data, options) => {
  return firestoreSetDoc(docRef, sanitizePayload(data), options);
};

export const logTransaction = async (action, data) => {
  await addDoc(collection(db, 'transaction_logs'), {
    action,
    ...data,
    timestamp: serverTimestamp()
  });
};

export const ensureSuperAdminInFirestore = async (email, name) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    const newDoc = await addDoc(usersRef, {
      email,
      name: name || 'Super Admin',
      role: 'superadmin',
      createdAt: serverTimestamp()
    });
    return { id: newDoc.id, email, name: name || 'Super Admin', role: 'superadmin' };
  } else {
    const docData = snapshot.docs[0];
    if (docData.data().role !== 'superadmin') {
      await updateDoc(doc(db, 'users', docData.id), { role: 'superadmin' });
    }
    return { id: docData.id, ...docData.data(), role: 'superadmin' };
  }
};

export const identifyUser = async (identifier) => {
  if (identifier === 'santhanabharaths@gmail.com' || identifier === 'ksquarestudio2025@gmail.com') {
    const user = {
      id: 'superadmin_id',
      email: identifier,
      name: identifier === 'santhanabharaths@gmail.com' ? 'Santhanabharath' : 'Ksquare Studio',
      role: 'superadmin'
    };
    localStorage.setItem('lms_user', JSON.stringify(user));
    return user;
  }

  const docMap = new Map();

  if (identifier.includes('@')) {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(query(usersRef, where('email', '==', identifier)));
      snapshot.docs.forEach(doc => docMap.set(doc.id, doc));
    } catch (error) {
      console.warn("Failed to query users collection by email:", error);
    }
    
    try {
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(query(studentsRef, where('email', '==', identifier)));
      snapshot.docs.forEach(doc => docMap.set(doc.id, doc));
    } catch (error) {
      console.warn("Failed to query students collection by email:", error);
    }
  } else {
    // Phone lookup: normalize the input
    const cleanPhone = identifier.replace(/[\s-]/g, '');
    const phoneVariations = [
      cleanPhone,
      `+91${cleanPhone.replace(/^\+?91/, '')}`,
      `91${cleanPhone.replace(/^\+?91/, '')}`
    ];
    
    try {
      const usersRef = collection(db, 'users');
      for (const phone of phoneVariations) {
        const phoneSnap = await getDocs(query(usersRef, where('phoneNumber', '==', phone)));
        const parentPhoneSnap = await getDocs(query(usersRef, where('parentPhone', '==', phone)));
        phoneSnap.docs.forEach(doc => docMap.set(doc.id, doc));
        parentPhoneSnap.docs.forEach(doc => docMap.set(doc.id, doc));
      }
    } catch (error) {
      console.warn("Failed to query users collection by phone:", error);
    }

    try {
      const studentsRef = collection(db, 'students');
      for (const phone of phoneVariations) {
        const phoneSnap = await getDocs(query(studentsRef, where('phoneNumber', '==', phone)));
        const parentPhoneSnap = await getDocs(query(studentsRef, where('parentPhone', '==', phone)));
        const studentPhoneSnap = await getDocs(query(studentsRef, where('studentPhone', '==', phone)));
        phoneSnap.docs.forEach(doc => docMap.set(doc.id, doc));
        parentPhoneSnap.docs.forEach(doc => docMap.set(doc.id, doc));
        studentPhoneSnap.docs.forEach(doc => docMap.set(doc.id, doc));
      }
    } catch (error) {
      console.warn("Failed to query students collection by phone:", error);
    }
  }

  const docs = Array.from(docMap.values());

  if (docs.length === 0) {
    throw new Error('No registered student found with this phone number.');
  }

  if (docs.length > 1) {
    const linkedProfiles = docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const payload = { isPending: true, hasMultipleSiblings: true, linkedProfiles };
    localStorage.setItem('pending_user', JSON.stringify(payload));
    return payload;
  }

  const userData = { id: docs[0].id, ...docs[0].data() };
  const payload = { ...userData, isPending: true, hasMultipleSiblings: false };
  localStorage.setItem('pending_user', JSON.stringify(payload));
  return payload;
};

export const initiateGoogleLogin = () => {
  const provider = new GoogleAuthProvider();
  signInWithRedirect(auth, provider);
};

export const handleGoogleRedirectResult = async () => {
  const result = await getRedirectResult(auth);
  if (!result) return null;

  const email = result.user.email;

  await logTransaction('GOOGLE_LOGIN_REDIRECT', {
    email: email,
    identityAuditToken: '[Aadhaar Redacted]',
    actionContext: 'Full-Page Auth Redirect Flow'
  });

  const superAdmins = ['santhanabharaths@gmail.com', 'ksquarestudio2025@gmail.com'];
  if (superAdmins.includes(email)) {
    const user = {
      id: 'superadmin_id',
      email: email,
      name: email === 'santhanabharaths@gmail.com' ? 'Santhanabharath' : 'Ksquare Studio',
      role: 'superadmin'
    };
    localStorage.setItem('lms_user', JSON.stringify(user));
    return user;
  }

  // Find user by email
  const q = query(
    collection(db, 'users'),
    where('email', '==', email)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Unauthorized Email');
  }

  const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  localStorage.setItem('pending_user', JSON.stringify(userData));
  return { ...userData, isPending: true };
};

// Verification functions
export const verifyUniqueCode = async (code, enrollmentNo = null) => {
  const pendingUserStr = localStorage.getItem('pending_user');
  if (!pendingUserStr) {
    throw new Error('Session expired. Please sign in again.');
  }

  const pendingUser = JSON.parse(pendingUserStr);
  let targetUser = pendingUser;

  if (pendingUser.hasMultipleSiblings) {
    if (!enrollmentNo) {
      throw new Error('Enrollment number is required to identify the specific student.');
    }
    const matched = pendingUser.linkedProfiles.find(p => String(p.enrollmentNo).toLowerCase() === String(enrollmentNo).toLowerCase() || p.id === enrollmentNo);
    if (!matched) {
      throw new Error('Invalid Enrollment Number. Could not find a matching student profile.');
    }
    targetUser = matched;
  }

  // Query the organizations collection to verify the Organization Access ID
  const q = query(
    collection(db, 'organizations'),
    where('accessId', '==', code)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Invalid Organization Access ID.');
  }

  const orgData = snapshot.docs[0].data();
  if (orgData.status === 'suspended') {
    localStorage.removeItem('pending_user');
    throw new Error('Your organization access has been suspended. Please contact SuperAdmin.');
  }

  if (targetUser.organizationAccessId && targetUser.organizationAccessId !== code) {
    throw new Error('This Access ID does not belong to your organization.');
  }

  localStorage.setItem('lms_user', JSON.stringify(targetUser));
  // localStorage.removeItem('pending_user'); // Keep this to avoid race conditions with VerifyCode.jsx remounting/re-rendering
  return targetUser;
};

export const logoutUser = () => {
  signOut(auth).then(() => {
    localStorage.removeItem('lms_user');
    localStorage.removeItem('pending_user');
    localStorage.removeItem('app-theme');
    window.location.replace('/login');
  }).catch((err) => console.error("Logout Error:", err));
};

export const listenToOrganizationStatus = (organizationId, callback) => {
  if (!organizationId) return () => {};
  const docRef = doc(db, 'organizations', organizationId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.status === 'suspended') {
        callback('suspended');
      }
    }
  });
};

// Super Admin Functions
export const createOrganization = async (name, accessId) => {
  const docRef = await addDoc(collection(db, 'organizations'), {
    name,
    accessId,
    createdAt: serverTimestamp()
  });
  return { id: docRef.id, name, accessId };
};

export const getOrganizations = async () => {
  const snapshot = await getDocs(collection(db, 'organizations'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getOrganizationDetails = async (organizationId) => {
  const docRef = doc(db, 'organizations', organizationId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  throw new Error('Organization not found');
};

export const updateOrganizationLogo = async (organizationId, logoUrl) => {
  const docRef = doc(db, 'organizations', organizationId);
  await updateDoc(docRef, { logoUrl });
};

export const toggleOrganizationStatus = async (organizationId, newStatus) => {
  const docRef = doc(db, 'organizations', organizationId);
  await updateDoc(docRef, { status: newStatus });
};


export const getOrganizationsWithAdmins = async () => {
  const snapshot = await getDocs(collection(db, 'organizations'));
  const orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const orgsWithAdmins = await Promise.all(orgs.map(async (org) => {
    const q = query(
      collection(db, 'users'),
      where('organizationId', '==', org.id),
      where('role', '==', 'admin')
    );
    const adminSnap = await getDocs(q);
    if (!adminSnap.empty) {
      const adminData = adminSnap.docs[0].data();
      return {
        ...org,
        adminName: adminData.name,
        adminEmail: adminData.email,
        adminPhone: adminData.phoneNumber || 'N/A'
      };
    }
    return { ...org, adminName: 'N/A', adminEmail: 'N/A', adminPhone: 'N/A' };
  }));

  return orgsWithAdmins;
};

export const createOrganizationAdmin = async (organizationId, email, name, phoneNumber) => {
  // Verify organization exists
  const orgRef = doc(db, 'organizations', organizationId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) throw new Error('Organization not found');

  const orgData = orgSnap.data();

  // Check if user exists
  const existingUserQ = query(collection(db, 'users'), where('email', '==', email));
  const existingUserSnap = await getDocs(existingUserQ);
  if (!existingUserSnap.empty) throw new Error('User with this email already exists');

  const organizationAccessId = orgData.accessId;
  await addDoc(collection(db, 'users'), {
    email,
    phoneNumber,
    name,
    role: 'admin',
    organizationId,
    organizationName: orgData.name,
    organizationAccessId,
    createdAt: serverTimestamp()
  });

  return { email, organizationAccessId };
};

// Admin Functions
export const createStaff = async (organizationId, organizationName, name, email, organizationAccessId, phoneNumber, age, experience, degree, address, facultyId) => {
  const existingUserQ = query(collection(db, 'users'), where('email', '==', email));
  const existingUserSnap = await getDocs(existingUserQ);
  if (!existingUserSnap.empty) throw new Error('User with this email already exists');

  await addDoc(collection(db, 'users'), {
    email,
    phoneNumber,
    name,
    role: 'staff',
    organizationId,
    organizationName,
    organizationAccessId,
    facultyId: facultyId || '',
    age: age ? parseInt(age, 10) : null,
    experience: experience || '',
    degree: degree || '',
    address: address || '',
    createdAt: serverTimestamp()
  });

  return { email, organizationAccessId };
};

export const getISOWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export const archiveStudentToHierarchy = async (organizationId, studentId, studentData) => {
  const dStr = studentData.dateOfJoining || new Date().toISOString();
  const d = new Date(dStr);
  
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const week = `Week ${getISOWeekNumber(d)}`;
  const day = String(d.getDate()).padStart(2, '0');

  const batch = writeBatch(db);

  const yearRef = doc(db, 'organizations', organizationId, 'admissions', year);
  batch.set(yearRef, { id: year }, { merge: true });

  const monthRef = doc(db, 'organizations', organizationId, 'admissions', year, 'months', month);
  batch.set(monthRef, { id: month, name: d.toLocaleString('default', { month: 'long' }) }, { merge: true });

  const weekRef = doc(db, 'organizations', organizationId, 'admissions', year, 'months', month, 'weeks', week);
  batch.set(weekRef, { id: week }, { merge: true });

  const dayRef = doc(db, 'organizations', organizationId, 'admissions', year, 'months', month, 'weeks', week, 'days', day);
  batch.set(dayRef, { id: day, date: dStr }, { merge: true });

  const studentRef = doc(db, 'organizations', organizationId, 'admissions', year, 'months', month, 'weeks', week, 'days', day, 'student_records', studentId);
  batch.set(studentRef, sanitizePayload(studentData), { merge: true });

  await batch.commit();
};

export const fetchAdmissionsHierarchy = async (organizationId, pathArray) => {
  const usersRef = collection(db, 'users');
  let q = query(usersRef, where('organizationId', '==', organizationId), where('role', '==', 'student'));
  const snap = await getDocs(q);
  let allStudents = snap.docs.map(doc => {
    const data = doc.data();
    if (!data.admissionYear) {
      const dStr = data.dateOfJoining || (data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0] : null);
      if (dStr) {
        const d = new Date(dStr);
        data.admissionYear = String(d.getFullYear());
        data.admissionMonth = String(d.getMonth() + 1).padStart(2, '0');
        data.admissionWeek = `Week ${getISOWeekNumber(d)}`;
        data.admissionDay = String(d.getDate()).padStart(2, '0');
      }
    }
    return { id: doc.id, ...data };
  });

  let students = allStudents;
  if (pathArray.length > 0) students = students.filter(s => s.admissionYear === pathArray[0]);
  if (pathArray.length > 1) students = students.filter(s => s.admissionMonth === pathArray[1]);
  if (pathArray.length > 2) students = students.filter(s => s.admissionWeek === pathArray[2]);
  if (pathArray.length > 3) students = students.filter(s => s.admissionDay === pathArray[3]);

  let folders = [];
  if (pathArray.length === 0) {
    const years = [...new Set(students.map(s => s.admissionYear))].filter(Boolean);
    folders = years.map(y => ({ id: y, name: y, count: students.filter(s => s.admissionYear === y).length })).sort((a, b) => b.id.localeCompare(a.id));
  } else if (pathArray.length === 1) {
    const months = [...new Set(students.map(s => s.admissionMonth))].filter(Boolean);
    const monthNames = { '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May', '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October', '11': 'November', '12': 'December' };
    folders = months.map(m => ({ id: m, name: monthNames[m] || m, count: students.filter(s => s.admissionMonth === m).length })).sort((a, b) => a.id.localeCompare(b.id));
  } else if (pathArray.length === 2) {
    const weeks = [...new Set(students.map(s => s.admissionWeek))].filter(Boolean);
    folders = weeks.map(w => ({ id: w, name: w, count: students.filter(s => s.admissionWeek === w).length })).sort((a, b) => a.id.localeCompare(b.id));
  } else if (pathArray.length === 3) {
    const days = [...new Set(students.map(s => s.admissionDay))].filter(Boolean);
    folders = days.map(d => ({ id: d, name: d, date: new Date(`${pathArray[0]}-${pathArray[1]}-${d}`).toISOString(), count: students.filter(s => s.admissionDay === d).length })).sort((a, b) => a.id.localeCompare(b.id));
  }

  return { folders, students };
};

export const migrateAllStudentsToHierarchy = async (organizationId) => {
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', organizationId),
    where('role', '==', 'student')
  );
  const snap = await getDocs(q);
  const students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  for (const s of students) {
    await archiveStudentToHierarchy(organizationId, s.id, s);
  }
};

export const createStudent = async (organizationId, organizationName, studentData) => {
  const existingUserQ = query(collection(db, 'users'), where('email', '==', studentData.email));
  const existingUserSnap = await getDocs(existingUserQ);
  if (!existingUserSnap.empty) throw new Error('User with this email already exists');

  const dStr = studentData.dateOfJoining || new Date().toISOString();
  const d = new Date(dStr);
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const week = `Week ${getISOWeekNumber(d)}`;
  const day = String(d.getDate()).padStart(2, '0');

  const docRef = await addDoc(collection(db, 'users'), {
    ...studentData,
    role: 'student',
    organizationId,
    organizationName,
    photoUploadCount: 0,
    currentStatus: 'Active',
    admissionYear: year,
    admissionMonth: month,
    admissionWeek: week,
    admissionDay: day,
    statusHistory: [{
      status: 'Active',
      reason: 'Joined the organization',
      timestamp: new Date().toISOString()
    }],
    createdAt: serverTimestamp()
  });

  const finalData = {
    ...studentData,
    role: 'student',
    organizationId,
    organizationName,
    photoUploadCount: 0,
    currentStatus: 'Active',
    admissionYear: year,
    admissionMonth: month,
    admissionWeek: week,
    admissionDay: day,
  };
  await archiveStudentToHierarchy(organizationId, docRef.id, finalData);

  return { id: docRef.id, email: studentData.email, organizationAccessId: studentData.organizationAccessId };
};

export const updateStudentStatus = async (userId, currentHistory, newStatus, reason) => {
  const updatedHistory = [...(currentHistory || []), {
    status: newStatus,
    reason: reason,
    timestamp: new Date().toISOString()
  }];

  await updateDoc(doc(db, 'users', userId), {
    currentStatus: newStatus,
    statusHistory: updatedHistory
  });
};

export const getOrganizationStudents = async (organizationId) => {
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', organizationId),
    where('role', '==', 'student')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToOrganizationStudents = (organizationId, callback) => {
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', organizationId),
    where('role', '==', 'student')
  );
  return onSnapshot(q, (snapshot) => {
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(students);
  });
};

export const getOrganizationStaff = async (organizationId) => {
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', organizationId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => user.role !== 'student' && user.role !== 'admin');
};

export const deleteUserDoc = async (userId) => {
  await deleteDoc(doc(db, 'users', userId));
};

export const updateUserDoc = async (userId, data) => {
  await updateDoc(doc(db, 'users', userId), data);
};

export const deleteOrganizationDoc = async (organizationId) => {
  await deleteDoc(doc(db, 'organizations', organizationId));
};

export const deleteOrganizationAndAdmin = async (organizationId) => {
  // Find admin for this org
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', organizationId),
    where('role', '==', 'admin')
  );
  const adminSnap = await getDocs(q);
  
  // Delete the admin if exists
  if (!adminSnap.empty) {
    const adminId = adminSnap.docs[0].id;
    await deleteDoc(doc(db, 'users', adminId));
  }

  // Delete the org
  await deleteDoc(doc(db, 'organizations', organizationId));
};

export const uploadProfilePhoto = async (userId, file, isStaffOverride = false) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error('User not found');
  const userData = userSnap.data();

  if (!isStaffOverride) {
    const uploadCount = userData.photoUploadCount || 0;
    if (uploadCount >= 2) {
      throw new Error('Maximum photo upload limit reached.');
    }
  }

  const storageRef = ref(storage, `profile_photos/${userId}_${Date.now()}`);
  await uploadBytes(storageRef, file);
  const photoUrl = await getDownloadURL(storageRef);

  await updateDoc(userRef, {
    photoUrl,
    photoUploadCount: isStaffOverride ? (userData.photoUploadCount || 0) : (userData.photoUploadCount || 0) + 1
  });

  return photoUrl;
};

export const uploadCourseContentFile = async (organizationId, file) => {
  const storageRef = ref(storage, `courses/${organizationId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
};

// Course Management Functions
export const createCourse = async (organizationId, courseData) => {
  const docRef = await addDoc(collection(db, 'courses'), {
    ...courseData,
    organizationId,
    createdAt: serverTimestamp()
  });
  return { id: docRef.id, ...courseData, organizationId };
};

export const getOrganizationCourses = async (organizationId) => {
  const q = query(
    collection(db, 'courses'),
    where('organizationId', '==', organizationId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createCourseAssignment = async (organizationId, assignmentData) => {
  const docRef = await addDoc(collection(db, 'course_assignments'), {
    ...assignmentData,
    organizationId,
    createdAt: serverTimestamp()
  });
  return { id: docRef.id, ...assignmentData, organizationId };
};

export const getCourseAssignments = async (organizationId) => {
  const q = query(
    collection(db, 'course_assignments'),
    where('organizationId', '==', organizationId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToStudentSchedules = (studentId, callback) => {
  const q = query(
    collection(db, 'course_assignments'),
    where('enrolledStudentIds', 'array-contains', studentId)
  );
  return onSnapshot(q, (snapshot) => {
    const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(schedules);
  });
};

export const deleteCourseAssignment = async (assignmentId) => {
  await deleteDoc(doc(db, 'course_assignments', assignmentId));
};

export const updateCourseAssignment = async (assignmentId, data) => {
  await updateDoc(doc(db, 'course_assignments', assignmentId), data);
};

export const updateCourse = async (courseId, data) => {
  await updateDoc(doc(db, 'courses', courseId), data);
};

export const deleteCourse = async (courseId) => {
  await deleteDoc(doc(db, 'courses', courseId));
};

export const deleteCourseModule = async (courseId, moduleToRemove, currentModulesString) => {
  const modulesArray = currentModulesString.split(/[\n,]+/).map(m => m.trim()).filter(m => m);
  const updatedModulesArray = modulesArray.filter(m => m !== moduleToRemove);
  const updatedModulesString = updatedModulesArray.join(', ');
  
  await updateDoc(doc(db, 'courses', courseId), {
    modules: updatedModulesString
  });
};

export const getStaffAssignments = async (organizationId, staffId) => {
  const q = query(
    collection(db, 'course_assignments'),
    where('organizationId', '==', organizationId),
    where('staffId', '==', staffId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToStaffAssignments = (organizationId, staffId, callback) => {
  const q = query(
    collection(db, 'course_assignments'),
    where('organizationId', '==', organizationId),
    where('staffId', '==', staffId)
  );
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(assignments);
  });
};

export const getStudentAssignments = async (organizationId, studentId) => {
  const q = query(
    collection(db, 'course_assignments'),
    where('organizationId', '==', organizationId),
    where('studentIds', 'array-contains', studentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToStudentAssignments = (organizationId, studentId, callback) => {
  const q = query(
    collection(db, 'course_assignments'),
    where('organizationId', '==', organizationId),
    where('studentIds', 'array-contains', studentId)
  );
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (callback) callback(assignments);
  });
  return unsubscribe;
};

export const saveAttendanceHistory = async (organizationAccessId, recordData) => {
  const docId = `${recordData.date}_${recordData.batchName}_${recordData.slot}`;
  const docRef = doc(db, 'attendance_history', docId);
  await setDoc(docRef, {
    ...recordData,
    status: recordData.isFinal ? 'finalized' : 'draft',
    organizationID: organizationAccessId,
    timestamp: serverTimestamp()
  }, { merge: true });
  return docId;
};

export const listenToAttendanceHistory = (organizationID, callback) => {
  const q = query(
    collection(db, 'attendance_history'),
    where('organizationID', '==', organizationID)
  );
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const records = [];
    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    callback(records);
  }, (error) => {
    console.error("Error listening to attendance history: ", error);
  });
  return unsubscribe;
};

export const getAttendanceHistoryByFaculty = async (facultyName) => {
  const q = query(
    collection(db, 'attendance_history'),
    where('facultyName', '==', facultyName)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAttendanceHistoryByOrg = async (organizationAccessId) => {
  const q = query(
    collection(db, 'attendance_history'),
    where('organizationID', '==', organizationAccessId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToAttendanceHistoryByOrg = (organizationAccessId, callback) => {
  const q = query(
    collection(db, 'attendance_history'),
    where('organizationID', '==', organizationAccessId)
  );
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(history);
  });
};

// Receipt Management Functions
export const checkDuplicateReceipt = async (billNumber) => {
  const q = query(
    collection(db, 'fee_transactions'),
    where('billNumber', '==', billNumber)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const createReceipt = async (receiptData) => {
  const docRef = await addDoc(collection(db, 'fee_transactions'), {
    ...receiptData,
    timestamp: serverTimestamp()
  });
  return { id: docRef.id, ...receiptData };
};

export const getStudentReceipts = async (studentId) => {
  const q = query(
    collection(db, 'fee_transactions'),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
    // Sort descending by timestamp if available, else date
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });
};

export const subscribeToFeeTransactions = (studentId, callback) => {
  const q = query(
    collection(db, 'fee_transactions'),
    where('studentId', '==', studentId)
  );
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
    callback(transactions);
  });
};

export const subscribeToUserProfile = (userId, callback) => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    }
  });
};

export const getAllFeeTransactions = async () => {
  const q = collection(db, 'fee_transactions');
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });
};

export const updateFacultyNameWithCascade = async (facultyId, oldName, newName, organizationId) => {
  const batch = writeBatch(db);

  // 1. Update Staff Profile (Users collection)
  const staffRef = doc(db, 'users', facultyId);
  batch.update(staffRef, { name: newName });

  // 2. Update Course Assignments
  const assignmentsQ = query(
    collection(db, 'course_assignments'),
    where('facultyId', '==', facultyId),
    where('organizationId', '==', organizationId)
  );
  const assignmentsSnap = await getDocs(assignmentsQ);
  assignmentsSnap.forEach(docSnap => {
    batch.update(docSnap.ref, { facultyName: newName });
  });

  // 3. Update Attendance History
  const attendanceQ = query(
    collection(db, 'attendance_history'),
    where('facultyName', '==', oldName),
    where('organizationID', '==', organizationId)
  );
  const attendanceSnap = await getDocs(attendanceQ);
  attendanceSnap.forEach(docSnap => {
    batch.update(docSnap.ref, { facultyName: newName });
  });

  // 4. Note: Course materials use staffId dynamically joined, and student marks removed the 'uploadedByName' dependency, 
  // so the above queries cover the critical denormalized strings.
  
  await batch.commit();
};

// --- MARKS MANAGEMENT ---
export const addStudentMarks = async (organizationId, studentId, examName, marks, grade, organizationAccessId) => {
  const studentRef = doc(db, 'users', studentId);
  const examRecord = {
    examName,
    marks,
    grade,
    date: new Date().toISOString()
  };
  await firestoreUpdateDoc(studentRef, {
    examHistory: arrayUnion(examRecord)
  });
};

export const getStudentMarks = async (studentId) => {
  const q = query(
    collection(db, 'studentMarks'),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- COURSE MATERIALS ---
export const uploadCourseMaterial = async (organizationId, staffId, file, title, description, assignedStudentIds) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'my_lms_preset');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'rdor42ow'}/raw/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed: ' + (data.error?.message || 'Unknown error'));
  const fileUrl = data.secure_url;

  const materialData = {
    organizationId,
    staffId,
    title,
    description,
    fileName: file.name,
    fileUrl,
    assignedStudentIds,
    viewedBy: [], // Array of studentIds who have viewed
    timestamp: serverTimestamp()
  };

  const docRef = await firestoreAddDoc(collection(db, 'course_materials'), materialData);
  return { id: docRef.id, ...materialData };
};

export const getCourseMaterialsForStaff = async (staffId) => {
  const q = query(collection(db, 'course_materials'), where('staffId', '==', staffId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.timestamp - a.timestamp);
};

export const getCourseMaterialsForStudent = async (studentId) => {
  const q = query(collection(db, 'course_materials'), where('assignedStudentIds', 'array-contains', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.timestamp - a.timestamp);
};

export const subscribeToStudentCourseMaterials = (studentId, callback) => {
  const q = query(collection(db, 'course_materials'), where('assignedStudentIds', 'array-contains', studentId));
  return onSnapshot(q, (snapshot) => {
    const materials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
    callback(materials);
  });
};

export const deleteCourseMaterial = async (materialId) => {
  await deleteDoc(doc(db, 'course_materials', materialId));
};

export const updateCourseMaterial = async (materialId, updateData) => {
  await updateDoc(doc(db, 'course_materials', materialId), updateData);
};

export const markMaterialAsViewed = async (materialId, student) => {
  const materialRef = doc(db, 'course_materials', materialId);
  await firestoreUpdateDoc(materialRef, {
    viewedBy: arrayUnion({
      studentId: student.id,
      studentName: student.name,
      viewedAt: new Date().toISOString()
    })
  });
};

// --- ENHANCED MARKS ---
export const addDynamicStudentMarks = async (studentId, examData) => {
  // examData format: { testName, testDate, subjects: [{name, maxMarks, obtained}], totalMax, totalObtained, percentage, grade }
  const studentRef = doc(db, 'users', studentId);
  await firestoreUpdateDoc(studentRef, {
    examHistory: arrayUnion(examData)
  });
};

// --- CERTIFICATES ---
export const generateCertificate = async (organizationId, studentId, certificateData) => {
  const certData = {
    organizationId,
    studentId,
    ...certificateData,
    timestamp: serverTimestamp()
  };
  const docRef = await firestoreAddDoc(collection(db, 'certificates'), certData);
  return { id: docRef.id, ...certData };
};

export const getOrganizationCertificates = async (organizationId) => {
  const q = query(collection(db, 'certificates'), where('organizationId', '==', organizationId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.timestamp - a.timestamp);
};

export const getStudentCertificates = async (studentId) => {
  const q = query(collection(db, 'certificates'), where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.timestamp - a.timestamp);
};

// --- ADMIN SETTINGS ---
export const updateAdminSettings = async (organizationId, settings) => {
  const orgRef = doc(db, 'organizations', organizationId);
  await firestoreUpdateDoc(orgRef, { settings });
};

// --- MANAGE FACULTY ENHANCEMENTS ---
export const reassignFaculty = async (organizationId, oldStaffId, newStaffId) => {
  const q = query(
    collection(db, 'course_assignments'),
    where('organizationId', '==', organizationId),
    where('staffId', '==', oldStaffId)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.docs.forEach((assignmentDoc) => {
    batch.update(doc(db, 'course_assignments', assignmentDoc.id), {
      staffId: newStaffId
    });
  });

  await batch.commit();
};

export const setSubstituteFaculty = async (organizationId, oldStaffId, substituteStaffId, dateStr) => {
  const subData = {
    organizationId,
    originalStaffId: oldStaffId,
    substituteStaffId,
    date: dateStr,
    timestamp: serverTimestamp()
  };
  await firestoreAddDoc(collection(db, 'faculty_substitutes'), subData);
};
