import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ExerciseSet, ExerciseLog, WeekDay, ClientPlan } from '../../src/types';
import { ExercisePicker } from '../../src/components/ExercisePicker';
import { RestTimer } from '../../src/components/RestTimer';
import { RPEFeedbackModal } from '../../src/components/RPEFeedbackModal';
import { generateId } from '../../src/utils/generateId';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

const WEEKDAY_MAP: Record<number, WeekDay> = {
  1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 0: 'domingo',
};

const WEEKDAY_LABELS: Record<WeekDay, string> = {
  lunes: 'Lunes', martes: 'Martes', miércoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sábado: 'Sábado', domingo: 'Domingo',
};

interface WorkoutEntry {
  exerciseId: string;
  sets: ExerciseSet[];
  notes: string;
}

export default function WorkoutScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();
  const { clients, exercises, routines, addExerciseLog } = useAppData();
  const client = clients.find(c => c.id === clientId);

  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [planAutoLoaded, setPlanAutoLoaded] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // ─── Rest Timer & RPE Feedback state ───
  const [showFullTimer, setShowFullTimer] = useState(false);
  const [activeTimerEntry, setActiveTimerEntry] = useState<number | null>(null);
  const [activeTimerSet, setActiveTimerSet] = useState<number | null>(null);
  const [showRPEModal, setShowRPEModal] = useState(false);
  const [rpeFeedbackContext, setRpeFeedbackContext] = useState<{
    entryIndex: number;
    setIndex: number;
    exerciseName: string;
    setNumber: number;
  } | null>(null);

  // Track keyboard visibility
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // While the rest timer is open, aggressively dismiss the keyboard if anything
  // tries to bring it back (e.g. underlying TextInput regains focus).
  useEffect(() => {
    if (!showFullTimer) return;
    Keyboard.dismiss();
    const sub = Keyboard.addListener('keyboardDidShow', () => Keyboard.dismiss());
    return () => sub.remove();
  }, [showFullTimer]);

  // Detect today's weekday and find matching active plan
  const todayWeekDay = WEEKDAY_MAP[new Date().getDay()];
  const todayPlan = useMemo(() => {
    if (!client) return null;
    return client.plans.find(p => p.active && p.weekDays.includes(todayWeekDay)) || null;
  }, [client, todayWeekDay]);

  // Auto-load today's plan on mount
  useEffect(() => {
    if (todayPlan && !planAutoLoaded && entries.length === 0) {
      const newEntries: WorkoutEntry[] = todayPlan.exercises.map(pe => ({
        exerciseId: pe.exerciseId,
        sets: Array.from({ length: pe.sets }, (_, i) => ({
          setNumber: i + 1,
          weight: pe.weight || 0,
          reps: parseInt(pe.reps || '0') || 0,
        })),
        notes: pe.notes || '',
      }));
      setEntries(newEntries);
      setPlanAutoLoaded(true);
    }
  }, [todayPlan]);

  if (!client) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Cliente no encontrado</Text>
      </SafeAreaView>
    );
  }

  const addExerciseEntry = (exerciseId: string) => {
    if (entries.find(e => e.exerciseId === exerciseId)) {
      Alert.alert('Info', 'Este ejercicio ya está en la sesión.');
      setShowExercisePicker(false);
      return;
    }
    setEntries([...entries, {
      exerciseId,
      sets: [{ setNumber: 1, weight: 0, reps: 0 }],
      notes: '',
    }]);
    setShowExercisePicker(false);
  };

  const loadFromRoutine = (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const newEntries: WorkoutEntry[] = routine.exercises.map(re => ({
      exerciseId: re.exerciseId,
      sets: Array.from({ length: re.sets }, (_, i) => ({
        setNumber: i + 1,
        weight: re.weight || 0,
        reps: parseInt(re.reps || '0') || 0,
      })),
      notes: '',
    }));
    setEntries(newEntries);
    setShowRoutinePicker(false);
  };

  const loadFromPlan = (plan: ClientPlan) => {
    const newEntries: WorkoutEntry[] = plan.exercises.map(pe => ({
      exerciseId: pe.exerciseId,
      sets: Array.from({ length: pe.sets }, (_, i) => ({
        setNumber: i + 1,
        weight: pe.weight || 0,
        reps: parseInt(pe.reps || '0') || 0,
      })),
      notes: pe.notes || '',
    }));
    setEntries(newEntries);
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
    updated[entryIndex].sets = updated[entryIndex].sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
    setEntries(updated);
  };

  const updateSet = (entryIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', value: string) => {
    const updated = [...entries];
    let numVal = parseFloat(value) || 0;
    if (field === 'weight' && weightUnit === 'lbs' && numVal > 0) {
      numVal = Math.round((numVal / 2.20462) * 100) / 100;
    }
    if (field === 'rpe') {
      numVal = Math.min(10, Math.max(0, numVal)); // Clamp RPE 0-10
    }
    updated[entryIndex].sets[setIndex] = {
      ...updated[entryIndex].sets[setIndex],
      [field]: numVal,
    };
    setEntries(updated);
  };

  const removeEntry = (entryIndex: number) => {
    const updated = [...entries];
    updated.splice(entryIndex, 1);
    setEntries(updated);
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises.find(e => e.id === exerciseId)?.name || 'Desconocido';
  };

  const getExerciseMuscle = (exerciseId: string) => {
    return exercises.find(e => e.id === exerciseId)?.muscleGroup.join(', ') || '';
  };

  const handleSave = () => {
    const validEntries = entries.filter(e => e.sets.some(s => s.weight > 0 || s.reps > 0));
    if (validEntries.length === 0) {
      Alert.alert('Error', 'Registra al menos un ejercicio con peso o repeticiones.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    validEntries.forEach(entry => {
      const log: ExerciseLog = {
        id: generateId(),
        clientId: client.id,
        exerciseId: entry.exerciseId,
        date: today,
        sets: entry.sets.filter(s => s.weight > 0 || s.reps > 0),
        notes: entry.notes || undefined,
      };
      addExerciseLog(log);
    });

    Alert.alert(
      '✓ Sesión Registrada',
      `Se guardaron ${validEntries.length} ejercicios para ${client.name}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const getTotalVolume = () => {
    return entries.reduce((total, entry) => {
      return total + entry.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
    }, 0);
  };

  const displayWeight = (w: number): string => {
    if (w <= 0) return '';
    if (weightUnit === 'lbs') return String(Math.round(w * 2.20462 * 10) / 10);
    return String(w);
  };

  const toggleWeightUnit = () => {
    setWeightUnit(prev => prev === 'kg' ? 'lbs' : 'kg');
  };

  // ─── Trigger rest timer after completing a set ───
  const startRestTimer = (entryIndex: number, setIndex: number) => {
    setActiveTimerEntry(entryIndex);
    setActiveTimerSet(setIndex);
    setShowFullTimer(true);
    Keyboard.dismiss();
  };

  // ─── When rest timer finishes → show RPE modal ───
  const handleTimerComplete = () => {
    if (activeTimerEntry !== null && activeTimerSet !== null) {
      const entry = entries[activeTimerEntry];
      if (entry) {
        setRpeFeedbackContext({
          entryIndex: activeTimerEntry,
          setIndex: activeTimerSet,
          exerciseName: getExerciseName(entry.exerciseId),
          setNumber: entry.sets[activeTimerSet]?.setNumber || activeTimerSet + 1,
        });
        setShowRPEModal(true);
      }
    }
    setShowFullTimer(false);
  };

  // ─── RPE submitted from modal ───
  const handleRPESubmit = (rpe: number) => {
    if (rpeFeedbackContext) {
      const { entryIndex, setIndex } = rpeFeedbackContext;
      const updated = [...entries];
      if (updated[entryIndex] && updated[entryIndex].sets[setIndex]) {
        updated[entryIndex].sets[setIndex] = {
          ...updated[entryIndex].sets[setIndex],
          rpe,
        };
        setEntries(updated);
      }
    }
    setShowRPEModal(false);
    setRpeFeedbackContext(null);
  };

  // ─── RPE skipped ───
  const handleRPESkip = () => {
    setShowRPEModal(false);
    setRpeFeedbackContext(null);
  };

  // Derive rest seconds for current exercise from plan
  const getRestSecondsForEntry = (entryIndex: number): number => {
    if (todayPlan && entries[entryIndex]) {
      const planEx = todayPlan.exercises.find(pe => pe.exerciseId === entries[entryIndex].exerciseId);
      if (planEx?.restSeconds) return planEx.restSeconds;
    }
    return 90; // Default rest
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Registrar Sesión</Text>
        <TouchableOpacity onPress={handleSave} style={s.headerBtn}>
          <Text style={s.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Client Info Bar */}
      <View style={s.clientBar}>
        <View style={s.clientBarLeft}>
          <View style={s.miniAvatar}>
            <Ionicons name="person" size={16} color={C.accent} />
          </View>
          <Text style={s.clientBarName}>{client.name}</Text>
        </View>
        <Text style={s.clientBarDate}>
          {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{entries.length}</Text>
          <Text style={s.summaryLabel}>Ejercicios</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{entries.reduce((s, e) => s + e.sets.length, 0)}</Text>
          <Text style={s.summaryLabel}>Series</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: C.accent }]}>
            {(weightUnit === 'lbs' ? Math.round(getTotalVolume() * 2.20462) : getTotalVolume()).toLocaleString()}
          </Text>
          <Text style={s.summaryLabel} onPress={toggleWeightUnit}>Vol. ({weightUnit}) ↔</Text>
        </View>
      </View>

      {/* Rest Timer — Full Mode */}
      {showFullTimer && entries.length > 0 && (
        <View style={s.timerSection}>
          <RestTimer
            defaultRestSeconds={activeTimerEntry !== null ? getRestSecondsForEntry(activeTimerEntry) : 90}
            onTimerComplete={handleTimerComplete}
            athleteName={client?.name}
          />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
      <ScrollView showsVerticalScrollIndicator={false} style={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Today's plan info or no-plan message */}
        {entries.length === 0 && (
          <View style={s.startSection}>
            {todayPlan ? (
              <View style={s.planInfoBox}>
                <View style={s.planInfoHeader}>
                  <Ionicons name="calendar" size={18} color={C.accent} />
                  <Text style={s.planInfoTitle}>Plan de hoy ({WEEKDAY_LABELS[todayWeekDay]})</Text>
                </View>
                <Text style={s.planInfoName}>{todayPlan.templateName}</Text>
                <Text style={s.planInfoDetail}>
                  {todayPlan.exercises.length} ejercicios asignados
                </Text>
                <TouchableOpacity style={s.loadPlanBtn} onPress={() => loadFromPlan(todayPlan)}>
                  <Ionicons name="flash" size={18} color={C.bg} />
                  <Text style={s.loadPlanBtnText}>Cargar Plan del Día</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.noPlanBox}>
                <Ionicons name="moon-outline" size={28} color={C.muted} />
                <Text style={s.noPlanText}>
                  No hay rutina asignada para {WEEKDAY_LABELS[todayWeekDay]}
                </Text>
                <Text style={s.noPlanSubtext}>Puedes cargar una rutina o agregar ejercicios</Text>
              </View>
            )}
            <View style={s.manualOptionsRow}>
              <TouchableOpacity style={s.loadRoutineBtn} onPress={() => setShowRoutinePicker(true)}>
                <Ionicons name="clipboard-outline" size={18} color={C.bg} />
                <Text style={s.loadRoutineBtnText}>Cargar desde Rutina</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addExerciseBtn} onPress={() => setShowExercisePicker(true)}>
                <Ionicons name="add-circle-outline" size={18} color={C.accent} />
                <Text style={s.addExerciseBtnText}>Agregar Individual</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exercise Entries */}
        {entries.map((entry, entryIndex) => (
          <View key={entryIndex} style={s.exerciseCard}>
            {/* Exercise Header */}
            <View style={s.exerciseHeader}>
              <View style={s.exerciseInfo}>
                <Text style={s.exerciseName}>{getExerciseName(entry.exerciseId)}</Text>
                <Text style={s.exerciseMuscle}>{getExerciseMuscle(entry.exerciseId)}</Text>
              </View>
              <TouchableOpacity onPress={() => removeEntry(entryIndex)}>
                <Ionicons name="close-circle" size={22} color={C.danger} />
              </TouchableOpacity>
            </View>

            {/* Sets Table Header */}
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: 40 }]}>SET</Text>
              <TouchableOpacity onPress={toggleWeightUnit} style={{ flex: 1 }}>
                <Text style={[s.tableHeaderText]}>PESO ({weightUnit}) ↔</Text>
              </TouchableOpacity>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>REPS</Text>
              <Text style={[s.tableHeaderText, { width: 46 }]}>RPE</Text>
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
                  onChangeText={(v) => updateSet(entryIndex, setIndex, 'weight', v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.muted}
                />
                <TextInput
                  style={s.setInput}
                  value={set.reps > 0 ? String(set.reps) : ''}
                  onChangeText={(v) => updateSet(entryIndex, setIndex, 'reps', v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={C.muted}
                />
                <TextInput
                  style={[s.rpeInput, set.rpe && set.rpe >= 9 ? s.rpeHigh : set.rpe && set.rpe >= 7 ? s.rpeMed : null]}
                  value={set.rpe ? String(set.rpe) : ''}
                  onChangeText={(v) => updateSet(entryIndex, setIndex, 'rpe', v)}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={C.muted}
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

            {/* Set action row: Add Set + Start Rest Timer */}
            <View style={s.setActionsRow}>
              <TouchableOpacity style={s.addSetBtn} onPress={() => addSet(entryIndex)}>
                <Ionicons name="add" size={16} color={C.accent} />
                <Text style={s.addSetText}>Agregar Serie</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.restTimerBtn}
                onPress={() => {
                  const lastSetIdx = entry.sets.length - 1;
                  startRestTimer(entryIndex, lastSetIdx);
                }}
              >
                <Ionicons name="timer-outline" size={16} color={C.warning} />
                <Text style={s.restTimerBtnText}>Descanso</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add More */}
        {entries.length > 0 && (
          <View style={{ gap: 8 }}>
            {planAutoLoaded && todayPlan && (
              <View style={s.planLoadedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={C.accent} />
                <Text style={s.planLoadedText}>
                  Plan cargado: {todayPlan.templateName}
                </Text>
              </View>
            )}
            <View style={s.addMoreRow}>
              <TouchableOpacity style={s.addMoreBtn} onPress={() => setShowExercisePicker(true)}>
                <Ionicons name="add-circle" size={20} color={C.accent} />
                <Text style={s.addMoreText}>Agregar Ejercicio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.loadRoutineBtnSmall} onPress={() => setShowRoutinePicker(true)}>
                <Ionicons name="clipboard-outline" size={16} color={C.accent} />
                <Text style={s.loadRoutineBtnSmallText}>Rutina</Text>
              </TouchableOpacity>
            </View>
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
        />
      </Modal>

      {/* RPE Feedback Modal */}
      <RPEFeedbackModal
        visible={showRPEModal}
        exerciseName={rpeFeedbackContext?.exerciseName || ''}
        setNumber={rpeFeedbackContext?.setNumber || 1}
        onSubmit={handleRPESubmit}
        onSkip={handleRPESkip}
      />

      {/* Routine Picker Modal */}
      <Modal visible={showRoutinePicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Cargar Rutina</Text>
            <TouchableOpacity onPress={() => setShowRoutinePicker(false)}>
              <Text style={s.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={routines}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.modalItem} onPress={() => loadFromRoutine(item.id)}>
                <View style={s.modalItemIcon}>
                  <Ionicons name="clipboard-outline" size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalItemText}>{item.name}</Text>
                  <Text style={s.modalItemSub}>{item.exercises.length} ejercicios</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.accent} />
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
  errorText: { color: C.danger, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  saveText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  clientBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, backgroundColor: C.card, padding: 12, borderRadius: 10, marginBottom: 12 },
  clientBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  clientBarName: { color: C.text, fontWeight: '600', fontSize: 15 },
  clientBarDate: { color: C.muted, fontSize: 13 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: C.card, padding: 12, borderRadius: 10, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: C.text },
  summaryLabel: { fontSize: 10, color: C.muted, marginTop: 2, textTransform: 'uppercase' },
  scrollContent: { flex: 1 },
  startSection: { alignItems: 'center', padding: 24, gap: 16 },
  planInfoBox: { width: '100%', backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accentSoft, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  planInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planInfoTitle: { color: C.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  planInfoName: { color: C.text, fontSize: 18, fontWeight: 'bold' },
  planInfoDetail: { color: C.muted, fontSize: 13 },
  loadPlanBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 6, marginTop: 8 },
  loadPlanBtnText: { color: C.bg, fontWeight: 'bold', fontSize: 14 },
  noPlanBox: { width: '100%', backgroundColor: C.card, borderRadius: 14, padding: 20, alignItems: 'center', gap: 6 },
  noPlanText: { color: C.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  noPlanSubtext: { color: C.muted, fontSize: 13, textAlign: 'center' },
  manualOptionsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  loadRoutineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent, paddingVertical: 12, borderRadius: 10, gap: 6 },
  loadRoutineBtnText: { color: C.bg, fontWeight: 'bold', fontSize: 13 },
  addExerciseBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  addExerciseBtnText: { color: C.accent, fontWeight: '600', fontSize: 13 },
  planLoadedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, paddingVertical: 6 },
  planLoadedText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  addMoreRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 4 },
  addMoreBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: 12 },
  addMoreText: { color: C.accent, fontWeight: '600', fontSize: 13 },
  loadRoutineBtnSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 5, borderWidth: 1, borderColor: C.border, borderRadius: 12 },
  loadRoutineBtnSmallText: { color: C.accent, fontWeight: '600', fontSize: 13 },
  exerciseCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 12, overflow: 'hidden' },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: C.text, fontWeight: 'bold', fontSize: 16 },
  exerciseMuscle: { color: C.muted, fontSize: 12, marginTop: 2 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  tableHeaderText: { color: C.accent, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4, gap: 8 },
  setNumber: { width: 40, alignItems: 'center' },
  setNumberText: { color: C.muted, fontWeight: 'bold', fontSize: 14 },
  setInput: { flex: 1, backgroundColor: C.border, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, color: C.text, fontSize: 16, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: C.border },
  rpeInput: { width: 46, backgroundColor: C.border, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, color: C.text, fontSize: 14, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: C.border },
  rpeHigh: { borderColor: C.danger, backgroundColor: C.danger + '1A' },
  rpeMed: { borderColor: C.warning, backgroundColor: C.warning + '14' },
  removeSetBtn: { width: 30, alignItems: 'center' },
  addSetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 },
  addSetText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  setActionsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border },
  restTimerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4, borderLeftWidth: 1, borderLeftColor: C.border },
  restTimerBtnText: { color: C.warning, fontSize: 12, fontWeight: '600' },
  timerSection: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.accentSoft },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.card },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  modalClose: { color: C.accent, fontWeight: '600', fontSize: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.card, gap: 12 },
  modalItemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center' },
  modalItemText: { color: C.text, fontSize: 16, fontWeight: '500' },
  modalItemSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  dismissKeyboardBtn: { position: 'absolute', bottom: 20, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
});
