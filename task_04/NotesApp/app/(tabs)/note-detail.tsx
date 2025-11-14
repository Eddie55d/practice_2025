import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Text, Card } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Note } from '../../types/Note';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { note } = useLocalSearchParams();
  
  // Если заметка не передана, показываем заглушку
  if (!note) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title="Просмотр заметки" />
        </Appbar.Header>
        <View style={styles.placeholder}>
          <Text variant="titleMedium" style={styles.placeholderText}>
            Выберите заметку для просмотра
          </Text>
          <Text variant="bodyMedium" style={styles.placeholderSubtext}>
            Нажмите на любую заметку в списке, чтобы увидеть её содержимое здесь
          </Text>
        </View>
      </View>
    );
  }

  const noteData: Note = typeof note === 'string' ? JSON.parse(note) : note;

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Просмотр заметки" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              {noteData.title}
            </Text>
            
            <View style={styles.metaContainer}>
              <Text variant="bodyMedium" style={styles.date}>
                📅 {noteData.date}
              </Text>
              <Text variant="bodyMedium" style={styles.time}>
                ⏰ {noteData.time}
              </Text>
            </View>

            <Text variant="bodyLarge" style={styles.contentText}>
              {noteData.content}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  date: {
    color: '#666',
    fontWeight: '500',
  },
  time: {
    color: '#666',
    fontWeight: '500',
  },
  contentText: {
    lineHeight: 24,
    fontSize: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  placeholderSubtext: {
    textAlign: 'center',
    color: '#999',
  },
});