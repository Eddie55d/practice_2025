import React from 'react';
import { FlatList, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Searchbar } from 'react-native-paper';
import { Note } from '../types/Note';
import { useRouter } from 'expo-router';

interface NotesListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  onEdit,
  onDelete,
  onSearch,
  searchQuery,
  onSearchChange
}) => {
  const router = useRouter();

  const handleNotePress = (note: Note) => {
    // Переходим на таб "Просмотр" и передаем заметку
    router.push({
      pathname: '/(tabs)/note-detail',
      params: { note: JSON.stringify(note) }
    });
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity onPress={() => handleNotePress(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            {item.title}
          </Text>
          <Text variant="bodyMedium" style={styles.date}>
            {item.date} {item.time}
          </Text>
          <Text variant="bodyMedium" numberOfLines={3} style={styles.preview}>
            {item.content}
          </Text>
          {item.content.length > 150 && (
            <Text style={styles.moreText}>... нажмите для просмотра полного текста</Text>
          )}
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => onEdit(item)}>Редактировать</Button>
          <Button onPress={() => onDelete(item.id!)}>Удалить</Button>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Поиск заметок..."
        onChangeText={onSearchChange}
        value={searchQuery}
        onSubmitEditing={() => onSearch(searchQuery)}
        style={styles.search}
      />
      
      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id?.toString() || ''}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    color: '#666',
    marginBottom: 8,
  },
  preview: {
    lineHeight: 20,
  },
  moreText: {
    color: '#1976d2',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});