import Dexie, { type Table } from 'dexie';

export interface User {
  id?: number;
  journalName: string;
  passwordHash: string;
  securityQuestion: string;
  answerHash: string;
  createdAt: string;
}

export interface JournalEntry {
  id?: number;
  userId: number;
  title: string;
  content: string; 
  emotion: string;
  weather: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id?: number;
  userId: number;
  action: string;
  timestamp: string;
}

class PedExpressDatabase extends Dexie {
  users!: Table<User>;
  entries!: Table<JournalEntry>;
  activityLogs!: Table<ActivityLog>;

  constructor() {
    super('PedExpressDB');
    
    this.version(1).stores({
      users: '++id, journalName',
      entries: '++id, userId, title, createdAt',
      activityLogs: '++id, userId, timestamp',
    });
  }
}

export const db = new PedExpressDatabase();