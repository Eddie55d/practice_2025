import { useState, useEffect } from 'react';
import { Note, StorageType } from '../types/Note';
import { SQLiteService } from '../services/SQLiteService';
import { FileSystemService } from '../services/FileSystemService';

export const useNotes = (storageType: StorageType = 'sqlite') => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageKey, setStorageKey] = useState(0); // Добавляем ключ для принудительного обновления

  // Используем storageType и storageKey в зависимостях
  useEffect(() => {
    initializeStorage();
  }, [storageType, storageKey]);

  const initializeStorage = async () => {
    setLoading(true);
    try {
      if (storageType === 'sqlite') {
        await SQLiteService.initDatabase();
      } else {
        await FileSystemService.ensureDirExists();
      }
      await loadNotes();
    } catch (error) {
      console.error('Storage initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      console.log(`Loading notes from: ${storageType}`);
      const notesData = storageType === 'sqlite' 
        ? await SQLiteService.getNotes()
        : await FileSystemService.getNotes();
      console.log(`Loaded ${notesData.length} notes from ${storageType}`);
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const createNote = async (note: Omit<Note, 'id'>): Promise<boolean> => {
    try {
      if (storageType === 'sqlite') {
        await SQLiteService.createNote(note);
      } else {
        await FileSystemService.createNote(note);
      }
      await loadNotes();
      return true;
    } catch (error) {
      console.error('Error creating note:', error);
      return false;
    }
  };

  const updateNote = async (note: Note): Promise<boolean> => {
    try {
      if (storageType === 'sqlite') {
        await SQLiteService.updateNote(note);
      } else {
        await FileSystemService.updateNote(note);
      }
      await loadNotes();
      return true;
    } catch (error) {
      console.error('Error updating note:', error);
      return false;
    }
  };

  const deleteNote = async (id: number): Promise<boolean> => {
    try {
      if (storageType === 'sqlite') {
        await SQLiteService.deleteNote(id);
      } else {
        await FileSystemService.deleteNote(id);
      }
      await loadNotes();
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    }
  };

  const searchNotes = async (query: string): Promise<Note[]> => {
    try {
      if (!query.trim()) {
        await loadNotes();
        return notes;
      }
      
      const searchResults = storageType === 'sqlite'
        ? await SQLiteService.searchNotes(query)
        : await FileSystemService.searchNotes(query);
      
      return searchResults;
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  };

  // Функция для принудительного обновления
  const refreshNotes = () => {
    setStorageKey(prev => prev + 1); // Изменяем ключ для принудительного обновления
  };

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    refreshNotes,
    currentStorageType: storageType
  };
};