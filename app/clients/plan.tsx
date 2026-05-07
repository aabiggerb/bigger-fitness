import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, FlatList, TextInput, Keyboard, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ClientPlan, PlanExercise, WeekDay } from '../../src/types';
import { generateId } from '../../src/utils/generateId';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

const ALL_DAYS: { key: WeekDay; short: string }[] = [
  { key: 'lunes', short: 'L' },
  { key: 'martes', short: 'M' },
  { key: 'miércoles', short: 'X' },
  { key: 'jueves', short: 'J' },
  { key: 'viernes', short: 'V' },
  { key: 'sábado', short: 'S' },
  { key: 'domingo', short: 'D' },
];

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clients, routines, exercises, assignPlan, updatePlan, removePlan } = useAppData();
  const client = clients.find(c => c.id === id);

  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>(['lunes']);
  const [routineSearch, setRoutineSearch] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [editExerciseIndex, setEditExerciseIndex] = useState<number | null>(null);

  // Temp edit state for exercise
  const [tempSets, setTempSets] = useState('');
  const [tempReps, setTempReps] = useState('');
  const [tempRest, setTempRest] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempNotes, setTempNotes] = useState('');

  // Modal for adding exercise to plan
  const [showAddExercise, setShowAddExercise] = useState(false);

  // Time picker for scheduling a day
  const [timePickerCtx, setTimePickerCtx] = useState<{ planId: string; day: WeekDay } | null>(null);
  const [tempTime, setTempTime] = useState<Date>(() => {
    const d = new Date(); d.setHours(9, 0, 0, 0); return d;
  });

  // New plan day-time map (for assign modal)
  const [newPlanTimes, setNewPlanTimes] = useState<Partial<Record<WeekDay, string>>>({});
  const [assignTimePickerDay, setAssignTimePickerDay] = useState<WeekDay | null>(null);

  // Keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
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

  // ─── Helpers: time formatting + conflict detection ───
  const fmtTime = (hhmm: string) => hhmm; // already HH:mm
  const dateToHHMM = (d: Date) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };
  const hhmmToMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
    return h * 60 + m;
  };

  // Returns conflicts (other clients scheduled within ±60 min on same day)
  const findConflicts = (
    targetClientId: string,
    day: WeekDay,
    hhmm: string,
    ignorePlanId?: string,
  ): { clientName: string; time: string }[] => {
    const targetMin = hhmmToMinutes(hhmm);
    const out: { clientName: string; time: string }[] = [];
    for (const c of clients) {
      for (const p of c.plans) {
        if (!p.active) continue;
        if (ignorePlanId && p.id === ignorePlanId) continue;
        if (c.id === targetClientId && p.id === ignorePlanId) continue;
        if (!p.weekDays?.includes(day)) continue;
        const t = p.weekDayTimes?.[day];
        if (!t) continue;
        if (Math.abs(hhmmToMinutes(t) - targetMin) < 60) {
          out.push({ clientName: c.name, time: t });
        }
      }
    }
    return out;
  };

  const applyTimeToPlan = (planId: string, day: WeekDay, hhmm: string) => {
    const plan = client.plans.find(p => p.id === planId);
    if (!plan) return;
    const newTimes = { ...(plan.weekDayTimes || {}), [day]: hhmm };
    const newDays = plan.weekDays.includes(day) ? plan.weekDays : [...plan.weekDays, day];
    updatePlan(client.id, planId, {
      weekDays: newDays,
      daysPerWeek: newDays.length,
      weekDayTimes: newTimes,
    });
  };

  const confirmAndSetTime = (planId: string, day: WeekDay, hhmm: string) => {
    const conflicts = findConflicts(client.id, day, hhmm, planId);
    if (conflicts.length > 0) {
      const list = conflicts.map(c => `• ${c.clientName} a las ${c.time}`).join('\n');
      Alert.alert(
        'Conflicto de horario',
        `Ya tienes a otro cliente agendado cerca de las ${hhmm} el ${day}:\n\n${list}\n\n¿Agendar de todas formas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Agendar', onPress: () => applyTimeToPlan(planId, day, hhmm) },
        ],
      );
    } else {
      applyTimeToPlan(planId, day, hhmm);
    }
  };

  // ─── Assign new plan (copy from routine template) ───
  const handleAssignRoutine = (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const planExercises: PlanExercise[] = routine.exercises.map(re => ({
      exerciseId: re.exerciseId,
      sets: re.sets,
      reps: re.reps,
      restSeconds: re.restSeconds,
      weight: re.weight,
      notes: re.notes,
    }));

    const plan: ClientPlan = {
      id: generateId(),
      clientId: client.id,
      routineId,
      templateName: routine.name,
      exercises: planExercises,
      assignedDate: new Date().toISOString(),
      startDate: new Date().toISOString().split('T')[0],
      daysPerWeek: selectedDays.length,
      weekDays: [...selectedDays],
      weekDayTimes: { ...newPlanTimes },
      notes: '',
      active: true,
    };

    // Check conflicts before assigning
    const allConflicts: string[] = [];
    selectedDays.forEach(d => {
      const t = newPlanTimes[d];
      if (!t) return;
      const cs = findConflicts(client.id, d, t);
      cs.forEach(c => allConflicts.push(`• ${d} ${t} — ${c.clientName} (${c.time})`));
    });

    const doAssign = () => {
      assignPlan(client.id, plan);
      setShowAssignModal(false);
      setSelectedDays(['lunes']);
      setNewPlanTimes({});
      Alert.alert('Plan Asignado', `"${routine.name}" copiado como plan personalizado para ${client.name}.`);
    };

    if (allConflicts.length > 0) {
      Alert.alert(
        'Conflictos de horario',
        `Hay choques con otros clientes:\n\n${allConflicts.join('\n')}\n\n¿Agendar de todas formas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Agendar', onPress: doAssign },
        ],
      );
    } else {
      doAssign();
    }
  };

  const handleRemovePlan = (planId: string) => {
    Alert.alert('Eliminar Plan', '¿Deseas eliminar este plan?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        removePlan(client.id, planId);
        if (editingPlanId === planId) setEditingPlanId(null);
      }},
    ]);
  };

  const toggleDay = (day: WeekDay) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // ─── Editing plan ───
  const editingPlan = editingPlanId
    ? client.plans.find(p => p.id === editingPlanId)
    : null;

  const togglePlanDay = (planId: string, day: WeekDay) => {
    const plan = client.plans.find(p => p.id === planId);
    if (!plan) return;
    const currentDays = plan.weekDays || [];
    const isAdding = !currentDays.includes(day);
    const newDays = isAdding
      ? [...currentDays, day]
      : currentDays.filter(d => d !== day);
    const newTimes = { ...(plan.weekDayTimes || {}) };
    if (!isAdding) delete newTimes[day];
    updatePlan(client.id, planId, {
      weekDays: newDays,
      daysPerWeek: newDays.length,
      weekDayTimes: newTimes,
    });
    if (isAdding) {
      // Open time picker right after adding
      const d = new Date(); d.setHours(9, 0, 0, 0);
      setTempTime(d);
      setTimePickerCtx({ planId, day });
    }
  };

  const openTimePicker = (planId: string, day: WeekDay) => {
    const plan = client.plans.find(p => p.id === planId);
    const existing = plan?.weekDayTimes?.[day];
    const d = new Date();
    if (existing) {
      const [h, m] = existing.split(':').map(n => parseInt(n, 10));
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    setTempTime(d);
    setTimePickerCtx({ planId, day });
  };

  const onTimePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      const ctx = timePickerCtx;
      setTimePickerCtx(null);
      if (event.type === 'set' && selected && ctx) {
        confirmAndSetTime(ctx.planId, ctx.day, dateToHHMM(selected));
      }
    } else if (selected) {
      setTempTime(selected);
    }
  };

  const confirmIosTime = () => {
    if (!timePickerCtx) return;
    confirmAndSetTime(timePickerCtx.planId, timePickerCtx.day, dateToHHMM(tempTime));
    setTimePickerCtx(null);
  };

  const openEditExercise = (planId: string, idx: number) => {
    const plan = client.plans.find(p => p.id === planId);
    if (!plan || !plan.exercises) return;
    const ex = plan.exercises[idx];
    setEditingPlanId(planId);
    setEditExerciseIndex(idx);
    setTempSets(String(ex.sets));
    setTempReps(ex.reps || '');
    setTempRest(ex.restSeconds ? String(ex.restSeconds) : '');
    setTempWeight(ex.weight ? String(ex.weight) : '');
    setTempNotes(ex.notes || '');
    setShowEditExerciseModal(true);
  };

  const saveEditExercise = () => {
    if (!editingPlanId || editExerciseIndex === null) return;
    const plan = client.plans.find(p => p.id === editingPlanId);
    if (!plan || !plan.exercises) return;

    const updatedExercises = [...plan.exercises];
    updatedExercises[editExerciseIndex] = {
      ...updatedExercises[editExerciseIndex],
      sets: parseInt(tempSets) || 1,
      reps: tempReps || undefined,
      restSeconds: parseInt(tempRest) || undefined,
      weight: parseFloat(tempWeight) || undefined,
      notes: tempNotes || undefined,
    };

    updatePlan(client.id, editingPlanId, { exercises: updatedExercises });
    setShowEditExerciseModal(false);
    setEditExerciseIndex(null);
  };

  const removeExerciseFromPlan = (planId: string, idx: number) => {
    const plan = client.plans.find(p => p.id === planId);
    if (!plan || !plan.exercises) return;
    const updated = plan.exercises.filter((_, i) => i !== idx);
    updatePlan(client.id, planId, { exercises: updated });
  };

  const addExerciseToPlan = (planId: string, exerciseId: string) => {
    const plan = client.plans.find(p => p.id === planId);
    if (!plan) return;
    const currentExercises = plan.exercises || [];
    const newEx: PlanExercise = {
      exerciseId,
      sets: 3,
      reps: '10-12',
      restSeconds: 90,
    };
    updatePlan(client.id, planId, { exercises: [...currentExercises, newEx] });
    setShowAddExercise(false);
  };

  const togglePlanActive = (planId: string) => {
    const plan = client.plans.find(p => p.id === planId);
    if (!plan) return;
    updatePlan(client.id, planId, { active: !plan.active });
  };

  const activePlans = client.plans.filter(p => p.active);
  const inactivePlans = client.plans.filter(p => !p.active);

  const renderPlanCard = (plan: ClientPlan, isActive: boolean) => {
    const isEditing = editingPlanId === plan.id;
    const planExercises = plan.exercises || [];
    const planWeekDays = plan.weekDays || [];

    return (
      <View key={plan.id} style={[s.planCard, !isActive && s.planCardInactive]}>
        {/* Header */}
        <View style={s.planHeader}>
          <View style={s.planTitleRow}>
            <Ionicons name="fitness" size={22} color={isActive ? C.accent : C.muted} />
            <View style={{ flex: 1 }}>
              <Text style={s.planName}>{plan.templateName || plan.notes || 'Plan'}</Text>
              <Text style={s.planTemplate}>
                Plantilla: {routines.find(r => r.id === plan.routineId)?.name || 'Original'}
              </Text>
            </View>
          </View>
          <View style={s.planActions}>
            <TouchableOpacity
              onPress={() => setEditingPlanId(isEditing ? null : plan.id)}
              style={[s.planActionBtn, isEditing && s.planActionBtnActive]}
            >
              <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={18} color={isEditing ? C.bg : C.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => togglePlanActive(plan.id)} style={s.planActionBtn}>
              <Ionicons name={plan.active ? 'pause' : 'play'} size={16} color={plan.active ? C.warning : C.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemovePlan(plan.id)} style={s.planActionBtn}>
              <Ionicons name="trash-outline" size={16} color={C.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Row */}
        <View style={s.planInfo}>
          <View style={s.planInfoItem}>
            <Ionicons name="calendar-outline" size={14} color={C.muted} />
            <Text style={s.planInfoText}>{planWeekDays.length || plan.daysPerWeek} días/semana</Text>
          </View>
          <View style={s.planInfoItem}>
            <Ionicons name="time-outline" size={14} color={C.muted} />
            <Text style={s.planInfoText}>
              Desde {new Date(plan.startDate).toLocaleDateString('es-CL')}
            </Text>
          </View>
        </View>

        {/* Week Days */}
        <View style={s.weekDaysRow}>
          {ALL_DAYS.map(({ key, short }) => {
            const isSelected = planWeekDays.includes(key);
            const time = plan.weekDayTimes?.[key];
            return (
              <TouchableOpacity
                key={key}
                style={[s.weekDayChip, isSelected && s.weekDayChipActive]}
                onPress={() => {
                  if (!isEditing) return;
                  if (isSelected) {
                    openTimePicker(plan.id, key);
                  } else {
                    togglePlanDay(plan.id, key);
                  }
                }}
                onLongPress={() => isEditing && isSelected && togglePlanDay(plan.id, key)}
                disabled={!isEditing}
                activeOpacity={isEditing ? 0.7 : 1}
              >
                <Text style={[s.weekDayText, isSelected && s.weekDayTextActive]}>
                  {short}
                </Text>
                {isSelected && time && (
                  <Text style={[s.weekDayTime, isSelected && s.weekDayTimeActive]}>{time}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isEditing && (
          <View style={s.editHint}>
            <Ionicons name="information-circle" size={14} color={C.accent} />
            <Text style={s.editHintText}>
              Toca un día activo para fijar hora • Mantén presionado para quitarlo
            </Text>
          </View>
        )}

        {/* Exercises */}
        <View style={s.exerciseList}>
          <Text style={s.exerciseListTitle}>
            Ejercicios ({planExercises.length})
          </Text>
          {planExercises.map((pe, idx) => (
            <View key={idx} style={s.exerciseItem}>
              <View style={s.exerciseNumber}>
                <Text style={s.exerciseNumberText}>{idx + 1}</Text>
              </View>
              <TouchableOpacity
                style={s.exerciseInfoTouch}
                onPress={() => isEditing && openEditExercise(plan.id, idx)}
                activeOpacity={isEditing ? 0.6 : 1}
              >
                <Text style={s.exerciseName}>{getExerciseName(pe.exerciseId)}</Text>
                <Text style={s.exerciseDetail}>
                  {pe.sets} series × {pe.reps || '?'} reps
                  {pe.restSeconds ? ` • ${pe.restSeconds}s desc.` : ''}
                  {pe.weight ? ` • ${pe.weight}kg` : ''}
                </Text>
                {pe.notes ? <Text style={s.exerciseNotes}>📝 {pe.notes}</Text> : null}
              </TouchableOpacity>
              {isEditing && (
                <View style={s.exerciseEditActions}>
                  <TouchableOpacity onPress={() => openEditExercise(plan.id, idx)}>
                    <Ionicons name="create-outline" size={16} color={C.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeExerciseFromPlan(plan.id, idx)}>
                    <Ionicons name="close-circle" size={16} color={C.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {isEditing && (
            <TouchableOpacity
              style={s.addExBtn}
              onPress={() => {
                setEditingPlanId(plan.id);
                setShowAddExercise(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={C.accent} />
              <Text style={s.addExText}>Agregar Ejercicio</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Plan de Entrenamiento</Text>
        <TouchableOpacity onPress={() => setShowAssignModal(true)} style={s.headerBtn}>
          <Ionicons name="add" size={24} color={C.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activePlans.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Planes Activos</Text>
            {activePlans.map(plan => renderPlanCard(plan, true))}
          </View>
        )}

        {client.plans.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="clipboard-outline" size={48} color={C.border} />
            <Text style={s.emptyText}>Sin planes asignados</Text>
            <Text style={s.emptySubtext}>
              Asigna una rutina como plantilla. Luego podrás personalizarla sin afectar la original.
            </Text>
            <TouchableOpacity onPress={() => setShowAssignModal(true)}>
              <Text style={s.emptyAction}>Asignar primera rutina</Text>
            </TouchableOpacity>
          </View>
        )}

        {inactivePlans.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Planes Pausados</Text>
            {inactivePlans.map(plan => renderPlanCard(plan, false))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Assign Routine Modal ─── */}
      <Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Asignar Rutina (Plantilla)</Text>
                <TouchableOpacity onPress={() => { setRoutineSearch(''); setShowAssignModal(false); }}>
                  <Text style={s.closeText}>Cerrar</Text>
                </TouchableOpacity>
              </View>

              <View style={s.dayPickerSection}>
                <Text style={s.dayPickerLabel}>Selecciona los días de entrenamiento:</Text>
                <View style={s.dayPickerRow}>
                  {ALL_DAYS.map(({ key, short }) => {
                    const sel = selectedDays.includes(key);
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[s.dayPickerBtn, sel && s.dayPickerBtnActive]}
                        onPress={() => toggleDay(key)}
                      >
                        <Text style={[s.dayPickerBtnText, sel && s.dayPickerBtnTextActive]}>
                          {short}
                        </Text>
                        <Text style={[s.dayPickerBtnName, sel && { color: C.bg }]}>
                          {key.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={s.dayPickerInfo}>
                  {selectedDays.length} día{selectedDays.length !== 1 ? 's' : ''} seleccionado{selectedDays.length !== 1 ? 's' : ''}
                </Text>

                {selectedDays.length > 0 && (
                  <View style={s.assignTimesWrap}>
                    <Text style={s.assignTimesLabel}>Hora por día (opcional):</Text>
                    <View style={s.assignTimesGrid}>
                      {selectedDays.map(day => {
                        const t = newPlanTimes[day];
                        return (
                          <TouchableOpacity
                            key={day}
                            style={s.assignTimeChip}
                            onPress={() => setAssignTimePickerDay(day)}
                          >
                            <Ionicons name="time-outline" size={12} color={C.accent} />
                            <Text style={s.assignTimeChipText}>
                              {day.slice(0, 3)} {t || '— : —'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Search bar */}
              <View style={s.routineSearchWrap}>
                <Ionicons name="search" size={16} color={C.muted} />
                <TextInput
                  style={s.routineSearchInput}
                  placeholder="Buscar rutina..."
                  placeholderTextColor={C.muted}
                  value={routineSearch}
                  onChangeText={setRoutineSearch}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {routineSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setRoutineSearch('')}>
                    <Ionicons name="close-circle" size={18} color={C.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>

          {routines.length === 0 ? (
            <View style={s.emptyModal}>
              <Text style={s.emptyText}>No hay rutinas disponibles.</Text>
              <Text style={s.emptySubtext}>Crea una rutina primero en la pestaña de Rutinas.</Text>
            </View>
          ) : (
            <FlatList
              data={routines.filter(r => {
                if (!routineSearch.trim()) return true;
                const q = routineSearch.toLowerCase();
                return r.name.toLowerCase().includes(q)
                  || (r.description || '').toLowerCase().includes(q);
              })}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={s.emptyModal}>
                  <Ionicons name="search-outline" size={40} color={C.muted} />
                  <Text style={s.emptyText}>Sin resultados para "{routineSearch}"</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.routineItem}
                  onPress={() => {
                    if (selectedDays.length === 0) {
                      Alert.alert('Error', 'Selecciona al menos un día de la semana.');
                      return;
                    }
                    handleAssignRoutine(item.id);
                  }}
                >
                  <View style={s.routineItemHeader}>
                    <Ionicons name="fitness" size={20} color={C.accent} />
                    <Text style={s.routineItemName}>{item.name}</Text>
                  </View>
                  {item.description && (
                    <Text style={s.routineItemDesc}>{item.description}</Text>
                  )}
                  <Text style={s.routineItemInfo}>
                    {item.exercises.length} ejercicios • Se copiará como plan editable
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* ─── Edit Exercise Modal ─── */}
      <Modal visible={showEditExerciseModal} animationType="fade" transparent>
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView style={s.editOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.editModal}>
              <Text style={s.editModalTitle}>Editar Ejercicio</Text>
            {editExerciseIndex !== null && editingPlan && editingPlan.exercises && (
              <Text style={s.editModalSubtitle}>
                {getExerciseName(editingPlan.exercises[editExerciseIndex]?.exerciseId)}
              </Text>
            )}

            <View style={s.editRow}>
              <View style={s.editField}>
                <Text style={s.editLabel}>Series</Text>
                <TextInput
                  style={s.editInput}
                  value={tempSets}
                  onChangeText={setTempSets}
                  keyboardType="number-pad"
                  placeholder="4"
                  placeholderTextColor={C.border}
                />
              </View>
              <View style={s.editField}>
                <Text style={s.editLabel}>Reps</Text>
                <TextInput
                  style={s.editInput}
                  value={tempReps}
                  onChangeText={setTempReps}
                  placeholder="10-12"
                  placeholderTextColor={C.border}
                />
              </View>
            </View>

            <View style={s.editRow}>
              <View style={s.editField}>
                <Text style={s.editLabel}>Descanso (s)</Text>
                <TextInput
                  style={s.editInput}
                  value={tempRest}
                  onChangeText={setTempRest}
                  keyboardType="number-pad"
                  placeholder="90"
                  placeholderTextColor={C.border}
                />
              </View>
              <View style={s.editField}>
                <Text style={s.editLabel}>Peso (kg)</Text>
                <TextInput
                  style={s.editInput}
                  value={tempWeight}
                  onChangeText={setTempWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.border}
                />
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={s.editLabel}>Notas</Text>
              <TextInput
                style={[s.editInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={tempNotes}
                onChangeText={setTempNotes}
                multiline
                placeholder="Instrucciones especiales..."
                placeholderTextColor={C.border}
              />
            </View>

            <View style={s.editBtnRow}>
              <TouchableOpacity
                style={s.editCancelBtn}
                onPress={() => { setShowEditExerciseModal(false); setEditExerciseIndex(null); }}
              >
                <Text style={s.editCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editSaveBtn} onPress={saveEditExercise}>
                <Text style={s.editSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        {keyboardVisible && (
          <TouchableOpacity 
            style={s.dismissKeyboardBtn} 
            onPress={() => Keyboard.dismiss()} 
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={24} color={C.bg} />
          </TouchableOpacity>
        )}
        </View>
      </Modal>

      {/* ─── Add Exercise to Plan Modal ─── */}
      <Modal visible={showAddExercise} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Agregar Ejercicio</Text>
            <TouchableOpacity onPress={() => setShowAddExercise(false)}>
              <Text style={s.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={exercises}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.routineItem}
                onPress={() => editingPlanId && addExerciseToPlan(editingPlanId, item.id)}
              >
                <View style={s.routineItemHeader}>
                  <Ionicons name="barbell-outline" size={20} color={C.accent} />
                  <Text style={s.routineItemName}>{item.name}</Text>
                </View>
                <Text style={s.routineItemInfo}>{item.muscleGroup.join(', ')}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ─── Time Picker for plan day (edit mode) ─── */}
      {timePickerCtx && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="fade">
          <View style={s.timePickerOverlay}>
            <View style={s.timePickerCard}>
              <Text style={s.timePickerTitle}>Hora del entrenamiento</Text>
              <Text style={s.timePickerSub}>{timePickerCtx.day}</Text>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={onTimePickerChange}
                themeVariant="dark"
                style={{ alignSelf: 'stretch' }}
              />
              <View style={s.editBtnRow}>
                <TouchableOpacity
                  style={s.editCancelBtn}
                  onPress={() => setTimePickerCtx(null)}
                >
                  <Text style={s.editCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editSaveBtn} onPress={confirmIosTime}>
                  <Text style={s.editSaveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {timePickerCtx && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour
          display="default"
          onChange={onTimePickerChange}
        />
      )}

      {/* ─── Time Picker for assign-modal day ─── */}
      {assignTimePickerDay && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="fade">
          <View style={s.timePickerOverlay}>
            <View style={s.timePickerCard}>
              <Text style={s.timePickerTitle}>Hora del entrenamiento</Text>
              <Text style={s.timePickerSub}>{assignTimePickerDay}</Text>
              <DateTimePicker
                value={(() => {
                  const t = newPlanTimes[assignTimePickerDay];
                  const d = new Date();
                  if (t) {
                    const [h, m] = t.split(':').map(n => parseInt(n, 10));
                    d.setHours(h, m, 0, 0);
                  } else {
                    d.setHours(9, 0, 0, 0);
                  }
                  return d;
                })()}
                mode="time"
                display="spinner"
                themeVariant="dark"
                style={{ alignSelf: 'stretch' }}
                onChange={(_e, sel) => {
                  if (sel) setTempTime(sel);
                }}
              />
              <View style={s.editBtnRow}>
                <TouchableOpacity
                  style={s.editCancelBtn}
                  onPress={() => setAssignTimePickerDay(null)}
                >
                  <Text style={s.editCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.editSaveBtn}
                  onPress={() => {
                    const day = assignTimePickerDay;
                    if (!day) return;
                    const hhmm = dateToHHMM(tempTime);
                    setNewPlanTimes(prev => ({ ...prev, [day]: hhmm }));
                    setAssignTimePickerDay(null);
                  }}
                >
                  <Text style={s.editSaveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {assignTimePickerDay && Platform.OS === 'android' && (
        <DateTimePicker
          value={(() => {
            const t = newPlanTimes[assignTimePickerDay];
            const d = new Date();
            if (t) {
              const [h, m] = t.split(':').map(n => parseInt(n, 10));
              d.setHours(h, m, 0, 0);
            } else {
              d.setHours(9, 0, 0, 0);
            }
            return d;
          })()}
          mode="time"
          is24Hour
          display="default"
          onChange={(event, selected) => {
            const day = assignTimePickerDay;
            setAssignTimePickerDay(null);
            if (event.type === 'set' && selected && day) {
              setNewPlanTimes(prev => ({ ...prev, [day]: dateToHHMM(selected) }));
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  errorText: { color: C.danger, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: C.text, marginBottom: 12 },
  planCard: { backgroundColor: C.card, borderRadius: 14, marginBottom: 14, overflow: 'hidden', borderLeftWidth: 3, borderLeftColor: C.accent },
  planCardInactive: { opacity: 0.6, borderLeftColor: C.muted },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  planName: { color: C.text, fontWeight: 'bold', fontSize: 16 },
  planTemplate: { color: C.muted, fontSize: 11, marginTop: 2 },
  planActions: { flexDirection: 'row', gap: 4 },
  planActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center' },
  planActionBtnActive: { backgroundColor: C.accent },
  planInfo: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, marginBottom: 10 },
  planInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planInfoText: { color: C.muted, fontSize: 12 },
  weekDaysRow: { flexDirection: 'row', paddingHorizontal: 14, gap: 6, marginBottom: 8 },
  weekDayChip: { flex: 1, minHeight: 32, paddingVertical: 4, borderRadius: 8, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  weekDayChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  weekDayText: { color: C.muted, fontSize: 12, fontWeight: '700' },
  weekDayTextActive: { color: C.bg },
  weekDayTime: { color: C.muted, fontSize: 9, fontWeight: '600', marginTop: 1, fontVariant: ['tabular-nums'] },
  weekDayTimeActive: { color: C.bg },
  assignTimesWrap: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  assignTimesLabel: { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  assignTimesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  assignTimeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent },
  assignTimeChipText: { color: C.accent, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  timePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 24 },
  timePickerCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  timePickerTitle: { color: C.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  timePickerSub: { color: C.accent, fontSize: 13, textAlign: 'center', marginTop: 2, marginBottom: 8, textTransform: 'capitalize' },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, marginBottom: 8, backgroundColor: C.accentDim, paddingVertical: 6, marginHorizontal: 10, borderRadius: 8 },
  editHintText: { color: C.accent, fontSize: 11, flex: 1 },
  exerciseList: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  exerciseListTitle: { color: C.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  exerciseItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  exerciseNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  exerciseNumberText: { color: C.accent, fontWeight: 'bold', fontSize: 12 },
  exerciseInfoTouch: { flex: 1 },
  exerciseName: { color: C.text, fontSize: 14, fontWeight: '500' },
  exerciseDetail: { color: C.muted, fontSize: 12, marginTop: 2 },
  exerciseNotes: { color: C.warning, fontSize: 11, marginTop: 2 },
  exerciseEditActions: { flexDirection: 'row', gap: 10 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: 8, marginTop: 4 },
  addExText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  emptyCard: { marginHorizontal: 16, backgroundColor: C.card, padding: 40, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyText: { color: C.muted, fontSize: 14 },
  emptySubtext: { color: C.muted, fontSize: 12, textAlign: 'center' },
  emptyAction: { color: C.accent, fontSize: 14, fontWeight: '600', marginTop: 8 },
  emptyModal: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  modalContainer: { flex: 1, backgroundColor: C.bg, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  closeText: { color: C.accent, fontSize: 16 },
  dayPickerSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  dayPickerLabel: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  dayPickerRow: { flexDirection: 'row', gap: 6 },
  dayPickerBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  dayPickerBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  dayPickerBtnText: { color: C.text, fontWeight: 'bold', fontSize: 16 },
  dayPickerBtnTextActive: { color: C.bg },
  dayPickerBtnName: { color: C.muted, fontSize: 9, marginTop: 2, textTransform: 'capitalize' },
  dayPickerInfo: { color: C.muted, fontSize: 12, marginTop: 10, textAlign: 'center' },
  routineSearchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  routineSearchInput: {
    flex: 1, color: C.text, fontSize: 15, padding: 0,
  },
  routineItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.card },
  routineItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  routineItemName: { color: C.text, fontSize: 16, fontWeight: '600' },
  routineItemDesc: { color: C.muted, fontSize: 13, marginLeft: 28, marginBottom: 4 },
  routineItemInfo: { color: C.accent, fontSize: 12, fontWeight: '600', marginLeft: 28 },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 },
  editModal: { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  editModalTitle: { color: C.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  editModalSubtitle: { color: C.accent, fontSize: 14, marginBottom: 16 },
  editRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  editField: { flex: 1 },
  editLabel: { color: C.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  editInput: { backgroundColor: C.border, padding: 12, borderRadius: 8, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  editBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  editCancelText: { color: C.muted, fontWeight: '600' },
  editSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center' },
  editSaveText: { color: C.bg, fontWeight: 'bold' },
  dismissKeyboardBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accent,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
});
