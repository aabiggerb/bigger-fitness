import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Exercise, RoutineExercise } from '../../src/types';
import { ExercisePicker } from '../../src/components/ExercisePicker';
import { generateId } from '../../src/utils/generateId';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

export default function CreateRoutineScreen() {
  const router = useRouter();
  const { addRoutine, exercises } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<RoutineExercise[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);

  const handleSave = () => {
    if (!name) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la rutina.');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Agrega al menos un ejercicio.');
      return;
    }

    const newRoutine = {
      id: generateId(),
      name,
      description,
      exercises: selectedExercises,
      isTemplate: true,
      createdBy: 'trainer-1',
    };

    addRoutine(newRoutine);
    router.back();
  };

  const addExerciseToRoutine = (exercise: Exercise) => {
      const newExercise: RoutineExercise = {
          exerciseId: exercise.id,
          sets: 3,
          reps: '10',
          restSeconds: 60
      };
      setSelectedExercises([...selectedExercises, newExercise]);
      setModalVisible(false);
  };

  const updateExercise = (index: number, field: keyof RoutineExercise, value: string | number) => {
      const updated = [...selectedExercises];
      updated[index] = { ...updated[index], [field]: value };
      setSelectedExercises(updated);
  };

  const removeExercise = (index: number) => {
      const updated = [...selectedExercises];
      updated.splice(index, 1);
      setSelectedExercises(updated);
  };

  const getExerciseName = (id: string) => {
      return exercises.find(e => e.id === id)?.name || 'Desconocido';
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backButton}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Nueva Rutina</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveButton}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content}>
        <View style={s.inputGroup}>
          <Text style={s.label}>Nombre de la Rutina</Text>
          <TextInput
            style={s.input}
            placeholder="Ej. Hipertrofia Pierna"
            value={name}
            onChangeText={setName}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={s.inputGroup}>
            <Text style={s.label}>Descripción</Text>
             <TextInput
            style={s.input}
            placeholder="Opcional"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Ejercicios ({selectedExercises.length})</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={s.addButton}>
                <Ionicons name="add" size={20} color={C.bg} />
                <Text style={s.addButtonText}>Agregar</Text>
            </TouchableOpacity>
        </View>

        {selectedExercises.map((item, index) => (
            <View key={index} style={s.exerciseCard}>
                <View style={s.exerciseHeader}>
                    <Text style={s.exerciseName}>{getExerciseName(item.exerciseId)}</Text>
                    <TouchableOpacity onPress={() => removeExercise(index)}>
                        <Ionicons name="trash-outline" size={20} color={C.danger} />
                    </TouchableOpacity>
                </View>
                
                <View style={s.row}>
                    <View style={s.col}>
                        <Text style={s.colLabel}>Series</Text>
                        <TextInput 
                            style={s.smallInput} 
                            keyboardType="numeric"
                            value={String(item.sets)}
                            onChangeText={(t) => updateExercise(index, 'sets', parseInt(t) || 0)}
                        />
                    </View>
                    <View style={s.col}>
                        <Text style={s.colLabel}>Reps</Text>
                        <TextInput 
                            style={s.smallInput} 
                            value={String(item.reps)}
                            onChangeText={(t) => updateExercise(index, 'reps', t)}
                        />
                    </View>
                     <View style={s.col}>
                        <Text style={s.colLabel}>Descanso (s)</Text>
                        <TextInput 
                            style={s.smallInput} 
                            keyboardType="numeric"
                            value={String(item.restSeconds)}
                            onChangeText={(t) => updateExercise(index, 'restSeconds', parseInt(t) || 0)}
                        />
                    </View>
                </View>
            </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal to Select Exercise */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <ExercisePicker
          exercises={exercises}
          onSelect={(exercise) => addExerciseToRoutine(exercise)}
          onClose={() => setModalVisible(false)}
        />
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.card,
    backgroundColor: C.bg,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.text,
  },
  backButton: {
    color: C.muted,
    fontSize: 16,
  },
  saveButton: {
    color: C.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    color: C.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    fontSize: 16,
    color: C.text,
  },
  sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 16
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: C.text,
  },
  addButton: {
      flexDirection: 'row',
      backgroundColor: C.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignItems: 'center',
      gap: 4
  },
  addButtonText: {
      color: C.bg,
      fontWeight: '600',
      fontSize: 14
  },
  exerciseCard: {
      backgroundColor: C.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 12
  },
  exerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12
  },
  exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: C.text,
  },
  row: {
      flexDirection: 'row',
      gap: 12
  },
  col: {
      flex: 1
  },
  colLabel: {
      fontSize: 12,
      color: C.muted,
      marginBottom: 4
  },
  smallInput: {
      backgroundColor: C.border,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      padding: 8,
      textAlign: 'center',
      color: C.text,
      fontWeight: 'bold',
  },
  modalContainer: {
      flex: 1,
      backgroundColor: C.bg,
      paddingTop: 16,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: C.text,
  },
  closeText: {
      color: C.accent,
      fontSize: 16
  },
  modalItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.card
  },
  itemText: {
      fontSize: 16,
      fontWeight: '500',
      color: C.text,
  },
  itemSubText: {
      fontSize: 14,
      color: C.muted,
      marginTop: 2
  }
});
