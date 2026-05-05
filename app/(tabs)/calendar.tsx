import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppData } from '../../src/context/AppDataContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { WeekDay } from '../../src/types';

const DAY_NAMES: WeekDay[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAY_SHORTS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const currentDay = today.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekDayName(date: Date): WeekDay {
  const idx = date.getDay(); // 0=Sun
  const map: WeekDay[] = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return map[idx];
}

const COLORS = ['#64ffda', '#7c4dff', '#ff6b6b', '#FFA726', '#4fc3f7', '#81c784'];

export default function CalendarScreen() {
  const { clients, exercises } = useAppData();
  const { colors: C } = useTheme();
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const today = new Date();

  // Auto-select today when on current week, or null (show all) for other weeks
  const effectiveSelectedIdx = useMemo(() => {
    if (selectedDayIdx !== null) return selectedDayIdx;
    if (weekOffset === 0) {
      const todayIdx = weekDates.findIndex(d => d.toDateString() === today.toDateString());
      return todayIdx >= 0 ? todayIdx : null;
    }
    return null;
  }, [selectedDayIdx, weekOffset, weekDates, today]);

  // Collect all active plans from all clients with their weekDays
  const weekSchedule = useMemo(() => {
    const schedule: Map<string, {
      clientId: string;
      clientName: string;
      planId: string;
      planName: string;
      exercises: { name: string; sets: number; reps?: string }[];
      color: string;
    }[]> = new Map();

    DAY_NAMES.forEach(d => schedule.set(d, []));

    let colorIdx = 0;
    clients.forEach(client => {
      if (!client.active) return;
      client.plans.filter(p => p.active).forEach(plan => {
        const color = COLORS[colorIdx % COLORS.length];
        colorIdx++;
        const planExercises = (plan.exercises || []).map(pe => {
          const ex = exercises.find(e => e.id === pe.exerciseId);
          return { name: ex?.name || 'Desconocido', sets: pe.sets, reps: pe.reps };
        });
        const weekDays = plan.weekDays || [];
        weekDays.forEach(day => {
          schedule.get(day)?.push({
            clientId: client.id,
            clientName: client.name,
            planId: plan.id,
            planName: plan.templateName || plan.notes || 'Plan',
            exercises: planExercises,
            color,
          });
        });
      });
    });

    return schedule;
  }, [clients, exercises]);

  const monthYear = weekDates[3].toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => { setWeekOffset(prev => prev - 1); setSelectedDayIdx(null); }} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={C.accent} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={[styles.monthText, { color: C.text }]}>{monthYear}</Text>
          {weekOffset !== 0 && (
            <TouchableOpacity onPress={() => setWeekOffset(0)}>
              <Text style={[styles.todayBtn, { color: C.accent, backgroundColor: C.accentDim }]}>Hoy</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => { setWeekOffset(prev => prev + 1); setSelectedDayIdx(null); }} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* Week Days Header */}
      <View style={styles.weekHeader}>
        {weekDates.map((date, i) => {
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = effectiveSelectedIdx === i;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.dayHeader,
                isSelected && { backgroundColor: C.accentSoft },
              ]}
              onPress={() => setSelectedDayIdx(i === effectiveSelectedIdx && weekOffset !== 0 ? null : i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayShort, { color: C.muted }, isSelected && { color: C.accent }]}>
                {DAY_SHORTS[i]}
              </Text>
              <Text style={[
                styles.dayNumber,
                { color: C.text },
                isToday && { color: C.accent, fontWeight: '900' as const },
                isSelected && { color: C.accent },
              ]}>
                {date.getDate()}
              </Text>
              {isToday && (
                <View style={[styles.todayDot, { backgroundColor: C.accent }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day Details */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {weekDates
          .map((date, i) => ({ date, i }))
          .filter(({ i }) => effectiveSelectedIdx === null || effectiveSelectedIdx === i)
          .map(({ date, i }) => {
          const dayName = getWeekDayName(date);
          const dayEvents = weekSchedule.get(dayName) || [];
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < today && !isToday;

          const isSelected = effectiveSelectedIdx === i;

          if (dayEvents.length === 0 && !isToday && !isSelected) return null;

          return (
            <View key={i} style={styles.daySection}>
              <View style={styles.daySectionHeader}>
                <Text style={[styles.daySectionTitle, { color: C.text }, isToday && { color: C.accent, fontWeight: 'bold' as const }]}>
                  {isToday ? '● Hoy' : DAY_SHORTS[i]} {date.getDate()}
                </Text>
                <Text style={[styles.daySectionCount, { color: C.muted }]}>
                  {dayEvents.length} {dayEvents.length === 1 ? 'sesión' : 'sesiones'}
                </Text>
              </View>

              {dayEvents.length === 0 && (isToday || isSelected) && (
                <View style={[styles.restCard, { backgroundColor: C.card }]}>
                  <Ionicons name="bed-outline" size={20} color={C.muted} />
                  <Text style={[styles.restText, { color: C.muted }]}>
                    {isToday ? 'Día libre — sin sesiones programadas' : 'Sin sesiones programadas'}
                  </Text>
                </View>
              )}

              {dayEvents.map((event, ei) => (
                <TouchableOpacity
                  key={ei}
                  style={[styles.eventCard, { backgroundColor: C.card, borderLeftColor: event.color }, isPast && styles.eventCardPast]}
                  onPress={() => router.push(`/clients/${event.clientId}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.eventClientRow}>
                      <View style={[styles.eventAvatar, { backgroundColor: event.color + '20' }]}>
                        <Ionicons name="person" size={14} color={event.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventClientName, { color: C.text }]}>{event.clientName}</Text>
                        <Text style={[styles.eventPlanName, { color: C.muted }]}>{event.planName}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.muted} />
                  </View>

                  {/* Mini exercise list */}
                  <View style={styles.eventExercises}>
                    {event.exercises.slice(0, 4).map((ex, exi) => (
                      <View key={exi} style={styles.eventExRow}>
                        <View style={[styles.eventExDot, { backgroundColor: event.color }]} />
                        <Text style={[styles.eventExName, { color: C.text }]}>{ex.name}</Text>
                        <Text style={[styles.eventExDetail, { color: C.muted }]}>{ex.sets}×{ex.reps || '?'}</Text>
                      </View>
                    ))}
                    {event.exercises.length > 4 && (
                      <Text style={[styles.eventExMore, { color: C.muted }]}>
                        +{event.exercises.length - 4} más
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {/* If no events at all this week */}
        {DAY_NAMES.every(d => (weekSchedule.get(d) || []).length === 0) && (
          <View style={styles.emptyWeek}>
            <Ionicons name="calendar-outline" size={48} color={C.border} />
            <Text style={[styles.emptyWeekTitle, { color: C.muted }]}>Semana libre</Text>
            <Text style={[styles.emptyWeekText, { color: C.muted }]}>
              No hay sesiones programadas esta semana.{'\n'}
              Asigna planes a tus clientes con días específicos.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  navBtn: { padding: 8 },
  navCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthText: { fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize' },
  todayBtn: { fontSize: 13, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12, gap: 4 },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  dayShort: { fontSize: 11, fontWeight: '600' },
  dayNumber: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
  daySection: { paddingHorizontal: 16, marginBottom: 16 },
  daySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  daySectionTitle: { fontSize: 14, fontWeight: '600' },
  daySectionCount: { fontSize: 11 },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 10 },
  restText: { fontSize: 13 },
  eventCard: { borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderLeftWidth: 3 },
  eventCardPast: { opacity: 0.5 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  eventClientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  eventAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  eventClientName: { fontWeight: '600', fontSize: 14 },
  eventPlanName: { fontSize: 11, marginTop: 1 },
  eventExercises: { paddingHorizontal: 12, paddingBottom: 10 },
  eventExRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  eventExDot: { width: 5, height: 5, borderRadius: 3 },
  eventExName: { fontSize: 12, flex: 1 },
  eventExDetail: { fontSize: 11 },
  eventExMore: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  emptyWeek: { alignItems: 'center', padding: 40, gap: 10 },
  emptyWeekTitle: { fontSize: 18, fontWeight: '600' },
  emptyWeekText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
