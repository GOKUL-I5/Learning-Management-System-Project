import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userStr = localStorage.getItem('lms_user');
  
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    const role = (user.role || 'staff').toLowerCase().trim();
    const normalizedAllowedRoles = allowedRoles ? allowedRoles.map(r => (r || '').toLowerCase().trim()) : null;
    
    const isAllowed = normalizedAllowedRoles 
      ? normalizedAllowedRoles.some(allowedRole => role === allowedRole || role.includes(allowedRole))
      : true;
    
    if (!isAllowed) {
      // Redirect to their respective dashboard if they try to access an unauthorized route
      if (role === 'superadmin') return <Navigate to="/admin-dashboard" replace />;
      if (role === 'admin') return <Navigate to="/admin" replace />;
      if (role.includes('staff') || role.includes('faculty')) return <Navigate to="/staff" replace />;
      if (role.includes('student')) return <Navigate to="/student" replace />;
      return <Navigate to="/access-denied" replace />;
    }
    
    return children;
  } catch (error) {
    localStorage.removeItem('lms_user');
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
