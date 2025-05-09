import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function StudentDashboard() {
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
      case 'profile':
        return <h2>Personal Profile</h2>;
      case 'history':
        return <h2>Attendance History</h2>;
      case 'upload':
        return <h2>Upload Attendance</h2>;
      case 'update':
        return <h2>Update Profile</h2>;
      default:
        return <h2>Welcome to the Student Dashboard</h2>;
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
            <h3>Student Menu</h3>
            <ul>
              <li onClick={() => setActiveView('profile')}>👤 Profile</li>
              <li onClick={() => setActiveView('history')}>📅 Attendance History</li>
              <li onClick={() => setActiveView('upload')}>📷 Upload Attendance</li>
              <li onClick={() => setActiveView('update')}>📝 Update Profile</li>
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

export default StudentDashboard;
