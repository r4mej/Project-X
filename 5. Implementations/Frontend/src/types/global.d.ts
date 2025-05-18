interface Schedule {
  days: string[];
  startTime: string;
  endTime: string;
  startPeriod: 'AM' | 'PM';
  endPeriod: 'AM' | 'PM';
}

interface Class {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection?: string;
  room: string;
  schedules: Schedule[];
}

declare global {
  interface Window {
    todayClasses: Class[];
  }
}

export { };
 