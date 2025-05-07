import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LandingPage.css'; 

function LandingPageWithLogin() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username, password
      });
      alert(res.data.message);
      const role = res.data.role;

      if (role === 'admin') window.location.href = '/admin-dashboard';
      else if (role === 'student') window.location.href = '/student-dashboard';
      else if (role === 'instructor') window.location.href = '/instructor-dashboard';
    } catch (err) {
        alert(err.response?.data?.message || 'Login failed');

    }
  };

  return (
    <div className="landing-container">
      <h1 className="landing-title">Welcome to the Attendance Tracker</h1>
      <p className="landing-subtitle">Login to get started</p>
      <div className="landing-buttons">
        <button onClick={() => setShowLogin(!showLogin)} className="landing-button login">
          {showLogin ? 'Close Login' : 'Login'}
        </button>
        {/* <button onClick={() => navigate('/signup')} className="landing-button signup">
          Sign Up
        </button> */}
      </div>

      <div className={`login-form ${showLogin ? 'visible' : ''}`}>
        <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}

export default LandingPageWithLogin;
