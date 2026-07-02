import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userStr = localStorage.getItem('lms_user');
  
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to their respective dashboard if they try to access an unauthorized route
      switch (user.role) {
        case 'superadmin': return <Navigate to="/superadmin" replace />;
        case 'admin': return <Navigate to="/admin" replace />;
        case 'staff': return <Navigate to="/staff" replace />;
        case 'student': return <Navigate to="/student" replace />;
        default: return <Navigate to="/login" replace />;
      }
    }
    
    return children;
  } catch (error) {
    localStorage.removeItem('lms_user');
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
