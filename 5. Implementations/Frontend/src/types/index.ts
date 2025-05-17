export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  userId: string;
} 