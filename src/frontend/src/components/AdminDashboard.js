import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('home');

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to log out?');
    if (!confirmLogout) return;

    const username = localStorage.getItem('username');
    if (username) {
      try {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
      } catch (error) {
        console.error('Logout failed', error);
      }
    }
    localStorage.removeItem('username');
    navigate('/');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'users':
        return (
          <div>
            <h2>View All Users</h2>
            <p>List of students and instructors goes here.</p>
          </div>
        );
      case 'register':
        return (
          <div>
            <h2>Register/Remove Users</h2>
            <button onClick={() => navigate('/signup')} className="dashboard-button">Register Users</button>
          </div>
        );
      case 'devices':
        return <h2>Manage Instructor Devices</h2>;
      case 'logs':
        return <h2>View Login Logs</h2>;
      case 'reports':
        return <h2>Generate Reports</h2>;
      default:
        return <h2>Welcome to the Admin Dashboard</h2>;
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
            <h3>Admin Menu</h3>
            <ul>
              <li onClick={() => setActiveView('users')}>📋 View all users</li>
              <li onClick={() => setActiveView('register')}>➕ Register/remove users</li>
              <li onClick={() => setActiveView('devices')}>🔒 Manage devices</li>
              <li onClick={() => setActiveView('logs')}>📁 Login logs</li>
              <li onClick={() => setActiveView('reports')}>📄 Generate reports</li>
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

export default AdminDashboard;
