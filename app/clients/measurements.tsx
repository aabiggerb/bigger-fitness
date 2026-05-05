import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Measurement } from '../../src/types';
import { generateId } from '../../src/utils/generateId';
import { calculateBMI, getBMICategory } from '../../src/utils/bmi';
import { TrendChart } from '../../src/components/TrendChart';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

export default function MeasurementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clients, addMeasurement, deleteMeasurement } = useAppData();
  const client = clients.find(c => c.id === id);

  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [biceps, setBiceps] = useState('');
  const [quadriceps, setQuadriceps] = useState('');
  const [notes, setNotes] = useState('');

  if (!client) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Cliente no encontrado</Text>
      </SafeAreaView>
    );
  }

  const resetForm = () => {
    setWeight(''); setBodyFat(''); setChest(''); setWaist(''); setHips(''); setBiceps(''); setQuadriceps(''); setNotes('');
  };

  const handleSave = () => {
    if (!weight) {
      Alert.alert('Error', 'El peso es obligatorio.');
      return;
    }

    const weightVal = parseFloat(weight);
    const bmi = client.height ? calculateBMI(weightVal, client.height) : undefined;

    const measurement: Measurement = {
      id: generateId(),
      date: new Date().toISOString(),
      weight: weightVal,
      bodyFatPercentage: bodyFat ? parseFloat(bodyFat) : undefined,
      bmi,
      chest: chest ? parseFloat(chest) : undefined,
      waist: waist ? parseFloat(waist) : undefined,
      hips: hips ? parseFloat(hips) : undefined,
      biceps: biceps ? parseFloat(biceps) : undefined,
      quadriceps: quadriceps ? parseFloat(quadriceps) : undefined,
      notes: notes || undefined,
    };

    addMeasurement(client.id, measurement);
    resetForm();
    setShowForm(false);
  };

  const handleDelete = (measurementId: string) => {
    Alert.alert('Eliminar', '¿Deseas eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMeasurement(client.id, measurementId) },
    ]);
  };

  const sortedMeasurements = [...client.measurements].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate progress
  const getProgress = () => {
    if (client.measurements.length < 2) return null;
    const sorted = [...client.measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      weightDiff: (last.weight - first.weight).toFixed(1),
      isLoss: last.weight < first.weight,
    };
  };

  const progress = getProgress();

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Evaluación</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={s.headerBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={24} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* Progress Summary */}
      {progress && (
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Ionicons
              name={progress.isLoss ? 'trending-down' : 'trending-up'}
              size={28}
              color={progress.isLoss ? C.accent : C.danger}
            />
            <View>
              <Text style={s.progressValue}>
                {progress.isLoss ? '' : '+'}{progress.weightDiff} kg
              </Text>
              <Text style={s.progressLabel}>Progreso total</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Trend Charts */}
        {(() => {
          const chronological = [...client.measurements].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          if (chronological.length < 2) return null;

          const weightData = chronological.map(m => ({
            label: new Date(m.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
            value: m.weight,
          }));

          const fatData = chronological
            .filter(m => m.bodyFatPercentage !== undefined)
            .map(m => ({
              label: new Date(m.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
              value: m.bodyFatPercentage!,
            }));

          const bmiData = chronological
            .filter(m => m.bmi !== undefined)
            .map(m => ({
              label: new Date(m.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
              value: m.bmi!,
            }));

          return (
            <>
              <TrendChart data={weightData} title="Peso" unit="kg" color={C.accent} />
              {fatData.length >= 2 && (
                <TrendChart data={fatData} title="Grasa Corporal" unit="%" color={C.warning} />
              )}
              {bmiData.length >= 2 && (
                <TrendChart data={bmiData} title="IMC" unit="" color="#bb86fc" />
              )}
            </>
          );
        })()}
        {/* Add Form */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Nuevo Registro</Text>

            <View style={s.formRow}>
              <View style={s.formCol}>
                <Text style={s.label}>Peso (kg) *</Text>
                <TextInput
                  style={s.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="80.5"
                  placeholderTextColor={C.muted}
                />
              </View>
              <View style={s.formCol}>
                <Text style={s.label}>Grasa (%)</Text>
                <TextInput
                  style={s.input}
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  keyboardType="decimal-pad"
                  placeholder="22"
                  placeholderTextColor={C.muted}
                />
              </View>
            </View>

            <View style={s.formRow}>
              <View style={s.formCol}>
                <Text style={s.label}>Pecho (cm)</Text>
                <TextInput
                  style={s.input}
                  value={chest}
                  onChangeText={setChest}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor={C.muted}
                />
              </View>
              <View style={s.formCol}>
                <Text style={s.label}>Cintura (cm)</Text>
                <TextInput
                  style={s.input}
                  value={waist}
                  onChangeText={setWaist}
                  keyboardType="decimal-pad"
                  placeholder="85"
                  placeholderTextColor={C.muted}
                />
              </View>
              <View style={s.formCol}>
                <Text style={s.label}>Caderas (cm)</Text>
                <TextInput
                  style={s.input}
                  value={hips}
                  onChangeText={setHips}
                  keyboardType="decimal-pad"
                  placeholder="95"
                  placeholderTextColor={C.muted}
                />
              </View>
            </View>

            <View style={s.formRow}>
              <View style={s.formCol}>
                <Text style={s.label}>Bíceps (cm)</Text>
                <TextInput
                  style={s.input}
                  value={biceps}
                  onChangeText={setBiceps}
                  keyboardType="decimal-pad"
                  placeholder="35"
                  placeholderTextColor={C.muted}
                />
              </View>
              <View style={s.formCol}>
                <Text style={s.label}>Cuádriceps (cm)</Text>
                <TextInput
                  style={s.input}
                  value={quadriceps}
                  onChangeText={setQuadriceps}
                  keyboardType="decimal-pad"
                  placeholder="55"
                  placeholderTextColor={C.muted}
                />
              </View>
            </View>

            <Text style={s.label}>Notas</Text>
            <TextInput
              style={[s.input, { height: 60, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observaciones..."
              placeholderTextColor={C.muted}
              multiline
            />

            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={20} color={C.bg} />
              <Text style={s.saveBtnText}>Guardar Registro</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Measurements List */}
        {sortedMeasurements.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="scale-outline" size={48} color={C.border} />
            <Text style={s.emptyText}>Sin registros de medidas</Text>
            <TouchableOpacity onPress={() => setShowForm(true)}>
              <Text style={s.emptyAction}>Agregar primera medida</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedMeasurements.map((m, index) => {
            const prevMeasurement = index < sortedMeasurements.length - 1 ? sortedMeasurements[index + 1] : null;
            const weightChange = prevMeasurement ? m.weight - prevMeasurement.weight : 0;

            return (
              <View key={m.id} style={s.measureCard}>
                <View style={s.measureHeader}>
                  <View style={s.dateContainer}>
                    <Ionicons name="calendar-outline" size={16} color={C.accent} />
                    <Text style={s.dateText}>
                      {new Date(m.date).toLocaleDateString('es-CL', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(m.id)}>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>

                <View style={s.measureGrid}>
                  <View style={s.measureItem}>
                    <Text style={s.measureValue}>{m.weight} kg</Text>
                    <Text style={s.measureLabel}>Peso</Text>
                    {weightChange !== 0 && (
                      <Text style={[s.changeText, { color: weightChange < 0 ? C.accent : C.danger }]}>
                        {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                      </Text>
                    )}
                  </View>
                  {m.bodyFatPercentage !== undefined && (
                    <View style={s.measureItem}>
                      <Text style={s.measureValue}>{m.bodyFatPercentage}%</Text>
                      <Text style={s.measureLabel}>Grasa</Text>
                    </View>
                  )}
                  {m.chest !== undefined && (
                    <View style={s.measureItem}>
                      <Text style={s.measureValue}>{m.chest}</Text>
                      <Text style={s.measureLabel}>Pecho</Text>
                    </View>
                  )}
                  {m.waist !== undefined && (
                    <View style={s.measureItem}>
                      <Text style={s.measureValue}>{m.waist}</Text>
                      <Text style={s.measureLabel}>Cintura</Text>
                    </View>
                  )}
                  {m.hips !== undefined && (
                    <View style={s.measureItem}>
                      <Text style={s.measureValue}>{m.hips}</Text>
                      <Text style={s.measureLabel}>Caderas</Text>
                    </View>
                  )}
                  {m.biceps !== undefined && (
                    <View style={s.measureItem}>
                      <Text style={s.measureValue}>{m.biceps}</Text>
                      <Text style={s.measureLabel}>Bíceps</Text>
                    </View>
                  )}
                  {m.quadriceps !== undefined && (
                    <View style={s.measureItem}>
                      <Text style={s.measureValue}>{m.quadriceps}</Text>
                      <Text style={s.measureLabel}>Cuádriceps</Text>
                    </View>
                  )}
                  {m.bmi !== undefined && (
                    <View style={s.measureItem}>
                      <Text style={[s.measureValue, { color: getBMICategory(m.bmi).color }]}>{m.bmi}</Text>
                      <Text style={s.measureLabel}>IMC</Text>
                      <Text style={[s.changeText, { color: getBMICategory(m.bmi).color }]}>
                        {getBMICategory(m.bmi).label}
                      </Text>
                    </View>
                  )}
                </View>

                {m.notes ? (
                  <View style={s.notesRow}>
                    <Ionicons name="chatbubble-outline" size={14} color={C.muted} />
                    <Text style={s.notesText}>{m.notes}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
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
  progressCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, padding: 16, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: C.accent },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressValue: { color: C.text, fontSize: 20, fontWeight: 'bold' },
  progressLabel: { color: C.muted, fontSize: 12 },
  formCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, padding: 16, borderRadius: 12 },
  formTitle: { color: C.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  formCol: { flex: 1 },
  label: { color: C.accent, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.border, padding: 12, borderRadius: 8, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  saveBtn: { flexDirection: 'row', backgroundColor: C.accent, paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 },
  saveBtnText: { color: C.bg, fontWeight: 'bold', fontSize: 15 },
  emptyCard: { marginHorizontal: 16, backgroundColor: C.card, padding: 40, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyText: { color: C.muted, fontSize: 14 },
  emptyAction: { color: C.accent, fontSize: 14, fontWeight: '600', marginTop: 8 },
  measureCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, padding: 16, borderRadius: 12 },
  measureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: C.text, fontSize: 14, fontWeight: '500' },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  measureItem: { alignItems: 'center', minWidth: 60 },
  measureValue: { color: C.text, fontSize: 16, fontWeight: 'bold' },
  measureLabel: { color: C.muted, fontSize: 11, marginTop: 2 },
  changeText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  notesText: { color: C.muted, fontSize: 13, flex: 1 },
});
