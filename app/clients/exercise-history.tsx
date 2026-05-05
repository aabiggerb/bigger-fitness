import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 180;
const CHART_PADDING = 40;

export default function ExerciseHistoryScreen() {
  const { exerciseId, clientId } = useLocalSearchParams<{ exerciseId: string; clientId: string }>();
  const router = useRouter();
  const { exercises, clients, exerciseLogs, getLogsForExercise, deleteExerciseLog } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const exercise = exercises.find(e => e.id === exerciseId);
  const client = clients.find(c => c.id === clientId);
  const logs = useMemo(() => getLogsForExercise(exerciseId, clientId), [exerciseLogs, exerciseId, clientId]);

  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);

  if (!exercise) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Ejercicio no encontrado</Text>
      </SafeAreaView>
    );
  }

  // Calculate max weight per session for the chart
  const chartData = logs.map(log => {
    const maxWeight = Math.max(...log.sets.map(s => s.weight));
    const totalVolume = log.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const totalReps = log.sets.reduce((sum, s) => sum + s.reps, 0);
    return {
      date: log.date,
      maxWeight,
      totalVolume,
      totalReps,
      sets: log.sets,
      id: log.id,
    };
  });

  const maxWeight = chartData.length > 0 ? Math.max(...chartData.map(d => d.maxWeight)) : 0;
  const minWeight = chartData.length > 0 ? Math.min(...chartData.map(d => d.maxWeight)) : 0;

  // Use 0 as the chart floor so bars are proportional to absolute weight values.
  // This prevents small differences (e.g. 80 vs 82 kg) from looking disproportionate.
  const chartMin = 0;
  const chartMax = maxWeight > 0 ? maxWeight * 1.1 : 1; // 10% headroom
  const weightRange = chartMax - chartMin;

  // Stats
  const currentMax = chartData.length > 0 ? chartData[chartData.length - 1].maxWeight : 0;
  const previousMax = chartData.length > 1 ? chartData[chartData.length - 2].maxWeight : 0;
  const improvement = currentMax - previousMax;
  const totalSessions = logs.length;

  const pr = chartData.length > 0 ? Math.max(...chartData.map(d => d.maxWeight)) : 0;

  // Avg RPE across all sessions
  const allRpeSets = logs.flatMap(l => l.sets).filter(s => s.rpe != null && s.rpe > 0);
  const avgRpe = allRpeSets.length > 0
    ? Math.round(allRpeSets.reduce((sum, s) => sum + s.rpe!, 0) / allRpeSets.length * 10) / 10
    : null;

  const handleDeleteLog = (logId: string) => {
    Alert.alert('Eliminar Registro', '¿Seguro que deseas eliminar este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteExerciseLog(logId) },
    ]);
  };

  const chartWidth = SCREEN_WIDTH - 32 - CHART_PADDING;
  const barWidth = chartData.length > 0 ? Math.min(40, (chartWidth - 16) / chartData.length - 4) : 40;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{exercise.name}</Text>
          {client && <Text style={s.headerSubtitle}>{client.name}</Text>}
        </View>
        <View style={s.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="trophy" size={18} color={C.warning} />
            <Text style={s.statValue}>{pr}kg</Text>
            <Text style={s.statLabel}>Récord</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="trending-up" size={18} color={improvement >= 0 ? C.accent : C.danger} />
            <Text style={[s.statValue, { color: improvement >= 0 ? C.accent : C.danger }]}>
              {improvement >= 0 ? '+' : ''}{improvement}kg
            </Text>
            <Text style={s.statLabel}>Último Δ</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="calendar-outline" size={18} color={C.accent} />
            <Text style={s.statValue}>{totalSessions}</Text>
            <Text style={s.statLabel}>Sesiones</Text>
          </View>
          {avgRpe !== null && (
            <View style={s.statCard}>
              <Ionicons name="speedometer-outline" size={18} color={avgRpe >= 8 ? C.danger : avgRpe >= 6 ? C.warning : C.accent} />
              <Text style={[s.statValue, { color: avgRpe >= 8 ? C.danger : avgRpe >= 6 ? C.warning : C.accent }]}>{avgRpe}</Text>
              <Text style={s.statLabel}>RPE Prom</Text>
            </View>
          )}
        </View>

        {/* Chart */}
        {chartData.length > 0 ? (
          <View style={s.chartSection}>
            <Text style={s.sectionTitle}>Progresión de Peso Máximo</Text>
            <View style={s.chartContainer}>
              {/* Y-axis labels */}
              <View style={s.yAxis}>
                <Text style={s.yLabel}>{Math.round(chartMax)}kg</Text>
                <Text style={s.yLabel}>{Math.round(chartMax / 2)}kg</Text>
                <Text style={s.yLabel}>0kg</Text>
              </View>
              {/* Bars */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chartScroll}>
                <View style={s.barsContainer}>
                  {/* Grid lines */}
                  <View style={[s.gridLine, { top: 0 }]} />
                  <View style={[s.gridLine, { top: CHART_HEIGHT / 2 }]} />
                  <View style={[s.gridLine, { top: CHART_HEIGHT - 1 }]} />

                  {chartData.map((d, i) => {
                    const barHeight = (d.maxWeight / chartMax) * (CHART_HEIGHT - 10) + 10;
                    const isSelected = selectedLogIndex === i;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={s.barGroup}
                        onPress={() => setSelectedLogIndex(isSelected ? null : i)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.barWrapper, { height: CHART_HEIGHT }]}>
                          <View
                            style={[
                              s.bar,
                              {
                                height: barHeight,
                                width: barWidth,
                                backgroundColor: isSelected ? C.accent : C.accentSoft,
                                borderColor: isSelected ? C.accent : C.accentSoft,
                              },
                            ]}
                          />
                        </View>
                        {/* Weight label on top */}
                        <Text style={[s.barValue, isSelected && s.barValueActive]}>
                          {d.maxWeight}
                        </Text>
                        <Text style={s.barDate}>
                          {new Date(d.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Selected detail */}
            {selectedLogIndex !== null && chartData[selectedLogIndex] && (
              <View style={s.detailPopup}>
                <View style={s.detailHeader}>
                  <Text style={s.detailDate}>
                    {new Date(chartData[selectedLogIndex].date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedLogIndex(null)}>
                    <Ionicons name="close" size={18} color={C.muted} />
                  </TouchableOpacity>
                </View>
                <View style={s.detailStats}>
                  <View style={s.detailStat}>
                    <Text style={s.detailStatValue}>{chartData[selectedLogIndex].maxWeight}kg</Text>
                    <Text style={s.detailStatLabel}>Peso Máx</Text>
                  </View>
                  <View style={s.detailStat}>
                    <Text style={s.detailStatValue}>{chartData[selectedLogIndex].totalReps}</Text>
                    <Text style={s.detailStatLabel}>Reps Total</Text>
                  </View>
                  <View style={s.detailStat}>
                    <Text style={s.detailStatValue}>{chartData[selectedLogIndex].totalVolume.toLocaleString()}</Text>
                    <Text style={s.detailStatLabel}>Volumen</Text>
                  </View>
                </View>
                <View style={s.detailSets}>
                  {chartData[selectedLogIndex].sets.map((st, si) => (
                    <View key={si} style={s.detailSetRow}>
                      <Text style={s.detailSetLabel}>Serie {st.setNumber}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.detailSetValue}>{st.weight}kg × {st.reps} reps</Text>
                        {st.rpe != null && st.rpe > 0 && (
                          <View style={[s.rpeChip, {
                            backgroundColor: st.rpe >= 8 ? C.accentDim : st.rpe >= 6 ? C.accentDim : C.accentSoft
                          }]}>
                            <Text style={[s.rpeChipText, {
                              color: st.rpe >= 8 ? C.danger : st.rpe >= 6 ? C.warning : C.accent
                            }]}>{st.rpe}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={s.emptyChart}>
            <Ionicons name="bar-chart-outline" size={48} color={C.border} />
            <Text style={s.emptyText}>Sin registros aún</Text>
            <Text style={s.emptySubtext}>Los pesos registrados aparecerán aquí</Text>
          </View>
        )}

        {/* History List */}
        <View style={s.historySection}>
          <Text style={s.sectionTitle}>Historial Completo</Text>
          {logs.slice().reverse().map((log, i) => {
            const maxW = Math.max(...log.sets.map(st => st.weight));
            const totalVol = log.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
            const isPR = maxW === pr;
            return (
              <View key={log.id} style={s.historyCard}>
                <View style={s.historyHeader}>
                  <View style={s.historyDateRow}>
                    {isPR && (
                      <View style={s.prBadge}>
                        <Text style={s.prText}>PR</Text>
                      </View>
                    )}
                    <Text style={s.historyDate}>
                      {new Date(log.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteLog(log.id)}>
                    <Ionicons name="trash-outline" size={16} color={C.danger} />
                  </TouchableOpacity>
                </View>

                <View style={s.historySetsContainer}>
                  {log.sets.map((st, si) => (
                    <View key={si} style={s.historySetPill}>
                      <Text style={s.historySetWeight}>{st.weight}kg</Text>
                      <Text style={s.historySetReps}>×{st.reps}</Text>
                      {st.rpe != null && st.rpe > 0 && (
                        <Text style={[s.historySetRpe, {
                          color: st.rpe >= 8 ? C.danger : st.rpe >= 6 ? C.warning : C.accent
                        }]}>@{st.rpe}</Text>
                      )}
                    </View>
                  ))}
                </View>

                <View style={s.historyFooter}>
                  <Text style={s.historyVolume}>Vol: {totalVol.toLocaleString()}kg</Text>
                  {(() => {
                    const rSets = log.sets.filter(st => st.rpe != null && st.rpe > 0);
                    if (rSets.length === 0) return null;
                    const avg = Math.round(rSets.reduce((sum, st) => sum + st.rpe!, 0) / rSets.length * 10) / 10;
                    return (
                      <Text style={[s.historyRpe, {
                        color: avg >= 8 ? C.danger : avg >= 6 ? C.warning : C.accent
                      }]}>RPE {avg}</Text>
                    );
                  })()}
                  <Text style={s.historyMaxW}>Máx: {maxW}kg</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  errorText: { color: C.danger, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8, width: 40 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  headerSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.card, padding: 14, borderRadius: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: C.text },
  statLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase' },
  chartSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: C.text, marginBottom: 12 },
  chartContainer: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 12, overflow: 'hidden' },
  yAxis: { width: CHART_PADDING - 8, justifyContent: 'space-between', paddingVertical: 4, height: CHART_HEIGHT },
  yLabel: { color: C.muted, fontSize: 9, textAlign: 'right' },
  chartScroll: { flex: 1 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 40, paddingBottom: 40, gap: 4, paddingHorizontal: 4, position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.accentDim },
  barGroup: { alignItems: 'center', minWidth: 44 },
  barWrapper: { justifyContent: 'flex-end', alignItems: 'center' },
  bar: { borderRadius: 4, borderWidth: 1, minHeight: 20 },
  barValue: { color: C.muted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  barValueActive: { color: C.accent },
  barDate: { color: C.muted, fontSize: 8, marginTop: 2 },
  detailPopup: { backgroundColor: C.border, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: C.accent },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailDate: { color: C.text, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  detailStats: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  detailStat: { flex: 1, alignItems: 'center', backgroundColor: C.bg, padding: 8, borderRadius: 8 },
  detailStatValue: { color: C.accent, fontWeight: 'bold', fontSize: 16 },
  detailStatLabel: { color: C.muted, fontSize: 9, marginTop: 2, textTransform: 'uppercase' },
  detailSets: { gap: 4 },
  detailSetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.accentDim },
  detailSetLabel: { color: C.muted, fontSize: 13 },
  detailSetValue: { color: C.text, fontSize: 13, fontWeight: '600' },
  emptyChart: { alignItems: 'center', padding: 40, marginHorizontal: 16, backgroundColor: C.card, borderRadius: 12, gap: 8 },
  emptyText: { color: C.muted, fontSize: 16 },
  emptySubtext: { color: C.muted, fontSize: 12 },
  historySection: { paddingHorizontal: 16 },
  historyCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prBadge: { backgroundColor: C.warning, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  prText: { color: C.bg, fontSize: 10, fontWeight: '900' },
  historyDate: { color: C.text, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  historySetsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  historySetPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  historySetWeight: { color: C.accent, fontWeight: 'bold', fontSize: 14 },
  historySetReps: { color: C.muted, fontSize: 13 },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  historyVolume: { color: C.muted, fontSize: 12 },
  historyRpe: { fontSize: 12, fontWeight: '700' },
  historyMaxW: { color: C.accent, fontSize: 12, fontWeight: '600' },
  rpeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rpeChipText: { fontSize: 11, fontWeight: '700' },
  historySetRpe: { fontSize: 11, fontWeight: '700', marginLeft: 2 },
});
