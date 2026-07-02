import { db, auth, storage } from './config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const identifyUser = async (identifier) => {
  if (identifier === 'santhanabharaths@gmail.com') {
    const user = {
      id: 'superadmin_id',
      email: 'santhanabharaths@gmail.com',
      name: 'Santhanabharath',
      role: 'superadmin'
    };
    localStorage.setItem('lms_user', JSON.stringify(user));
    return user;
  }

  let snapshot;
  const usersRef = collection(db, 'users');

  if (identifier.includes('@')) {
    snapshot = await getDocs(query(usersRef, where('email', '==', identifier)));
  } else {
    // Phone lookup
    snapshot = await getDocs(query(usersRef, where('phoneNumber', '==', identifier)));
  }

  if (snapshot.empty) {
    throw new Error('Unauthorized User');
  }

  const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  localStorage.setItem('pending_user', JSON.stringify(userData));
  return { ...userData, isPending: true };
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const email = result.user.email;

  if (email === 'santhanabharaths@gmail.com') {
    const user = {
      id: 'superadmin_id',
      email: 'santhanabharaths@gmail.com',
      name: 'Super Admin',
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
export const verifyUniqueCode = async (code) => {
  const pendingUserStr = localStorage.getItem('pending_user');
  if (!pendingUserStr) {
    throw new Error('Session expired. Please sign in again.');
  }

  const pendingUser = JSON.parse(pendingUserStr);

  // Query the organizations collection to verify the Organization Access ID
  const q = query(
    collection(db, 'organizations'),
    where('accessId', '==', code)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Invalid Organization Access ID.');
  }

  if (pendingUser.organizationAccessId && pendingUser.organizationAccessId !== code) {
    throw new Error('This Access ID does not belong to your organization.');
  }

  localStorage.setItem('lms_user', JSON.stringify(pendingUser));
  localStorage.removeItem('pending_user');
  return pendingUser;
};

export const logoutUser = () => {
  localStorage.removeItem('lms_user');
  window.location.href = '/login';
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
export const createStaff = async (organizationId, organizationName, name, email, organizationAccessId, phoneNumber) => {
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
    createdAt: serverTimestamp()
  });

  return { email, organizationAccessId };
};

export const createStudent = async (organizationId, organizationName, studentData) => {
  const existingUserQ = query(collection(db, 'users'), where('email', '==', studentData.email));
  const existingUserSnap = await getDocs(existingUserQ);
  if (!existingUserSnap.empty) throw new Error('User with this email already exists');

  const docRef = await addDoc(collection(db, 'users'), {
    ...studentData,
    role: 'student',
    organizationId,
    organizationName,
    photoUploadCount: 0,
    createdAt: serverTimestamp()
  });

  return { id: docRef.id, email: studentData.email, organizationAccessId: studentData.organizationAccessId };
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

export const getOrganizationStaff = async (organizationId) => {
  const q = query(
    collection(db, 'users'),
    where('organizationId', '==', organizationId),
    where('role', '==', 'staff')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

export const deleteCourseAssignment = async (assignmentId) => {
  await deleteDoc(doc(db, 'course_assignments', assignmentId));
};

export const updateCourseAssignment = async (assignmentId, data) => {
  await updateDoc(doc(db, 'course_assignments', assignmentId), data);
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
  return onSnapshot(q, (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(assignments);
  });
};

export const saveAttendanceHistory = async (organizationAccessId, recordData) => {
  const docId = `${recordData.batchName}_${recordData.date}`;
  const docRef = doc(db, 'attendance_history', docId);
  await setDoc(docRef, {
    ...recordData,
    organizationID: organizationAccessId,
    timestamp: serverTimestamp()
  }, { merge: true });
  return docId;
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

