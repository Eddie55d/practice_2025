import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FAB, Provider as PaperProvider, Appbar, Text } from 'react-native-paper';
import { NoteForm } from '../../components/NoteForm';
import { NotesList } from '../../components/NotesList';
import { useNotes } from '../../hooks/useNotes';
import { Note, StorageType } from '../../types/Note';

export default function HomeScreen() {
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [storageType, setStorageType] = useState<StorageType>('sqlite');
  const [displayedNotes, setDisplayedNotes] = useState<Note[]>([]); // Новое состояние для отображаемых заметок

  const { 
    notes, 
    loading, 
    createNote, 
    updateNote, 
    deleteNote, 
    searchNotes,
    refreshNotes 
  } = useNotes(storageType);

  // Обновляем displayedNotes когда загружаются notes
  React.useEffect(() => {
    setDisplayedNotes(notes);
  }, [notes]);

  const handleSubmit = async (noteData: Omit<Note, 'id'>) => {
    if (editingNote) {
      return await updateNote({ ...noteData, id: editingNote.id! });
    } else {
      return await createNote(noteData);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Удаление заметки',
      'Вы уверены, что хотите удалить эту заметку?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteNote(id),
        },
      ],
      { cancelable: true }
    );
  };

  const handleSearch = async (query: string) => {
    console.log('Searching for:', query);
    
    if (!query.trim()) {
      // Если поиск пустой, показываем все заметки
      setDisplayedNotes(notes);
    } else {
      // Выполняем поиск и обновляем displayedNotes
      const results = await searchNotes(query);
      setDisplayedNotes(results);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Если очистили поиск, сразу показываем все заметки
    if (!query.trim()) {
      setDisplayedNotes(notes);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingNote(undefined);
  };

  const showStorageOptions = () => {
    Alert.alert(
      'Выберите хранилище',
      `Текущее: ${storageType === 'sqlite' ? 'SQLite' : 'Файловая система'}\nЗаметок: ${notes.length}`,
      [
        { 
          text: 'SQLite', 
          onPress: () => handleStorageChange('sqlite') 
        },
        { 
          text: 'Файловая система', 
          onPress: () => handleStorageChange('filesystem') 
        },
        { 
          text: 'Отмена', 
          style: 'cancel' 
        },
      ]
    );
  };

  const handleStorageChange = (newStorageType: StorageType) => {
    if (newStorageType !== storageType) {
      setStorageType(newStorageType);
      setSearchQuery(''); // Очищаем поиск
      setDisplayedNotes([]); // Очищаем отображаемые заметки
      // Хук useNotes сам перезагрузит notes при изменении storageType
    }
  };

  const storageTypeLabel = storageType === 'sqlite' ? 'SQLite' : 'Файлы';

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title="Мои заметки" />
          <Text style={styles.storageText}>
            {storageTypeLabel} ({notes.length})
          </Text>
          <Appbar.Action 
            icon="database" 
            onPress={showStorageOptions} 
          />
        </Appbar.Header>

        {showForm ? (
          <NoteForm
            note={editingNote}
            onSubmit={handleSubmit}
            onCancel={handleFormClose}
          />
        ) : (
          <NotesList
            notes={displayedNotes} // Передаем отображаемые заметки (все или результаты поиска)
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSearch={handleSearch}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        )}

        {!showForm && (
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => setShowForm(true)}
          />
        )}
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  storageText: {
    color: 'white',
    fontSize: 12,
    marginRight: 8,
  },
});