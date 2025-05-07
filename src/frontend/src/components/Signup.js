import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
;
  const [studentId, setStudentId] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [program, setProgram] = useState('');
  const [faculty, setFaculty] = useState('');

  const [IfirstName, setIFirstName] = useState('');
  const [ImiddleName, setIMiddleName] = useState('');
  const [IlastName, setILastName] = useState('');
  const [courses, setCourses] = useState('');

  const handleSignup = async () => {
    try {
      let body = { username, password, role };

      if (role === 'student') {
        body.studentInfo = { firstName, middleName, lastName, studentId, yearLevel, program, faculty };
      }

      if (role === 'instructor') {
        body.instructorInfo = {
          IfirstName, ImiddleName, IlastName,
          courses: courses.split(',').map(c => c.trim())
        };
      }

      await axios.post('http://localhost:5000/api/auth/signup', body);
      alert('Signup successful!');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Signup failed!');
    }
  };

  return (
    <div>
      <h2>Register User</h2>
      <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
      
      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="student">Student</option>
        <option value="instructor">Instructor</option>
        <option value="admin">Admin</option>
      </select>

      {role === 'student' && (
        <>
          <input placeholder="First Name" onChange={e => setFirstName(e.target.value)} />
          <input placeholder="Middle Name" onChange={e => setMiddleName(e.target.value)} />
          <input placeholder="Last Name" onChange={e => setLastName(e.target.value)} />
          <input placeholder="Student ID" onChange={e => setStudentId(e.target.value)} />
          <input placeholder="Year Level" onChange={e => setYearLevel(e.target.value)} />
          <input placeholder="Program" onChange={e => setProgram(e.target.value)} />
          <input placeholder="Faculty" onChange={e => setFaculty(e.target.value)} />
        </>
      )}

      {role === 'instructor' && (
        <>
          <input placeholder="First Name" onChange={e => setIFirstName(e.target.value)} />
          <input placeholder="Middle Name" onChange={e => setIMiddleName(e.target.value)} />
          <input placeholder="Last Name" onChange={e => setILastName(e.target.value)} />
          <input placeholder="Courses (comma-separated)" onChange={e => setCourses(e.target.value)} />
        </>
      )}

      <button onClick={handleSignup}>Register User</button>
      <button onClick={() => navigate('/admin-dashboard')}>Go Back</button>
    </div>
  );
}

export default Signup;
