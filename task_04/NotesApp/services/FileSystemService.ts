// Используем legacy импорт для совместимости
import { 
    documentDirectory,
    getInfoAsync,
    makeDirectoryAsync,
    readDirectoryAsync,
    readAsStringAsync,
    writeAsStringAsync,
    deleteAsync
  } from 'expo-file-system/legacy';
  import { Note } from '../types/Note';
  
  const NOTES_DIR = documentDirectory + 'notes/';
  
  export class FileSystemService {
    static async ensureDirExists(): Promise<void> {
      try {
        const dirInfo = await getInfoAsync(NOTES_DIR);
        if (!dirInfo.exists) {
          await makeDirectoryAsync(NOTES_DIR, { intermediates: true });
        }
      } catch (error) {
        console.error('Error creating directory:', error);
      }
    }
  
    static async getNotes(): Promise<Note[]> {
      try {
        await this.ensureDirExists();
        const files = await readDirectoryAsync(NOTES_DIR);
        
        const notes: Note[] = [];
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const content = await readAsStringAsync(NOTES_DIR + file);
              const note = JSON.parse(content);
              notes.push(note);
            } catch (error) {
              console.error('Error reading note file:', file, error);
            }
          }
        }
        
        return notes.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      } catch (error) {
        console.error('Error getting notes:', error);
        return [];
      }
    }
  
    static async createNote(note: Omit<Note, 'id'>): Promise<number> {
      try {
        await this.ensureDirExists();
        const id = Date.now();
        const noteWithId: Note = {
          ...note,
          id,
          createdAt: new Date().toISOString()
        };
        
        await writeAsStringAsync(
          NOTES_DIR + `${id}.json`,
          JSON.stringify(noteWithId)
        );
        
        return id;
      } catch (error) {
        console.error('Error creating note:', error);
        throw error;
      }
    }
  
    static async updateNote(note: Note): Promise<void> {
      try {
        await this.ensureDirExists();
        const noteToSave = {
          ...note,
          createdAt: note.createdAt || new Date().toISOString()
        };
        
        await writeAsStringAsync(
          NOTES_DIR + `${note.id}.json`,
          JSON.stringify(noteToSave)
        );
      } catch (error) {
        console.error('Error updating note:', error);
        throw error;
      }
    }
  
    static async deleteNote(id: number): Promise<void> {
      try {
        const filePath = NOTES_DIR + `${id}.json`;
        const fileInfo = await getInfoAsync(filePath);
        if (fileInfo.exists) {
          await deleteAsync(filePath);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
      }
    }
  
    static async searchNotes(query: string): Promise<Note[]> {
      try {
        const notes = await this.getNotes();
        const lowerQuery = query.toLowerCase();
        
        return notes.filter(note => 
          note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery) ||
          note.date.includes(query) ||
          note.time.includes(query)
        );
      } catch (error) {
        console.error('Error searching notes:', error);
        return [];
      }
    }
  }