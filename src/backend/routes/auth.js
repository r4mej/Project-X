import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    await User.create({
      username,
      loginAttempts: [{ success: false, reason: 'User not found' }]
    });
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  if (user.password !== password) {
    user.loginAttempts.push({ success: false, reason: 'Incorrect password' });
    await user.save();
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  user.loginAttempts.push({ success: true, reason: 'Login successful' });
  await user.save();

  res.status(200).json({ message: 'Login successful' });
});

router.get('/hello', (req, res) => {
  res.send('Hello World from server!');
});

export default router;
