import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function InstructorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmLogout = window.confirm('Are you sure you want to log out?');
    if (confirmLogout) {
      localStorage.removeItem('username');
      navigate('/');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'qr':
        return <h2>Make Class QR Code</h2>;
      case 'reports':
        return <h2>Class Attendance Reports</h2>;
      case 'courses':
        return <h2>Your Registered Courses</h2>;
      case 'devices':
        return <h2>Manage Devices</h2>;
      default:
        return <h2>Welcome to the Instructor Dashboard</h2>;
    }
  };

  return (
    <div className="dashboard-layout">
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <button 
          className="toggle-button" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
        {sidebarOpen && (
          <>
            <h3>Instructor Menu</h3>
            <ul>
              <li onClick={() => setActiveView('qr')}>📷 Make QR Code</li>
              <li onClick={() => setActiveView('reports')}>📊 Reports</li>
              <li onClick={() => setActiveView('courses')}>📌 Courses</li>
              <li onClick={() => setActiveView('devices')}>📱 Devices</li>
            </ul>
          </>
        )}
      </div>

      <div className={`dashboard-main ${sidebarOpen ? 'with-sidebar' : 'full-width'}`}>
        {renderContent()}
        <button onClick={handleLogout} className="dashboard-button logout">Log Out</button>
      </div>
    </div>
  );
}

export default InstructorDashboard;
