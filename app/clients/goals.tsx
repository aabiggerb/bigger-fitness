import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ClientGoal } from '../../src/types';
import { generateId } from '../../src/utils/generateId';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

const GOAL_TYPES = [
  { key: 'weight_loss', label: 'Pérdida de peso', icon: 'trending-down' as const },
  { key: 'muscle_gain', label: 'Ganancia muscular', icon: 'fitness' as const },
  { key: 'maintenance', label: 'Mantenimiento', icon: 'swap-horizontal' as const },
  { key: 'endurance', label: 'Resistencia', icon: 'heart' as const },
  { key: 'flexibility', label: 'Flexibilidad', icon: 'body' as const },
  { key: 'other', label: 'Otro', icon: 'flag' as const },
];

export default function GoalsScreen() {
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clients, addGoal, updateGoal, deleteGoal, toggleGoalComplete } = useAppData();
  const client = clients.find(c => c.id === id);

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ClientGoal | null>(null);
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<string>('other');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState(new Date());

  if (!client) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Cliente no encontrado</Text>
      </SafeAreaView>
    );
  }

  const resetForm = () => {
    setDescription('');
    setSelectedType('other');
    setTargetValue('');
    setCurrentValue('');
    setDeadline('');
    setEditingGoal(null);
  };

  const handleSave = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'La descripción del objetivo es obligatoria.');
      return;
    }

    if (editingGoal) {
      updateGoal(client.id, editingGoal.id, {
        description: description.trim(),
        type: selectedType as ClientGoal['type'],
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        currentValue: currentValue ? parseFloat(currentValue) : undefined,
        deadline: deadline || undefined,
      });
    } else {
      const goal: ClientGoal = {
        id: generateId(),
        type: selectedType as ClientGoal['type'],
        description: description.trim(),
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        currentValue: currentValue ? parseFloat(currentValue) : undefined,
        deadline: deadline || undefined,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };
      addGoal(client.id, goal);
    }

    resetForm();
    setShowForm(false);
  };

  const handleEdit = (goal: ClientGoal) => {
    setEditingGoal(goal);
    setDescription(goal.description);
    setSelectedType(goal.type);
    setTargetValue(goal.targetValue?.toString() || '');
    setCurrentValue(goal.currentValue?.toString() || '');
    setDeadline(goal.deadline || '');
    if (goal.deadline) {
      setDeadlineDate(new Date(goal.deadline));
    }
    setShowForm(true);
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert('Eliminar Objetivo', '¿Deseas eliminar este objetivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteGoal(client.id, goalId) },
    ]);
  };

  const completedGoals = client.goals.filter(g => g.isCompleted);
  const activeGoals = client.goals.filter(g => !g.isCompleted);

  const getGoalIcon = (type: string) => {
    return GOAL_TYPES.find(t => t.key === type)?.icon || 'flag';
  };

  const getGoalLabel = (type: string) => {
    return GOAL_TYPES.find(t => t.key === type)?.label || 'Otro';
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Objetivos</Text>
        <TouchableOpacity
          onPress={() => { resetForm(); setShowForm(!showForm); }}
          style={s.headerBtn}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={24} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{activeGoals.length}</Text>
          <Text style={s.summaryLabel}>Activos</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: C.accent }]}>{completedGoals.length}</Text>
          <Text style={s.summaryLabel}>Completados</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{client.goals.length}</Text>
          <Text style={s.summaryLabel}>Total</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Add/Edit Form */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>
              {editingGoal ? 'Editar Objetivo' : 'Nuevo Objetivo'}
            </Text>

            {/* Goal Type Selector */}
            <Text style={s.label}>Tipo de Objetivo</Text>
            <View style={s.typeGrid}>
              {GOAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.typeBtn, selectedType === t.key && s.typeBtnActive]}
                  onPress={() => setSelectedType(t.key)}
                >
                  <Ionicons
                    name={t.icon}
                    size={18}
                    color={selectedType === t.key ? C.bg : C.muted}
                  />
                  <Text style={[s.typeBtnText, selectedType === t.key && s.typeBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Descripción *</Text>
            <TextInput
              style={s.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Ej. Perder 5kg antes del verano"
              placeholderTextColor={C.muted}
              multiline
            />

            <View style={s.formRow}>
              <View style={s.formCol}>
                <Text style={s.label}>Meta</Text>
                <TextInput
                  style={s.input}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  placeholder="Ej. 75"
                  placeholderTextColor={C.muted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={s.formCol}>
                <Text style={s.label}>Valor Actual</Text>
                <TextInput
                  style={s.input}
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  placeholder="Ej. 82"
                  placeholderTextColor={C.muted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={s.label}>Fecha Límite (opcional)</Text>
            <TouchableOpacity
              style={s.datePickerBtn}
              onPress={() => {
                if (deadline) {
                  setDeadlineDate(new Date(deadline));
                } else {
                  setDeadlineDate(new Date());
                }
                setShowDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={C.accent} />
              <Text style={[s.datePickerText, !deadline && { color: C.muted }]}>
                {deadline ? new Date(deadline).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Seleccionar fecha'}
              </Text>
              {deadline ? (
                <TouchableOpacity onPress={() => setDeadline('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={C.muted} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            {showDatePicker && (
              <View style={s.datePickerContainer}>
                <DateTimePicker
                  value={deadlineDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (event.type === 'set' && selectedDate) {
                      setDeadlineDate(selectedDate);
                      setDeadline(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                  textColor={C.text}
                  themeVariant="dark"
                  locale="es-CL"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={s.datePickerDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={s.datePickerDoneText}>Listo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={20} color={C.bg} />
              <Text style={s.saveBtnText}>
                {editingGoal ? 'Actualizar' : 'Crear Objetivo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>En Progreso</Text>
            {activeGoals.map(g => (
              <View key={g.id} style={s.goalCard}>
                <View style={s.goalHeader}>
                  <TouchableOpacity
                    onPress={() => toggleGoalComplete(client.id, g.id)}
                    style={s.checkBtn}
                  >
                    <Ionicons name="ellipse-outline" size={24} color={C.muted} />
                  </TouchableOpacity>
                  <View style={s.goalInfo}>
                    <Text style={s.goalText}>{g.description}</Text>
                    <View style={s.goalMeta}>
                      <Ionicons name={getGoalIcon(g.type)} size={14} color={C.accent} />
                      <Text style={s.goalMetaText}>{getGoalLabel(g.type)}</Text>
                      {g.targetValue && (
                        <Text style={s.goalMetaText}>• Meta: {g.targetValue}</Text>
                      )}
                    </View>
                  </View>
                  <View style={s.goalActions}>
                    <TouchableOpacity onPress={() => handleEdit(g)}>
                      <Ionicons name="create-outline" size={18} color={C.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteGoal(g.id)}>
                      <Ionicons name="trash-outline" size={18} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress Bar */}
                {g.targetValue && g.currentValue && (
                  <View style={s.progressContainer}>
                    <View style={s.progressBar}>
                      <View
                        style={[
                          s.progressFill,
                          { width: `${Math.min(100, Math.max(0, (g.currentValue / g.targetValue) * 100))}%` },
                        ]}
                      />
                    </View>
                    <Text style={s.progressText}>
                      {g.currentValue} / {g.targetValue}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {client.goals.length === 0 && !showForm && (
          <View style={s.emptyCard}>
            <Ionicons name="flag-outline" size={48} color={C.border} />
            <Text style={s.emptyText}>Sin objetivos definidos</Text>
            <TouchableOpacity onPress={() => setShowForm(true)}>
              <Text style={s.emptyAction}>Crear primer objetivo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Completados ✓</Text>
            {completedGoals.map(g => (
              <View key={g.id} style={[s.goalCard, s.goalCompleted]}>
                <View style={s.goalHeader}>
                  <TouchableOpacity
                    onPress={() => toggleGoalComplete(client.id, g.id)}
                    style={s.checkBtn}
                  >
                    <Ionicons name="checkmark-circle" size={24} color={C.accent} />
                  </TouchableOpacity>
                  <View style={s.goalInfo}>
                    <Text style={[s.goalText, s.goalTextCompleted]}>{g.description}</Text>
                    <Text style={s.goalMetaText}>{getGoalLabel(g.type)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteGoal(g.id)}>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  errorText: { color: C.danger, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: C.card, padding: 14, borderRadius: 12, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: 'bold', color: C.text },
  summaryLabel: { fontSize: 11, color: C.muted, marginTop: 2 },
  formCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, padding: 16, borderRadius: 12 },
  formTitle: { color: C.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  label: { color: C.accent, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: C.border },
  typeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  typeBtnText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  typeBtnTextActive: { color: C.bg },
  input: { backgroundColor: C.border, padding: 12, borderRadius: 8, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 10 },
  formCol: { flex: 1 },
  saveBtn: { flexDirection: 'row', backgroundColor: C.accent, paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { color: C.bg, fontWeight: 'bold', fontSize: 15 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: C.text, marginBottom: 12 },
  goalCard: { backgroundColor: C.card, padding: 16, borderRadius: 12, marginBottom: 10 },
  goalCompleted: { opacity: 0.7 },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkBtn: { marginTop: 2 },
  goalInfo: { flex: 1 },
  goalText: { color: C.text, fontSize: 15, fontWeight: '500', marginBottom: 4 },
  goalTextCompleted: { textDecorationLine: 'line-through', color: C.muted },
  goalMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalMetaText: { color: C.muted, fontSize: 12 },
  goalActions: { flexDirection: 'row', gap: 12 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: C.accent, borderRadius: 3 },
  progressText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  emptyCard: { marginHorizontal: 16, backgroundColor: C.card, padding: 40, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyText: { color: C.muted, fontSize: 14 },
  emptyAction: { color: C.accent, fontSize: 14, fontWeight: '600', marginTop: 8 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.border, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, marginBottom: 12, gap: 10 },
  datePickerText: { flex: 1, color: C.text, fontSize: 15 },
  datePickerContainer: { backgroundColor: C.card, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  datePickerDoneBtn: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  datePickerDoneText: { color: C.accent, fontWeight: '600', fontSize: 15 },
});
