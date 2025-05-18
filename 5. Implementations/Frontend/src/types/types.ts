export interface Schedule {
  days: string[];
  startTime: string;
  endTime: string;
  startPeriod: 'AM' | 'PM';
  endPeriod: 'AM' | 'PM';
}

export interface Class {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection?: string;
  room: string;
  schedules: Schedule[];
} 