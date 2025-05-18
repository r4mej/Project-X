import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Log from '../models/Log';
import User from '../models/User';

// Helper function to format time in 12-hour format
const formatTime12Hour = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Create a new login session
export const createLoginLog = async (userId: string, req: Request) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const sessionId = uuidv4();
    const now = new Date();

    const log = await Log.create({
      userId,
      username: user.username,
      role: user.role,
      sessionId,
      action: 'LOGIN',
      timestamp: now,
      ipAddress: req.ip,
      deviceInfo: req.get('user-agent'),
      sessionData: {
        loginTime: now,
        status: 'active'
      }
    });

    return log;
  } catch (error) {
    console.error('Error creating login log:', error);
    throw error;
  }
};

// Create a logout log and update the corresponding login session
export const createLogoutLog = async (userId: string, req: Request) => {
  try {
    console.log('Starting logout process for user:', userId);
    
    const user = await User.findById(userId);
    if (!user) {
      console.warn('User not found during logout:', userId);
      throw new Error('User not found');
    }
    console.log('User found:', user.username);

    // Find the active session for this user
    const activeSession = await Log.findOne({
      userId,
      action: 'LOGIN',
      'sessionData.status': 'active'
    }).sort({ timestamp: -1 });

    console.log('Active session found:', activeSession ? 'Yes' : 'No');

    if (!activeSession) {
      console.log('Creating standalone logout log');
      try {
        // Create a standalone logout log without session data
        const logoutLog = await Log.create({
          userId,
          username: user.username,
          role: user.role,
          sessionId: uuidv4(), // Generate new session ID
          action: 'LOGOUT',
          timestamp: new Date(),
          ipAddress: req.ip || 'unknown',
          deviceInfo: req.get('user-agent') || 'unknown',
          sessionData: {
            logoutTime: new Date(),
            status: 'completed'
          }
        });
        console.log('Standalone logout log created successfully');
        return logoutLog;
      } catch (createError) {
        console.error('Error creating standalone logout log:', {
          error: createError,
          userData: {
            userId,
            username: user.username,
            role: user.role
          }
        });
        throw createError;
      }
    }

    console.log('Creating logout log for existing session');
    const now = new Date();
    const duration = now.getTime() - (activeSession.sessionData.loginTime?.getTime() || now.getTime());

    try {
      // Create logout log
      const logoutLog = await Log.create({
        userId,
        username: user.username,
        role: user.role,
        sessionId: activeSession.sessionId,
        action: 'LOGOUT',
        timestamp: now,
        ipAddress: req.ip || 'unknown',
        deviceInfo: req.get('user-agent') || 'unknown',
        sessionData: {
          loginTime: activeSession.sessionData.loginTime,
          logoutTime: now,
          duration,
          status: 'completed'
        }
      });

      // Update the login log with session completion data
      await Log.findByIdAndUpdate(activeSession._id, {
        'sessionData.logoutTime': now,
        'sessionData.duration': duration,
        'sessionData.status': 'completed'
      });

      console.log('Logout log created and session updated successfully');
      return logoutLog;
    } catch (createError) {
      console.error('Error creating logout log or updating session:', {
        error: createError,
        sessionData: {
          userId,
          username: user.username,
          sessionId: activeSession.sessionId
        }
      });
      throw createError;
    }
  } catch (error) {
    console.error('Error in createLogoutLog:', {
      error,
      userId,
      requestInfo: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    throw error;
  }
};

// Get all user activity logs
export const getUserActivityLogs = async () => {
  try {
    const logs = await Log.aggregate([
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$sessionId',
          userId: { $first: '$userId' },
          username: { $first: '$username' },
          role: { $first: '$role' },
          loginTime: { $first: '$sessionData.loginTime' },
          logoutTime: { $first: '$sessionData.logoutTime' },
          duration: { $first: '$sessionData.duration' },
          status: { $first: '$sessionData.status' },
          deviceInfo: { $first: '$deviceInfo' },
          ipAddress: { $first: '$ipAddress' }
        }
      },
      {
        $sort: { loginTime: -1 }
      }
    ]);

    return logs;
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    throw error;
  }
};

// Get login history for a specific user
export const getUserLoginHistory = async (userId: string) => {
  try {
    const logs = await Log.find({ userId })
      .sort({ 'sessionData.loginTime': -1 });

    const sessions = logs.reduce((acc: any[], log) => {
      const existingSession = acc.find(s => s.sessionId === log.sessionId);
      
      if (!existingSession) {
        acc.push({
          sessionId: log.sessionId,
          username: log.username,
          role: log.role,
          loginTime: log.sessionData.loginTime,
          logoutTime: log.sessionData.logoutTime,
          duration: log.sessionData.duration,
          status: log.sessionData.status,
          deviceInfo: log.deviceInfo,
          ipAddress: log.ipAddress
        });
      }
      
      return acc;
    }, []);

    return sessions;
  } catch (error) {
    console.error('Error fetching user login history:', error);
    throw error;
  }
};

// Clean up stale sessions (e.g., when server crashed or session wasn't properly closed)
export const cleanupStaleSessions = async () => {
  const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    const staleSessions = await Log.find({
      'sessionData.status': 'active',
      'sessionData.loginTime': { $lt: staleThreshold }
    });

    for (const session of staleSessions) {
      const now = new Date();
      const duration = now.getTime() - session.sessionData.loginTime!.getTime();

      await Log.findByIdAndUpdate(session._id, {
        'sessionData.logoutTime': now,
        'sessionData.duration': duration,
        'sessionData.status': 'terminated'
      });
    }
  } catch (error) {
    console.error('Error cleaning up stale sessions:', error);
  }
};

// Clear all logs
export const clearLogs = async () => {
  try {
    await Log.deleteMany({});
    return { message: 'All logs cleared successfully' };
  } catch (error) {
    console.error('Error clearing logs:', error);
    throw error;
  }
}; 