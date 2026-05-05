import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../src/context/ThemeContext';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clients, sessions, deleteClient, toggleGoalComplete, exerciseLogs, exercises } = useAppData();
  const { colors: C } = useTheme();

  const client = clients.find(c => c.id === id);

  if (!client) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
        <View style={styles.centered}>
          <Ionicons name="person-remove" size={60} color={C.border} />
          <Text style={[styles.notFoundText, { color: C.muted }]}>Cliente no encontrado</Text>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: C.accent }]} onPress={() => router.back()}>
            <Text style={[styles.backBtnText, { color: C.bg }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const clientSessions = sessions.filter(s => s.clientId === id);
  const lastMeasurement = client.measurements.length > 0
    ? client.measurements[client.measurements.length - 1]
    : null;
  const activePlans = client.plans.filter(p => p.active);

  // Get recent exercise logs for this client
  const clientLogs = exerciseLogs
    .filter(l => l.clientId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Get unique exercises with their latest max weight
  const recentExercises = useMemo(() => {
    const map = new Map<string, { exerciseId: string; name: string; maxWeight: number; date: string; sessions: number }>();
    clientLogs.forEach(log => {
      const ex = exercises.find(e => e.id === log.exerciseId);
      if (!ex) return;
      const maxW = Math.max(...log.sets.map(s => s.weight));
      const existing = map.get(log.exerciseId);
      if (!existing) {
        map.set(log.exerciseId, {
          exerciseId: log.exerciseId,
          name: ex.name,
          maxWeight: maxW,
          date: log.date,
          sessions: 1,
        });
      } else {
        existing.sessions++;
        if (maxW > existing.maxWeight) existing.maxWeight = maxW;
      }
    });
    return Array.from(map.values()).slice(0, 5);
  }, [clientLogs, exercises]);

  // Alert: evaluation overdue (>35 days)
  const evaluationOverdue = useMemo(() => {
    if (client.measurements.length === 0) return true; // never evaluated
    const lastDate = new Date(client.measurements[client.measurements.length - 1].date);
    const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 35;
  }, [client.measurements]);

  const daysSinceLastEval = useMemo(() => {
    if (client.measurements.length === 0) return null;
    const lastDate = new Date(client.measurements[client.measurements.length - 1].date);
    return Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [client.measurements]);

  const calculateAge = (birthDate?: string): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const clientAge = calculateAge(client.birthDate);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Cliente',
      `¿Estás seguro de eliminar a ${client.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteClient(client.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleEditMenu = () => {
    Alert.alert(
      'Opciones',
      '',
      [
        { text: 'Editar Cliente', onPress: () => router.push(`/clients/edit?id=${id}`) },
        { text: 'Eliminar', style: 'destructive', onPress: handleDelete },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.heading }]}>Perfil del Alumno</Text>
        <TouchableOpacity onPress={handleEditMenu} style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={24} color={C.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileHeader, { backgroundColor: C.card }]}>
          <View style={[styles.avatar, { backgroundColor: C.border, borderColor: C.accent }]}>
            {client.photoUrl ? (
              <Image source={{ uri: client.photoUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={44} color={C.accent} />
            )}
          </View>
          <Text style={[styles.name, { color: C.heading }]}>{client.name}</Text>
          <Text style={[styles.email, { color: C.muted }]}>{client.email}</Text>
          {client.phone ? <Text style={[styles.phone, { color: C.muted }]}>{client.phone}</Text> : null}

          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: C.accentDim, borderColor: C.accentSoft },
              !client.active && { borderColor: 'rgba(255,107,107,0.3)', backgroundColor: 'rgba(255,107,107,0.08)' }]}>
              <View style={[styles.statusDot, { backgroundColor: client.active ? C.accent : C.danger }]} />
              <Text style={[styles.tagText, { color: client.active ? C.accent : C.danger }]}>
                {client.active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            {clientAge !== null ? (
              <View style={[styles.tag, { backgroundColor: C.accentDim, borderColor: C.accentSoft }]}>
                <Text style={[styles.tagText, { color: C.accent }]}>{clientAge} años</Text>
              </View>
            ) : null}
            {client.height ? (
              <View style={[styles.tag, { backgroundColor: C.accentDim, borderColor: C.accentSoft }]}>
                <Text style={[styles.tagText, { color: C.accent }]}>{client.height} cm</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Evaluation Alert */}
        {evaluationOverdue && (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: `${C.warning}15`, borderColor: `${C.warning}4D` }]}
            onPress={() => router.push(`/clients/measurements?id=${id}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.alertIconWrap, { backgroundColor: `${C.warning}26` }]}>
              <Ionicons name="warning" size={18} color={C.warning} />
            </View>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: C.warning }]}>Evaluación pendiente</Text>
              <Text style={[styles.alertSubtext, { color: C.muted }]}>
                {daysSinceLastEval !== null
                  ? `Última evaluación hace ${daysSinceLastEval} días`
                  : 'Sin evaluaciones registradas'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.warning} />
          </TouchableOpacity>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: C.card }]}>
            <Ionicons name="scale-outline" size={20} color={C.accent} style={{ marginBottom: 4 }} />
            <Text style={[styles.statValue, { color: C.heading }]}>
              {lastMeasurement ? `${lastMeasurement.weight}kg` : '-'}
            </Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>Peso</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.card }]}>
            <Ionicons name="analytics-outline" size={20} color={C.accent} style={{ marginBottom: 4 }} />
            <Text style={[styles.statValue, { color: C.heading }]}>
              {lastMeasurement?.bodyFatPercentage ? `${lastMeasurement.bodyFatPercentage}%` : '-'}
            </Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>Grasa</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.card }]}>
            <Ionicons name="document-text-outline" size={20} color={C.accent} style={{ marginBottom: 4 }} />
            <Text style={[styles.statValue, { color: C.heading }]}>{client.measurements.length}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>Registros</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.card }]}>
            <Ionicons name="trophy-outline" size={20} color={C.accent} style={{ marginBottom: 4 }} />
            <Text style={[styles.statValue, { color: C.heading }]}>{clientSessions.length}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>Sesiones</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: C.border }]}
            onPress={() => router.push(`/clients/measurements?id=${id}`)}
          >
            <Ionicons name="stats-chart" size={22} color={C.heading} />
            <Text style={[styles.actionText, { color: C.heading }]}>Evaluación</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: C.border }]}
            onPress={() => router.push(`/clients/photos?id=${id}`)}
          >
            <Ionicons name="images" size={22} color={C.heading} />
            <Text style={[styles.actionText, { color: C.heading }]}>Fotos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: C.accent }]}
            onPress={() => router.push(`/clients/plan?id=${id}`)}
          >
            <Ionicons name="calendar" size={22} color={C.bg} />
            <Text style={[styles.actionTextDark, { color: C.bg }]}>Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Workout Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: C.accent }]}
            onPress={() => router.push('/(tabs)/live')}
          >
            <Ionicons name="flash" size={22} color={C.bg} />
            <Text style={[styles.actionTextDark, { color: C.bg }]}>En Vivo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: C.border }]}
            onPress={() => router.push(`/clients/workout-history?clientId=${id}`)}
          >
            <Ionicons name="time" size={22} color={C.heading} />
            <Text style={[styles.actionText, { color: C.heading }]}>Historial</Text>
          </TouchableOpacity>
        </View>

        {/* Active Plans */}
        {activePlans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.heading }]}>Plan Activo</Text>
            {activePlans.map(plan => (
              <View key={plan.id} style={[styles.planCard, { backgroundColor: C.card, borderLeftColor: C.accent }]}>
                <View style={styles.planCardHeader}>
                  <Ionicons name="fitness" size={20} color={C.accent} />
                  <Text style={[styles.planName, { color: C.heading }]}>{plan.notes || 'Rutina asignada'}</Text>
                </View>
                <Text style={[styles.planDetail, { color: C.muted }]}>
                  {plan.daysPerWeek} días/semana • Desde {new Date(plan.startDate).toLocaleDateString('es-CL')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitleInline, { color: C.heading }]}>Objetivos ({client.goals.length})</Text>
            <TouchableOpacity
              style={styles.sectionBtn}
              onPress={() => router.push(`/clients/goals?id=${id}`)}
            >
              <Ionicons name="create-outline" size={18} color={C.accent} />
              <Text style={[styles.sectionBtnText, { color: C.accent }]}>Gestionar</Text>
            </TouchableOpacity>
          </View>

          {client.goals.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => router.push(`/clients/goals?id=${id}`)}
            >
              <Ionicons name="flag-outline" size={32} color={C.border} />
              <Text style={[styles.emptyText, { color: C.muted }]}>Sin objetivos definidos</Text>
              <Text style={[styles.emptySubtext, { color: C.accent }]}>Toca para agregar uno</Text>
            </TouchableOpacity>
          ) : (
            client.goals.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalCard, { backgroundColor: C.card }]}
                onPress={() => toggleGoalComplete(client.id, g.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={g.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={g.isCompleted ? C.accent : C.muted}
                />
                <View style={styles.goalContent}>
                  <Text style={[styles.goalText, { color: C.heading }, g.isCompleted && { textDecorationLine: 'line-through', color: C.muted }]}>
                    {g.description}
                  </Text>
                  <Text style={[styles.goalType, { color: C.muted }]}>
                    {g.type === 'weight_loss' ? 'Pérdida de peso' :
                     g.type === 'muscle_gain' ? 'Ganancia muscular' :
                     g.type === 'maintenance' ? 'Mantenimiento' :
                     g.type === 'endurance' ? 'Resistencia' :
                     g.type === 'flexibility' ? 'Flexibilidad' : 'Otro'}
                    {g.targetValue ? ` • Meta: ${g.targetValue}` : ''}
                  </Text>
                </View>
                {g.isCompleted && (
                  <View style={[styles.completedBadge, { backgroundColor: C.accentDim }]}>
                    <Text style={[styles.completedBadgeText, { color: C.accent }]}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.heading }]}>Información</Text>
          <View style={[styles.infoCard, { backgroundColor: C.card }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: C.muted }]}>Fecha de inicio</Text>
              <Text style={[styles.infoValue, { color: C.heading }]}>
                {new Date(client.joinDate).toLocaleDateString('es-CL')}
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: C.muted }]}>Fotos de progreso</Text>
              <Text style={[styles.infoValue, { color: C.heading }]}>{client.progressPhotos.length}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: C.border }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: C.muted }]}>Planes asignados</Text>
              <Text style={[styles.infoValue, { color: C.heading }]}>{client.plans.length}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 16 },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scrollContent: { paddingBottom: 32 },
  profileHeader: { alignItems: 'center', padding: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, overflow: 'hidden' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  name: { fontSize: 24, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 4 },
  phone: { fontSize: 14, marginTop: 2 },
  tags: { flexDirection: 'row', marginTop: 16, gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { fontSize: 12, fontWeight: '600' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  alertIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  alertContent: { flex: 1 },
  alertTitle: { fontWeight: '700', fontSize: 13 },
  alertSubtext: { fontSize: 11, marginTop: 2 },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 2 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionText: { fontWeight: '600', fontSize: 14 },
  actionTextDark: { fontWeight: 'bold', fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  sectionTitleInline: { fontSize: 18, fontWeight: 'bold' },
  sectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionBtnText: { fontWeight: '600', fontSize: 13 },
  planCard: { padding: 16, borderRadius: 12, marginBottom: 8, borderLeftWidth: 3 },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  planName: { fontWeight: '600', fontSize: 15 },
  planDetail: { fontSize: 13, marginLeft: 28 },
  emptyCard: { padding: 32, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed' },
  emptyText: { fontSize: 14 },
  emptySubtext: { fontSize: 12 },
  goalCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  goalContent: { flex: 1 },
  goalText: { fontSize: 15, fontWeight: '500' },
  goalType: { fontSize: 12, marginTop: 2 },
  completedBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  completedBadgeText: { fontWeight: 'bold', fontSize: 12 },
  infoCard: { borderRadius: 12, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  infoDivider: { height: 1 },
});
