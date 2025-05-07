import React, { useState } from 'react';
import axios from 'axios';

function Login() {
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
      alert(err.response.data.message);
    }
  };
  

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      {/* <button onClick={() => window.location.href = '/signup'}>Go to Signup</button> */}

    </div>
  );
}

export default Login;
