export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Student: undefined;
  Instructor: undefined;
  Admin: undefined;
  AttendanceManager: undefined;
  ClassList: {
    classId: string;
    className: string;
    subjectCode: string;
    yearSection: string;
  };
  TakeAttendance: {
    classId: string;
    subjectCode: string;
    yearSection: string;
  };
};

export type UserRole = 'student' | 'instructor' | 'admin';

export type AdminDrawerParamList = {
  Dashboard: undefined;
  ManageUsers: undefined;
  ViewLogs: undefined;
};

export type InstructorDrawerParamList = {
  Dashboard: undefined;
  AttendanceManager: undefined;
  AboutApp: undefined;
  HelpSupport: undefined;
  ClassList: {
    classId: string;
    className: string;
    subjectCode: string;
    yearSection: string;
  };
};

export type StudentDrawerParamList = {
  MainTabs: undefined;
  Dashboard: undefined;
  EditProfile: undefined;
  AttendanceSettings: undefined;
  PrivacySecurity: undefined;
  HelpSupport: undefined;
  AboutApp: undefined;
  Records: undefined;
  QRScanner: undefined;
  Location: undefined;
  History: undefined;
  Schedule: undefined;
};

export type AttendanceNavigationParamList = {
  Home: undefined;
  QRCode: undefined;
  Manual: undefined;
};

export type ClassNavigationParamList = {
  Dashboard: undefined;
  Manage: undefined;
  List: undefined;
};

export type InstructorBottomTabParamList = {
  InstructorDashboard: undefined;
  AttendanceManager: undefined;
  Reports: undefined;
};

export type StudentBottomTabParamList = {
  StudentDashboard: undefined;
  Attendance: undefined;
  Profile: undefined;
}; 