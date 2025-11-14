import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Note } from '../types/Note';

interface NoteFormProps {
  note?: Note;
  onSubmit: (note: Omit<Note, 'id'>) => Promise<boolean>;
  onCancel: () => void;
}

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 2000;

export const NoteForm: React.FC<NoteFormProps> = ({ note, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setDate(note.date);
      setTime(note.time);
    } else {
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toTimeString().split(' ')[0].substring(0, 5));
    }
  }, [note]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните заголовок и содержание');
      return;
    }

    if (title.length > MAX_TITLE_LENGTH) {
      Alert.alert('Ошибка', `Заголовок не может превышать ${MAX_TITLE_LENGTH} символов`);
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      Alert.alert('Ошибка', `Содержание не может превышать ${MAX_CONTENT_LENGTH} символов`);
      return;
    }

    setLoading(true);
    const success = await onSubmit({
      title: title.trim(),
      content: content.trim(),
      date,
      time
    });
    
    setLoading(false);
    if (success) {
      onCancel();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          label="Заголовок"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          mode="outlined"
          maxLength={MAX_TITLE_LENGTH}
          right={<TextInput.Affix text={`${title.length}/${MAX_TITLE_LENGTH}`} />}
        />
        
        <TextInput
          label="Дата (ГГГГ-ММ-ДД)"
          value={date}
          onChangeText={setDate}
          style={styles.input}
          mode="outlined"
          placeholder="2024-01-15"
        />
        
        <TextInput
          label="Время (ЧЧ:ММ)"
          value={time}
          onChangeText={setTime}
          style={styles.input}
          mode="outlined"
          placeholder="14:30"
        />
        
        <View>
          <TextInput
            label="Содержание"
            value={content}
            onChangeText={setContent}
            style={[styles.input, styles.contentInput]}
            mode="outlined"
            multiline
            numberOfLines={6}
            maxLength={MAX_CONTENT_LENGTH}
          />
          <Text style={styles.counter}>
            {content.length}/{MAX_CONTENT_LENGTH} символов
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button 
            mode="outlined" 
            onPress={onCancel}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Отмена
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSubmit}
            loading={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {note ? 'Обновить' : 'Создать'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30, // Добавляем отступ снизу для кнопок
  },
  input: {
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 160, // Используем minHeight вместо height
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 20, // Дополнительный отступ снизу
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  buttonContent: {
    height: 50, // Фиксированная высота для кнопок
  },
  counter: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: -12,
    marginBottom: 16,
  },
});