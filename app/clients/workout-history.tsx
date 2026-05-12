import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';
import {
  generateAndShareWorkoutPdf,
  PdfAthleteData,
  PdfSessionData,
} from '../../src/utils/workoutPdf';
import { ExerciseLog } from '../../src/types';

const ATHLETE_COLORS = ['#64ffda', '#ff6b9d', '#ffa726', '#9c88ff', '#4ecdc4'];

interface SessionGroup {
  date: string;
  logIds: string[];
  exercises: { exerciseId: string; name: string; maxWeight: number; totalSets: number; totalReps: number; avgRpe: number | null }[];
  totalVolume: number;
  avgRpe: number | null;
}

export default function WorkoutHistoryScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();
  const { clients, exercises, exerciseLogs, deleteExerciseLog } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const client = clients.find(c => c.id === clientId);

  const sessions: SessionGroup[] = useMemo(() => {
    const clientLogs = exerciseLogs
      .filter(l => l.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const dateMap = new Map<string, typeof clientLogs>();
    clientLogs.forEach(log => {
      const existing = dateMap.get(log.date) || [];
      existing.push(log);
      dateMap.set(log.date, existing);
    });

    return Array.from(dateMap.entries()).map(([date, logs]) => {
      const exerciseList = logs.map(log => {
        const ex = exercises.find(e => e.id === log.exerciseId);
        const rpeSets = log.sets.filter(s => s.rpe != null && s.rpe > 0);
        return {
          exerciseId: log.exerciseId,
          name: ex?.name || 'Desconocido',
          maxWeight: Math.max(...log.sets.map(s => s.weight)),
          totalSets: log.sets.length,
          totalReps: log.sets.reduce((sum, s) => sum + s.reps, 0),
          avgRpe: rpeSets.length > 0
            ? Math.round(rpeSets.reduce((sum, s) => sum + s.rpe!, 0) / rpeSets.length * 10) / 10
            : null,
        };
      });

      const totalVolume = logs.reduce(
        (sum, log) => sum + log.sets.reduce((s, set) => s + set.weight * set.reps, 0),
        0
      );

      const allRpeSets = logs.flatMap(l => l.sets).filter(s => s.rpe != null && s.rpe > 0);
      const avgRpe = allRpeSets.length > 0
        ? Math.round(allRpeSets.reduce((sum, s) => sum + s.rpe!, 0) / allRpeSets.length * 10) / 10
        : null;

      return {
        date,
        logIds: logs.map(l => l.id),
        exercises: exerciseList,
        totalVolume,
        avgRpe,
      };
    });
  }, [exerciseLogs, clientId, exercises]);

  if (!client) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Cliente no encontrado</Text>
      </SafeAreaView>
    );
  }

  const handleDeleteSession = (session: SessionGroup) => {
    const dateStr = new Date(session.date + 'T12:00:00').toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long',
    });
    Alert.alert(
      'Eliminar Sesión',
      `¿Eliminar toda la sesión del ${dateStr}? (${session.exercises.length} ejercicios)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => session.logIds.forEach(id => deleteExerciseLog(id)),
        },
      ]
    );
  };

  const handleShareSession = async (session: SessionGroup) => {
    if (!client) return;
    try {
      const sessionLogs = exerciseLogs.filter(l => session.logIds.includes(l.id));

      // Build PDF athlete data from logs
      const athleteData: PdfAthleteData = {
        clientName: client.name,
        clientColor: ATHLETE_COLORS[0],
        exercises: sessionLogs.map(log => {
          const ex = exercises.find(e => e.id === log.exerciseId);
          return {
            name: ex?.name || 'Ejercicio',
            muscleGroup: ex?.muscleGroup || 'Otro',
            sets: log.sets,
            notes: log.notes,
            exerciseId: log.exerciseId,
          };
        }),
      };

      // Build historical logs map for comparison vs prior sessions
      const historicalLogs: Record<string, ExerciseLog[]> = {};
      sessionLogs.forEach(log => {
        const key = `${client.id}:${log.exerciseId}`;
        const priorLogs = exerciseLogs.filter(
          l => l.clientId === client.id && l.exerciseId === log.exerciseId && l.date < session.date
        );
        if (priorLogs.length > 0) historicalLogs[key] = priorLogs;
      });

      const d = new Date(session.date + 'T12:00:00');
      const pdfData: PdfSessionData = {
        date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
        duration: '—',
        athletes: [athleteData],
        weightUnit: 'kg',
        historicalLogs,
      };

      await generateAndShareWorkoutPdf(pdfData);
    } catch (e) {
      console.error('Share PDF error:', e);
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Hoy';
    if (isYesterday) return 'Ayer';

    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const renderSession = ({ item }: { item: SessionGroup }) => (
    <View style={s.sessionCard}>
      {/* Session Header */}
      <View style={s.sessionHeader}>
        <View style={s.sessionDateRow}>
          <View style={s.calendarIcon}>
            <Ionicons name="calendar" size={16} color={C.accent} />
          </View>
          <View>
            <Text style={s.sessionDate}>{formatDate(item.date)}</Text>
            <Text style={s.sessionDateSub}>
              {new Date(item.date + 'T12:00:00').toLocaleDateString('es-CL', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <View style={s.sessionActions}>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => handleShareSession(item)}
          >
            <Ionicons name="share-outline" size={16} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() =>
              router.push(`/clients/edit-workout?clientId=${clientId}&date=${item.date}`)
            }
          >
            <Ionicons name="create-outline" size={16} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => handleDeleteSession(item)}
          >
            <Ionicons name="trash-outline" size={16} color={C.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Session Stats */}
      <View style={s.sessionStats}>
        <View style={s.sessionStat}>
          <Text style={s.sessionStatValue}>{item.exercises.length}</Text>
          <Text style={s.sessionStatLabel}>Ejercicios</Text>
        </View>
        <View style={s.sessionStat}>
          <Text style={s.sessionStatValue}>
            {item.exercises.reduce((s, e) => s + e.totalSets, 0)}
          </Text>
          <Text style={s.sessionStatLabel}>Series</Text>
        </View>
        <View style={s.sessionStat}>
          <Text style={[s.sessionStatValue, { color: C.accent }]}>
            {item.totalVolume.toLocaleString()}
          </Text>
          <Text style={s.sessionStatLabel}>Vol (kg)</Text>
        </View>
        {item.avgRpe !== null && (
          <View style={s.sessionStat}>
            <Text style={[s.sessionStatValue, { color: item.avgRpe >= 8 ? C.danger : item.avgRpe >= 6 ? C.warning : C.accent }]}>
              {item.avgRpe}
            </Text>
            <Text style={s.sessionStatLabel}>RPE Prom</Text>
          </View>
        )}
      </View>

      {/* Exercises List */}
      <View style={s.exercisesList}>
        {item.exercises.map((ex, i) => (
          <TouchableOpacity
            key={i}
            style={s.exerciseRow}
            onPress={() =>
              router.push(
                `/clients/exercise-history?exerciseId=${ex.exerciseId}&clientId=${clientId}`
              )
            }
            activeOpacity={0.7}
          >
            <View style={s.exerciseRowLeft}>
              <View style={s.exerciseDot} />
              <Text style={s.exerciseRowName}>{ex.name}</Text>
            </View>
            <View style={s.exerciseRowRight}>
              <Text style={s.exerciseRowWeight}>{ex.maxWeight}kg</Text>
              <Text style={s.exerciseRowDetail}>
                {ex.totalSets}×{Math.round(ex.totalReps / ex.totalSets)}
              </Text>
              {ex.avgRpe !== null && (
                <View style={[
                  s.rpeBadge,
                  { backgroundColor: ex.avgRpe >= 8 ? 'rgba(255,107,107,0.15)' : ex.avgRpe >= 6 ? 'rgba(255,167,38,0.15)' : C.accentSoft }
                ]}>
                  <Text style={[
                    s.rpeBadgeText,
                    { color: ex.avgRpe >= 8 ? C.danger : ex.avgRpe >= 6 ? C.warning : C.accent }
                  ]}>RPE {ex.avgRpe}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Entrenamientos</Text>
          <Text style={s.headerSubtitle}>{client.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/clients/workout?clientId=${clientId}`)}
          style={s.headerBtn}
        >
          <Ionicons name="add" size={24} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      <View style={s.topBar}>
        <Text style={s.topBarText}>
          {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'} registradas
        </Text>
      </View>

      {sessions.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="barbell-outline" size={60} color={C.border} />
          <Text style={s.emptyTitle}>Sin entrenamientos</Text>
          <Text style={s.emptySubtext}>
            Registra el primer entrenamiento de {client.name}
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.push(`/clients/workout?clientId=${clientId}`)}
          >
            <Ionicons name="add-circle" size={20} color={C.bg} />
            <Text style={s.emptyBtnText}>Registrar Entrenamiento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.date}
          renderItem={renderSession}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerBtn: { padding: 8, width: 40 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  headerSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  topBar: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
  },
  topBarText: { color: C.muted, fontSize: 13, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sessionCard: {
    backgroundColor: C.card, borderRadius: 14, marginBottom: 14,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sessionDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendarIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.accentSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  sessionDate: {
    color: C.text, fontWeight: '600', fontSize: 15, textTransform: 'capitalize',
  },
  sessionDateSub: { color: C.muted, fontSize: 11, marginTop: 1 },
  sessionActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.accentSoft,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,107,107,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  sessionStats: {
    flexDirection: 'row', padding: 12, gap: 8,
  },
  sessionStat: {
    flex: 1, alignItems: 'center', backgroundColor: C.bg,
    paddingVertical: 8, borderRadius: 8,
  },
  sessionStatValue: { color: C.text, fontWeight: 'bold', fontSize: 16 },
  sessionStatLabel: {
    color: C.muted, fontSize: 9, marginTop: 2, textTransform: 'uppercase',
  },
  exercisesList: { paddingHorizontal: 14, paddingBottom: 10 },
  exerciseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.accentDim,
  },
  exerciseRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  exerciseDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent,
  },
  exerciseRowName: { color: C.text, fontSize: 14 },
  exerciseRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseRowWeight: { color: C.accent, fontWeight: 'bold', fontSize: 14 },
  exerciseRowDetail: { color: C.muted, fontSize: 12 },
  rpeBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  rpeBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 40,
  },
  emptyTitle: { color: C.muted, fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: C.muted, fontSize: 13, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8, marginTop: 12,
  },
  emptyBtnText: { color: C.bg, fontWeight: 'bold', fontSize: 14 },
});
