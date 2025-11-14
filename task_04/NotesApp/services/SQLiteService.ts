import * as SQLite from 'expo-sqlite';
import { Note } from '../types/Note';

// Используем новый API с openDatabaseSync
const db = SQLite.openDatabaseSync('notes.db');

export class SQLiteService {
  static async initDatabase(): Promise<void> {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          createdAt TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  static async getNotes(): Promise<Note[]> {
    try {
      const result = await db.getAllAsync<Note>(
        'SELECT * FROM notes ORDER BY createdAt DESC'
      );
      return result;
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  }

  static async createNote(note: Omit<Note, 'id'>): Promise<number> {
    try {
      const result = await db.runAsync(
        'INSERT INTO notes (title, content, date, time) VALUES (?, ?, ?, ?)',
        [note.title, note.content, note.date, note.time]
      );
      return result.lastInsertRowId as number;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  static async updateNote(note: Note): Promise<void> {
    try {
      await db.runAsync(
        'UPDATE notes SET title = ?, content = ?, date = ?, time = ? WHERE id = ?',
        [note.title, note.content, note.date, note.time, note.id]
      );
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  static async deleteNote(id: number): Promise<void> {
    try {
      await db.runAsync(
        'DELETE FROM notes WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  static async searchNotes(query: string): Promise<Note[]> {
    try {
      const result = await db.getAllAsync<Note>(
        `SELECT * FROM notes 
         WHERE title LIKE ? OR content LIKE ? OR date LIKE ? OR time LIKE ?
         ORDER BY createdAt DESC`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
      );
      return result;
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }
}