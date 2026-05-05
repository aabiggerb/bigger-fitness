import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Exercise, RoutineExercise } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { routines, updateRoutine, deleteRoutine, exercises } = useAppData();
  const routine = routines.find(r => r.id === id);
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<RoutineExercise[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setDescription(routine.description || '');
      setSelectedExercises([...routine.exercises]);
    }
  }, [routine]);

  if (!routine) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={C.muted} />
          <Text style={s.notFoundText}>Rutina no encontrada</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la rutina es obligatorio.');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Agrega al menos un ejercicio.');
      return;
    }

    updateRoutine(routine.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      exercises: selectedExercises,
    });

    Alert.alert('Éxito', 'Rutina actualizada correctamente.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Rutina',
      `¿Estás seguro de que quieres eliminar "${routine.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteRoutine(routine.id);
            router.back();
          },
        },
      ]
    );
  };

  const addExerciseToRoutine = (exercise: Exercise) => {
    const newExercise: RoutineExercise = {
      exerciseId: exercise.id,
      sets: 3,
      reps: '10',
      restSeconds: 60,
    };
    setSelectedExercises([...selectedExercises, newExercise]);
    setModalVisible(false);
  };

  const updateExerciseField = (index: number, field: keyof RoutineExercise, value: string | number) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const removeExercise = (index: number) => {
    const updated = [...selectedExercises];
    updated.splice(index, 1);
    setSelectedExercises(updated);
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(e => e.id === exerciseId)?.name || 'Desconocido';
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Editar Rutina</Text>
        <TouchableOpacity onPress={handleSave} style={s.headerBtn}>
          <Text style={s.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={s.formSection}>
          <Text style={s.sectionTitle}>Información</Text>

          <Text style={s.label}>Nombre de la Rutina *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej. Hipertrofia Pierna"
            placeholderTextColor={C.muted}
          />

          <Text style={s.label}>Descripción</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción opcional..."
            placeholderTextColor={C.muted}
            multiline
          />
        </View>

        {/* Exercises */}
        <View style={s.formSection}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Ejercicios ({selectedExercises.length})</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={s.addButton}>
              <Ionicons name="add" size={18} color={C.bg} />
              <Text style={s.addButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="barbell-outline" size={32} color={C.border} />
              <Text style={s.emptyText}>Sin ejercicios</Text>
            </View>
          ) : (
            selectedExercises.map((item, index) => (
              <View key={index} style={s.exerciseCard}>
                <View style={s.exerciseHeader}>
                  <View style={s.exerciseNameRow}>
                    <Ionicons name="reorder-three" size={20} color={C.muted} />
                    <Text style={s.exerciseName}>{getExerciseName(item.exerciseId)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExercise(index)}>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>

                <View style={s.row}>
                  <View style={s.col}>
                    <Text style={s.colLabel}>Series</Text>
                    <TextInput
                      style={s.smallInput}
                      keyboardType="numeric"
                      value={String(item.sets)}
                      onChangeText={(t) => updateExerciseField(index, 'sets', parseInt(t) || 0)}
                    />
                  </View>
                  <View style={s.col}>
                    <Text style={s.colLabel}>Reps</Text>
                    <TextInput
                      style={s.smallInput}
                      value={String(item.reps || '')}
                      onChangeText={(t) => updateExerciseField(index, 'reps', t)}
                    />
                  </View>
                  <View style={s.col}>
                    <Text style={s.colLabel}>Descanso (s)</Text>
                    <TextInput
                      style={s.smallInput}
                      keyboardType="numeric"
                      value={String(item.restSeconds || '')}
                      onChangeText={(t) => updateExerciseField(index, 'restSeconds', parseInt(t) || 0)}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Delete */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={C.danger} />
          <Text style={s.deleteBtnText}>Eliminar Rutina</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modal to Select Exercise */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Seleccionar Ejercicio</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={s.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={exercises}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.modalItem} onPress={() => addExerciseToRoutine(item)}>
                <View style={s.modalItemIcon}>
                  <Ionicons name="barbell-outline" size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemText}>{item.name}</Text>
                  <Text style={s.itemSubText}>{item.muscleGroup.join(', ')}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={C.accent} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { color: C.muted, fontSize: 16 },
  backBtn: { marginTop: 16, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: C.bg, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  saveText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  content: { flex: 1 },
  formSection: { marginHorizontal: 16, marginBottom: 20, backgroundColor: C.card, padding: 16, borderRadius: 12 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { color: C.accent, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.border, padding: 12, borderRadius: 8, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  addButtonText: { color: C.bg, fontWeight: '600', fontSize: 13 },
  emptyCard: { backgroundColor: C.border, padding: 32, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyText: { color: C.muted, fontSize: 14 },
  exerciseCard: { backgroundColor: C.border, padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  exerciseName: { color: C.text, fontWeight: '600', fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  colLabel: { color: C.muted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase' },
  smallInput: { backgroundColor: C.bg, padding: 10, borderRadius: 8, color: C.text, fontSize: 14, textAlign: 'center', borderWidth: 1, borderColor: C.border },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: C.danger, gap: 8 },
  deleteBtnText: { color: C.danger, fontWeight: '600', fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.card },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  closeText: { color: C.accent, fontWeight: '600', fontSize: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.card, gap: 12 },
  modalItemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center' },
  itemText: { color: C.text, fontSize: 16, fontWeight: '500' },
  itemSubText: { color: C.muted, fontSize: 13, marginTop: 2 },
});
