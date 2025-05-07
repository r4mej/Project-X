import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [program, setProgram] = useState('');
  const [faculty, setFaculty] = useState('');

  const [instructorName, setInstructorName] = useState('');
  const [courses, setCourses] = useState('');

  const handleSignup = async () => {
    try {
      let body = { username, password, role };

      if (role === 'student') {
        body.studentInfo = { fullName, studentId, yearLevel, program, faculty };
      }

      if (role === 'instructor') {
        body.instructorInfo = {
          fullName: instructorName,
          courses: courses.split(',').map(c => c.trim())
        };
      }

      await axios.post('http://localhost:5000/api/auth/signup', body);
      alert('Signup successful!');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || 'Signup failed!');
    }
  };

  return (
    <div>
      <h2>Signup</h2>
      <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
      
      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="student">Student</option>
        <option value="instructor">Instructor</option>
        <option value="admin">Admin</option>
      </select>

      {role === 'student' && (
        <>
          <input placeholder="Full Name" onChange={e => setFullName(e.target.value)} />
          <input placeholder="Student ID" onChange={e => setStudentId(e.target.value)} />
          <input placeholder="Year Level" onChange={e => setYearLevel(e.target.value)} />
          <input placeholder="Program" onChange={e => setProgram(e.target.value)} />
          <input placeholder="Faculty" onChange={e => setFaculty(e.target.value)} />
        </>
      )}

      {role === 'instructor' && (
        <>
          <input placeholder="Full Name" onChange={e => setInstructorName(e.target.value)} />
          <input placeholder="Courses (comma-separated)" onChange={e => setCourses(e.target.value)} />
        </>
      )}

      <button onClick={handleSignup}>Sign Up</button>
      <button onClick={() => navigate('/login')}>Go to Login</button>
    </div>
  );
}

export default Signup;
