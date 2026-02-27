import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetails = lazy(() => import('./pages/StudentDetails'));
const Coaches = lazy(() => import('./pages/Coaches'));
const CoachDetails = lazy(() => import('./pages/CoachDetails'));
const Finance = lazy(() => import('./pages/Finance'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Settings = lazy(() => import('./pages/Settings'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Login = lazy(() => import('./pages/EpicLogin'));

const Register = lazy(() => import('./pages/Register'));
const PublicRegistration = lazy(() => import('./pages/PublicRegistration'));
const AdminCameras = lazy(() => import('./pages/AdminCameras'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const PersonalDashboard = lazy(() => import('./pages/PersonalDashboard'));
const StudentAttendance = lazy(() => import('./pages/StudentAttendance'));
const StaffAttendance = lazy(() => import('./pages/StaffAttendance'));
const PTAttendance = lazy(() => import('./pages/PTAttendance'));
const Evaluations = lazy(() => import('./pages/Evaluations'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

import { initializeTheme } from './utils/theme';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import NotificationSoundHandler from './components/NotificationSoundHandler';

import BackButtonHandler from './components/BackButtonHandler';

// Premium Loading Fallback
const PageLoader = ({ name }: { name?: string }) => {
  const [displayName, setDisplayName] = useState(name);

  useEffect(() => {
    // Priority: 
    // 1. Explicit name (if not default)
    // 2. localStorage
    // 3. Fallback to default

    const saved = localStorage.getItem('gym_settings');
    let localName = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.academy_name) localName = parsed.academy_name;
      } catch (e) { }
    }

    if (name && name !== 'Academy System') {
      setDisplayName(name);
    } else if (localName) {
      setDisplayName(localName);
    } else {
      setDisplayName(name || 'Academy System');
    }
  }, [name]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
      </div>
      <div className="text-white/40 font-black tracking-[0.5em] text-xs uppercase animate-pulse">
        {displayName && displayName !== 'Academy System' ? displayName : ''}
      </div>
    </div>
  );
};

function AppContent() {
  console.log('App: Rendering component');
  const { i18n } = useTranslation();
  const { settings } = useTheme();

  useEffect(() => {
    if (i18n) {
      document.dir = i18n.dir();
      document.documentElement.lang = i18n.language;
    }
  }, [i18n, i18n?.language]);

  return (
    <BrowserRouter>
      <NotificationSoundHandler />
      <BackButtonHandler />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          className: 'premium-toast-vibrant',
          style: {
            color: '#fff',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 'fit-content',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Suspense fallback={<PageLoader name={settings?.academy_name} />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/registration" element={<PublicRegistration />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentDetails />} />
              <Route path="coaches" element={<Coaches />} />
              <Route path="coaches/:id" element={<CoachDetails />} />
              <Route path="finance" element={<Finance />} />
              <Route path="calculator" element={<Calculator />} />

              <Route path="schedule" element={<Schedule />} />
              <Route path="settings" element={<Settings />} />
              <Route path="my-work" element={<PersonalDashboard />} />
              <Route path="admin/cameras" element={<AdminCameras />} />

              {/* Attendance Pages */}
              <Route path="attendance/students" element={<StudentAttendance />} />
              <Route path="attendance/staff" element={<StaffAttendance />} />
              <Route path="attendance/pt" element={<PTAttendance />} />
              <Route path="evaluations" element={<Evaluations />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <CurrencyProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </CurrencyProvider>
  )
}

export default App;
