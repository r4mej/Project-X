import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    console.warn(`Failed login for non-existent user: ${username}`);
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  if (user.password !== password) {
    user.loginAttempts.push({
      success: false,
      reason: 'Incorrect password',
      timestamp: new Date()
    });
    await user.save();
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  user.loginAttempts.push({
    success: true,
    reason: 'Login successful',
    timestamp: new Date()
  });
  await user.save();

  res.status(200).json({ message: 'Login successful', role: user.role });
});

router.get('/hello', (req, res) => {
  res.send('Hello World from server!');
});

router.post('/signup', async (req, res) => {
    const { username, password, role, studentInfo, instructorInfo } = req.body;
  
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already exists' });
  
    const newUser = new User({ username, password, role });
  
    if (role === 'student') newUser.studentInfo = studentInfo;
    if (role === 'instructor') newUser.instructorInfo = instructorInfo;
  
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  });
  
export default router;
