import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import CalibrationPage from './pages/CalibrationPage';
import ClassroomPage from './pages/ClassroomPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TestingPage from './pages/TestingPage';
import SettingsPage from './pages/SettingsPage';

const pageTitles = {
  '/': 'Dashboard Overview',
  '/calibration': 'Hand & Gesture Calibration',
  '/classroom': 'Interactive Classroom Lesson',
  '/analytics': 'Telemetry & Performance Analytics',
  '/testing': 'Student Calibration A/B Testing',
  '/settings': 'System Settings & Hardware',
};

export default function App() {
  const location = useLocation();
  const [webcamEnabled, setWebcamEnabled] = useState(true);

  const currentTitle = pageTitles[location.pathname] || 'Hands-Free Classroom Controls';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-950 font-sans">
      {/* Collapsible SaaS Sidebar */}
      <Sidebar webcamConnected={webcamEnabled} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Persistent App Header */}
        <Header
          pageTitle={currentTitle}
          webcamActive={webcamEnabled}
          onToggleWebcam={() => setWebcamEnabled(!webcamEnabled)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calibration" element={<CalibrationPage />} />
            <Route path="/classroom" element={<ClassroomPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/testing" element={<TestingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
