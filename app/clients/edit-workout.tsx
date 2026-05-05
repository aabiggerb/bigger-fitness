import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ExerciseSet, ExerciseLog } from '../../src/types';
import { ExercisePicker } from '../../src/components/ExercisePicker';
import { generateId } from '../../src/utils/generateId';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

interface EditEntry {
  logId: string | null; // null = new entry
  exerciseId: string;
  sets: ExerciseSet[];
  notes: string;
}

export default function EditWorkoutScreen() {
  const { clientId, date } = useLocalSearchParams<{ clientId: string; date: string }>();
  const router = useRouter();
  const { clients, exercises, exerciseLogs, updateExerciseLog, addExerciseLog, deleteExerciseLog } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const client = clients.find(c => c.id === clientId);
  const [entries, setEntries] = useState<EditEntry[]>([]);
  const [deletedLogIds, setDeletedLogIds] = useState<string[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Track keyboard visibility
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Load existing logs for this date
  const existingLogs = useMemo(
    () => exerciseLogs.filter(l => l.clientId === clientId && l.date === date),
    [exerciseLogs, clientId, date]
  );

  useEffect(() => {
    if (existingLogs.length > 0 && entries.length === 0) {
      setEntries(
        existingLogs.map(log => ({
          logId: log.id,
          exerciseId: log.exerciseId,
          sets: log.sets.map(s => ({ ...s })),
          notes: log.notes || '',
        }))
      );
    }
  }, []);

  if (!client) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Cliente no encontrado</Text>
      </SafeAreaView>
    );
  }

  const getExerciseName = (exerciseId: string) =>
    exercises.find(e => e.id === exerciseId)?.name || 'Desconocido';

  const getExerciseMuscle = (exerciseId: string) =>
    exercises.find(e => e.id === exerciseId)?.muscleGroup.join(', ') || '';

  const addExerciseEntry = (exerciseId: string) => {
    if (entries.find(e => e.exerciseId === exerciseId)) {
      Alert.alert('Info', 'Este ejercicio ya está en la sesión.');
      setShowExercisePicker(false);
      return;
    }
    setEntries([
      ...entries,
      {
        logId: null,
        exerciseId,
        sets: [{ setNumber: 1, weight: 0, reps: 0 }],
        notes: '',
      },
    ]);
    setShowExercisePicker(false);
  };

  const addSet = (entryIndex: number) => {
    const updated = [...entries];
    const lastSet = updated[entryIndex].sets[updated[entryIndex].sets.length - 1];
    updated[entryIndex].sets.push({
      setNumber: updated[entryIndex].sets.length + 1,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
    });
    setEntries(updated);
  };

  const removeSet = (entryIndex: number, setIndex: number) => {
    const updated = [...entries];
    if (updated[entryIndex].sets.length <= 1) return;
    updated[entryIndex].sets.splice(setIndex, 1);
    updated[entryIndex].sets = updated[entryIndex].sets.map((s, i) => ({
      ...s,
      setNumber: i + 1,
    }));
    setEntries(updated);
  };

  const updateSet = (entryIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', value: string) => {
    const updated = [...entries];
    let numVal = parseFloat(value) || 0;
    if (field === 'weight' && weightUnit === 'lbs' && numVal > 0) {
      numVal = Math.round((numVal / 2.20462) * 100) / 100;
    }
    if (field === 'rpe') numVal = Math.min(10, Math.max(0, numVal));
    updated[entryIndex].sets[setIndex] = {
      ...updated[entryIndex].sets[setIndex],
      [field]: numVal,
    };
    setEntries(updated);
  };

  const removeEntry = (entryIndex: number) => {
    const entry = entries[entryIndex];
    if (entry.logId) {
      setDeletedLogIds(prev => [...prev, entry.logId!]);
    }
    const updated = [...entries];
    updated.splice(entryIndex, 1);
    setEntries(updated);
  };

  const getTotalVolume = () =>
    entries.reduce(
      (total, entry) => total + entry.sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
      0
    );

  const displayWeight = (w: number): string => {
    if (w <= 0) return '';
    if (weightUnit === 'lbs') return String(Math.round(w * 2.20462 * 10) / 10);
    return String(w);
  };

  const toggleWeightUnit = () => {
    setWeightUnit(prev => prev === 'kg' ? 'lbs' : 'kg');
  };

  const handleSave = () => {
    const validEntries = entries.filter(e => e.sets.some(s => s.weight > 0 || s.reps > 0));

    // Delete removed entries
    deletedLogIds.forEach(id => deleteExerciseLog(id));

    // Update existing or add new
    validEntries.forEach(entry => {
      const cleanSets = entry.sets.filter(s => s.weight > 0 || s.reps > 0);
      if (entry.logId) {
        // Update existing log
        updateExerciseLog(entry.logId, {
          sets: cleanSets,
          notes: entry.notes || undefined,
        });
      } else {
        // Add new log
        const log: ExerciseLog = {
          id: generateId(),
          clientId: client.id,
          exerciseId: entry.exerciseId,
          date: date,
          sets: cleanSets,
          notes: entry.notes || undefined,
        };
        addExerciseLog(log);
      }
    });

    // Also delete any entries that became invalid (all sets zeroed out)
    const invalidExisting = entries
      .filter(e => e.logId && !e.sets.some(s => s.weight > 0 || s.reps > 0))
      .map(e => e.logId!);
    invalidExisting.forEach(id => deleteExerciseLog(id));

    Alert.alert('✓ Sesión Actualizada', `Se guardaron los cambios correctamente.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Editar Sesión</Text>
        <TouchableOpacity onPress={handleSave} style={s.headerBtn}>
          <Text style={s.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Date & Client Bar */}
      <View style={s.clientBar}>
        <View style={s.clientBarLeft}>
          <View style={s.miniAvatar}>
            <Ionicons name="person" size={16} color={C.accent} />
          </View>
          <Text style={s.clientBarName}>{client.name}</Text>
        </View>
        <Text style={s.clientBarDate}>{formattedDate}</Text>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{entries.length}</Text>
          <Text style={s.summaryLabel}>Ejercicios</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>
            {entries.reduce((s, e) => s + e.sets.length, 0)}
          </Text>
          <Text style={s.summaryLabel}>Series</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: C.accent }]}>
            {(weightUnit === 'lbs' ? Math.round(getTotalVolume() * 2.20462) : getTotalVolume()).toLocaleString()}
          </Text>
          <Text style={s.summaryLabel} onPress={toggleWeightUnit}>Vol. ({weightUnit}) ↔</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
      <ScrollView showsVerticalScrollIndicator={false} style={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Exercise Entries */}
        {entries.map((entry, entryIndex) => (
          <View key={entryIndex} style={s.exerciseCard}>
            {/* Exercise Header */}
            <View style={s.exerciseHeader}>
              <View style={s.exerciseInfo}>
                <Text style={s.exerciseName}>
                  {getExerciseName(entry.exerciseId)}
                </Text>
                <Text style={s.exerciseMuscle}>
                  {getExerciseMuscle(entry.exerciseId)}
                </Text>
              </View>
              <View style={s.exerciseHeaderActions}>
                {entry.logId && (
                  <View style={s.existingBadge}>
                    <Text style={s.existingBadgeText}>Existente</Text>
                  </View>
                )}
                {!entry.logId && (
                  <View style={s.newBadge}>
                    <Text style={s.newBadgeText}>Nuevo</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => removeEntry(entryIndex)}>
                  <Ionicons name="close-circle" size={22} color={C.danger} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sets Table Header */}
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: 40 }]}>SET</Text>
              <TouchableOpacity onPress={toggleWeightUnit} style={{ flex: 1 }}>
                <Text style={[s.tableHeaderText]}>PESO ({weightUnit}) ↔</Text>
              </TouchableOpacity>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>REPS</Text>
              <Text style={[s.tableHeaderText, { width: 52 }]}>RPE</Text>
              <View style={{ width: 30 }} />
            </View>

            {/* Sets */}
            {entry.sets.map((set, setIndex) => (
              <View key={setIndex} style={s.setRow}>
                <View style={s.setNumber}>
                  <Text style={s.setNumberText}>{set.setNumber}</Text>
                </View>
                <TextInput
                  style={s.setInput}
                  value={displayWeight(set.weight)}
                  onChangeText={v => updateSet(entryIndex, setIndex, 'weight', v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.border}
                />
                <TextInput
                  style={s.setInput}
                  value={set.reps > 0 ? String(set.reps) : ''}
                  onChangeText={v => updateSet(entryIndex, setIndex, 'reps', v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={C.border}
                />
                <TextInput
                  style={[s.rpeInput, (set.rpe != null && set.rpe > 0) ? {
                    borderColor: set.rpe >= 8 ? C.danger : set.rpe >= 6 ? C.warning : C.accentSoft,
                    backgroundColor: set.rpe >= 8 ? C.accentDim : set.rpe >= 6 ? C.accentDim : C.accentDim,
                  } : undefined]}
                  value={set.rpe && set.rpe > 0 ? String(set.rpe) : ''}
                  onChangeText={v => updateSet(entryIndex, setIndex, 'rpe', v)}
                  keyboardType="decimal-pad"
                  placeholder="-"
                  placeholderTextColor={C.border}
                  maxLength={4}
                />
                <TouchableOpacity
                  style={s.removeSetBtn}
                  onPress={() => removeSet(entryIndex, setIndex)}
                >
                  <Ionicons name="remove-circle-outline" size={18} color={C.muted} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Set */}
            <TouchableOpacity style={s.addSetBtn} onPress={() => addSet(entryIndex)}>
              <Ionicons name="add" size={16} color={C.accent} />
              <Text style={s.addSetText}>Agregar Serie</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add More */}
        <TouchableOpacity style={s.addMoreBtn} onPress={() => setShowExercisePicker(true)}>
          <Ionicons name="add-circle" size={24} color={C.accent} />
          <Text style={s.addMoreText}>Agregar Ejercicio</Text>
        </TouchableOpacity>

        {/* Danger Zone */}
        {deletedLogIds.length > 0 && (
          <View style={s.dangerZone}>
            <Ionicons name="warning" size={16} color={C.danger} />
            <Text style={s.dangerText}>
              {deletedLogIds.length} ejercicio(s) se eliminarán al guardar
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Dismiss Keyboard Button */}
      {keyboardVisible && (
        <TouchableOpacity
          style={s.dismissKeyboardBtn}
          onPress={() => Keyboard.dismiss()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-down" size={20} color={C.bg} />
        </TouchableOpacity>
      )}

      {/* Exercise Picker Modal */}
      <Modal visible={showExercisePicker} animationType="slide" presentationStyle="pageSheet">
        <ExercisePicker
          exercises={exercises}
          onSelect={(exercise) => addExerciseEntry(exercise.id)}
          onClose={() => setShowExercisePicker(false)}
          title="Agregar Ejercicio"
        />
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  errorText: { color: C.danger, textAlign: 'center', marginTop: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  saveText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  clientBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, backgroundColor: C.card, padding: 12, borderRadius: 10,
    marginBottom: 12,
  },
  clientBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  clientBarName: { color: C.text, fontWeight: '600', fontSize: 15 },
  clientBarDate: { color: C.muted, fontSize: 11, textTransform: 'capitalize' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: C.card, padding: 12, borderRadius: 10,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: C.text },
  summaryLabel: { fontSize: 10, color: C.muted, marginTop: 2, textTransform: 'uppercase' },
  scrollContent: { flex: 1 },
  exerciseCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card,
    borderRadius: 12, overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: C.text, fontWeight: 'bold', fontSize: 16 },
  exerciseMuscle: { color: C.muted, fontSize: 12, marginTop: 2 },
  exerciseHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  existingBadge: {
    backgroundColor: C.accentSoft, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6,
  },
  existingBadgeText: { color: C.accent, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  newBadge: {
    backgroundColor: C.accentDim, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6,
  },
  newBadgeText: { color: C.warning, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 8, gap: 8,
  },
  tableHeaderText: {
    color: C.accent, fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 4, gap: 8,
  },
  setNumber: { width: 40, alignItems: 'center' },
  setNumberText: { color: C.muted, fontWeight: 'bold', fontSize: 14 },
  setInput: {
    flex: 1, backgroundColor: C.border, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, color: C.text, fontSize: 16, fontWeight: '600',
    textAlign: 'center', borderWidth: 1, borderColor: C.border,
  },
  removeSetBtn: { width: 30, alignItems: 'center' },
  rpeInput: {
    width: 52, backgroundColor: C.border, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 8, color: C.text, fontSize: 14, fontWeight: '600',
    textAlign: 'center', borderWidth: 1, borderColor: C.border,
  },
  addSetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 4, borderTopWidth: 1, borderTopColor: C.border,
  },
  addSetText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, paddingVertical: 16, gap: 8, borderWidth: 1,
    borderColor: C.border, borderStyle: 'dashed', borderRadius: 12, marginTop: 4,
  },
  addMoreText: { color: C.accent, fontWeight: '600', fontSize: 14 },
  dangerZone: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 10,
    backgroundColor: C.accentDim, borderWidth: 1,
    borderColor: C.danger, gap: 8,
  },
  dangerText: { color: C.danger, fontSize: 13 },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.card,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  modalClose: { color: C.accent, fontWeight: '600', fontSize: 16 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: C.card, gap: 12,
  },
  modalItemIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDim,
    justifyContent: 'center', alignItems: 'center',
  },
  modalItemText: { color: C.text, fontSize: 16, fontWeight: '500' },
  modalItemSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  dismissKeyboardBtn: { position: 'absolute', bottom: 20, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
});
