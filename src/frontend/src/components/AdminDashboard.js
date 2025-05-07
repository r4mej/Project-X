import React from 'react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
     const navigate = useNavigate();
  return (
    <div>
      <h2>Admin Dashboard</h2>
      <ul>
        <li>📋 View all users (students & instructors)</li>
        <li>➕ Register/remove users</li>
        <button onClick={() => navigate('/signup')} className="landing-button signup">
          Register Users
        </button>
        <li>🔒 Manage instructor devices</li>
        <li>📁 View login logs</li>
        <li>🔐 Control encryption & access policies</li>
      </ul>
    </div>
  );
}

export default AdminDashboard;
