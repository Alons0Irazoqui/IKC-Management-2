
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AcademyProvider } from './context/AcademyContext';
import { FinanceProvider } from './context/FinanceContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import RoleSelection from './pages/auth/RoleSelection';
import StudentRegistration from './pages/auth/StudentRegistration';
import MasterRegistration from './pages/auth/MasterRegistration';
import MasterPinEntry from './pages/auth/MasterPinEntry';

// Public Pages
import TermsAndConditions from './pages/TermsAndConditions';

// Master Pages
import MasterDashboard from './pages/master/MasterDashboard';
import StudentsList from './pages/master/StudentsList';
import ClassesManager from './pages/master/ClassesManager';
import MasterAttendanceDetail from './pages/master/MasterAttendanceDetail';
import MasterEventDetail from './pages/master/MasterEventDetail'; 
import MasterLibrary from './pages/master/MasterLibrary';
import Finance from './pages/master/Finance';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentClassDetail from './pages/student/StudentClassDetail';
import StudentSchedule from './pages/student/StudentSchedule';
import StudentPayments from './pages/student/StudentPayments';
import Library from './pages/student/Library';

// Shared
import Settings from './pages/shared/Settings';
import Forbidden from './pages/Forbidden';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
        <ToastProvider>
        <AuthProvider>
            <AcademyProvider>
            <FinanceProvider>
                <ConfirmationProvider>
                <Router>
                    <Routes>
                    {/* --- RUTAS PÚBLICAS --- */}
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Login />} />
                    
                    <Route path="/role-selection" element={<RoleSelection />} />
                    <Route path="/register/verify-pin" element={<MasterPinEntry />} />
                    <Route path="/register/student" element={<StudentRegistration />} />
                    <Route path="/register/master" element={<MasterRegistration />} />
                    
                    {/* Ruta de Términos y Condiciones (Pública) */}
                    <Route path="/terms" element={<TermsAndConditions />} />

                    <Route path="/403" element={<Forbidden />} />
                    
                    {/* --- RUTAS PROTEGIDAS MAESTRO --- */}
                    <Route path="/master/*" element={
                        <ProtectedRoute allowedRoles={['master']}>
                            <DashboardLayout>
                                <Routes>
                                    <Route path="dashboard" element={<MasterDashboard />} />
                                    <Route path="students" element={<StudentsList />} />
                                    <Route path="schedule" element={<ClassesManager />} />
                                    <Route path="attendance/:classId" element={<MasterAttendanceDetail />} />
                                    <Route path="event/:eventId" element={<MasterEventDetail />} /> 
                                    <Route path="library" element={<MasterLibrary />} />
                                    <Route path="finance" element={<Finance />} />
                                    <Route path="settings" element={<Settings />} />
                                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                                </Routes>
                            </DashboardLayout>
                        </ProtectedRoute>
                    } />

                    {/* --- RUTAS PROTEGIDAS ALUMNO --- */}
                    <Route path="/student/*" element={
                        <ProtectedRoute allowedRoles={['student']}>
                            <DashboardLayout>
                                <Routes>
                                    <Route path="dashboard" element={<StudentDashboard />} />
                                    <Route path="classes" element={<StudentClasses />} />
                                    <Route path="classes/:classId" element={<StudentClassDetail />} />
                                    <Route path="schedule" element={<StudentSchedule />} />
                                    <Route path="library" element={<Library />} />
                                    <Route path="payments" element={<StudentPayments />} />
                                    <Route path="settings" element={<Settings />} />
                                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                                </Routes>
                            </DashboardLayout>
                        </ProtectedRoute>
                    } />
                    </Routes>
                </Router>
                </ConfirmationProvider>
            </FinanceProvider>
            </AcademyProvider>
        </AuthProvider>
        </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
