import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MissionPlannerPage } from './pages/MissionPlannerPage';
import { FleetManagementPage } from './pages/FleetManagementPage';
import { VideoWallPage } from './pages/VideoWallPage';
import { LayoutDashboard, Compass, Layers, Tv, LogOut, Plane } from 'lucide-react';

const queryClient = new QueryClient();

const NavigationShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { label: 'COCKPIT', path: '/', icon: LayoutDashboard },
    { label: 'MISSIONS', path: '/missions', icon: Compass },
    { label: 'FLEET', path: '/fleet', icon: Layers },
    { label: 'VIDEO WALL', path: '/video', icon: Tv },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-tactical-dark">
      {/* Tactical Left Nav */}
      <div className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 z-30 select-none">
        <div className="w-10 h-10 bg-cyan-950 border border-cyan-500/50 rounded-xl flex items-center justify-center mb-6">
          <Plane className="w-6 h-6 text-cyan-400 -rotate-45" />
        </div>

        <nav className="flex-1 flex flex-col space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          title="Sign Out"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-900 transition"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <NavigationShell>{children}</NavigationShell>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/missions"
            element={
              <ProtectedRoute>
                <MissionPlannerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fleet"
            element={
              <ProtectedRoute>
                <FleetManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video"
            element={
              <ProtectedRoute>
                <VideoWallPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
