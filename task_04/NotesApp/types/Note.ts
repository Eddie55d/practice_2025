export interface Note {
    id: number;
    title: string;
    content: string;
    date: string;
    time: string;
    createdAt?: string;
  }
  
  export type StorageType = 'sqlite' | 'filesystem';
  
  // Для навигации между экранами
  export type RootStackParamList = {
    Home: undefined;
    NoteDetail: { note: Note };
  };