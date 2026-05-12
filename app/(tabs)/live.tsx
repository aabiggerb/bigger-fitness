import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Modal, FlatList, Alert, Vibration, Animated, Dimensions, KeyboardAvoidingView,
  Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppData } from '../../src/context/AppDataContext';
import { Client, ExerciseSet, ExerciseLog, WeekDay, ClientPlan } from '../../src/types';
import { ExercisePicker } from '../../src/components/ExercisePicker';
import { RestTimer, RestTimerHandle } from '../../src/components/RestTimer';
import { RPEFeedbackModal } from '../../src/components/RPEFeedbackModal';
import { generateId } from '../../src/utils/generateId';
import { generateAndShareWorkoutPdf, PdfAthleteData, PdfSessionData } from '../../src/utils/workoutPdf';
import { loadDefaultRestSeconds } from '../../src/utils/restPreferences';
import { loadAlarmSoundPreference } from '../../src/utils/alarmSound';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

const WEEKDAY_MAP: Record<number, WeekDay> = {
  1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 0: 'domingo',
};

const ATHLETE_COLORS = [
  '#64ffda', '#FF6B6B', '#FFA726', '#AB47BC', '#42A5F5',
  '#66BB6A', '#EF5350', '#5C6BC0', '#26A69A', '#EC407A',
];

// ─── Athlete status badges ────
type AthleteStatus = 'idle' | 'working' | 'resting' | 'ready' | 'done';

const STATUS_CONFIG = (C: ThemeColors): Record<AthleteStatus, { label: string; icon: string; color: string; bg: string }> => ({
  idle: { label: 'Esperando', icon: 'hourglass-outline', color: C.muted, bg: C.border },
  working: { label: 'Entrenando', icon: 'barbell-outline', color: '#4CAF50', bg: 'rgba(76,175,80,0.12)' },
  resting: { label: 'Descansando', icon: 'timer-outline', color: C.warning, bg: 'rgba(255,167,38,0.12)' },
  ready: { label: '¡Listo!', icon: 'checkmark-circle', color: C.accent, bg: C.accentSoft },
  done: { label: 'Terminó', icon: 'trophy-outline', color: '#AB47BC', bg: 'rgba(171,71,188,0.12)' },
});

// ─── Workout entry per athlete ────
interface WorkoutEntry {
  exerciseId: string;
  sets: ExerciseSet[];
  notes: string;
}

// ─── Active athlete session ────
interface AthleteSession {
  clientId: string;
  entries: WorkoutEntry[];
  status: AthleteStatus;
  currentExerciseIndex: number;
  currentSetIndex: number;
  restTimerMs: number; // remaining rest ms (0 = not resting)
  restTotalMs: number;
  addedAt: number; // timestamp for ordering
}

const { width: SCREEN_W } = Dimensions.get('window');

export default function LiveSessionScreen() {
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const statusConfig = useMemo(() => STATUS_CONFIG(C), [C]);
  const { clients, exercises, routines, addExerciseLog, exerciseLogs } = useAppData();
  const activeClients = useMemo(() => clients.filter(c => c.active), [clients]);

  // Load alarm sound preference at mount
  useEffect(() => { loadAlarmSoundPreference(); }, []);

  // ─── Scheduled clients for today ────
  const todayDay = WEEKDAY_MAP[new Date().getDay()];
  const scheduledClientIds = useMemo(() => {
    const ids = new Set<string>();
    activeClients.forEach(c => {
      if (c.plans.some(p => p.active && p.weekDays.includes(todayDay))) {
        ids.add(c.id);
      }
    });
    return ids;
  }, [activeClients, todayDay]);

  // ─── Session state ────
  const [sessions, setSessions] = useState<AthleteSession[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);
  const [routineSearch, setRoutineSearch] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [elapsedStr, setElapsedStr] = useState('00:00:00');
  const [athleteElapsed, setAthleteElapsed] = useState<Record<string, string>>({});
  const sessionsRef = useRef<AthleteSession[]>([]);

  // RPE modal state
  const [showRPEModal, setShowRPEModal] = useState(false);
  const [rpeFeedbackCtx, setRpeFeedbackCtx] = useState<{
    clientId: string; entryIdx: number; setIdx: number;
    exerciseName: string; setNumber: number;
  } | null>(null);

  // Full-screen timer overlay for selected athlete (always mounted to preserve state)
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerAthleteId, setTimerAthleteId] = useState<string | null>(null);
  const [timerDefaultSec, setTimerDefaultSec] = useState(90);

  // Load user-preferred default rest seconds from settings
  useEffect(() => {
    loadDefaultRestSeconds().then(setTimerDefaultSec);
  }, []);
  const [preferredAnalogMode, setPreferredAnalogMode] = useState(true);
  // Track if timer was auto-started to avoid re-triggering
  const [timerAutoStart, setTimerAutoStart] = useState(false);
  // Pending timer config: when set, the timer will open AFTER the RPE modal closes.
  // This avoids the keyboard popping up because the timer overlay mounts while a
  // TextInput underneath still has focus.
  const pendingTimerOpenRef = useRef(false);

  // Force-dismiss keyboard whenever timer overlay opens (overlay is not a Modal,
  // so underlying TextInputs keep focus otherwise). Use a listener so any TextInput
  // that tries to refocus while the timer is up gets the keyboard dismissed again.
  useEffect(() => {
    if (!showTimerModal) return;
    Keyboard.dismiss();
    const t1 = setTimeout(() => Keyboard.dismiss(), 50);
    const t2 = setTimeout(() => Keyboard.dismiss(), 250);
    const sub = Keyboard.addListener('keyboardDidShow', () => Keyboard.dismiss());
    return () => { clearTimeout(t1); clearTimeout(t2); sub.remove(); };
  }, [showTimerModal]);
  // Key to remount RestTimer only when starting a new rest period
  const [timerKey, setTimerKey] = useState(0);

  // Ref to programmatically control the RestTimer (dismiss alarm, force stop, etc.)
  const restTimerRef = useRef<RestTimerHandle>(null);

  // Timers ref map: clientId → intervalId
  const timerRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Sort: scheduled first, then the rest alphabetically
  const sortedPickerClients = useMemo(() => {
    const available = activeClients.filter(c => !sessions.find(se => se.clientId === c.id));
    return available.sort((a, b) => {
      const aScheduled = scheduledClientIds.has(a.id) ? 0 : 1;
      const bScheduled = scheduledClientIds.has(b.id) ? 0 : 1;
      if (aScheduled !== bScheduled) return aScheduled - bScheduled;
      return a.name.localeCompare(b.name);
    });
  }, [activeClients, sessions, scheduledClientIds]);

  // Auto-dismiss keyboard when timer overlay opens
  useEffect(() => {
    if (showTimerModal) Keyboard.dismiss();
  }, [showTimerModal]);

  // Keep sessions ref in sync for the clock interval
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  // ─── Helper: format ms → HH:MM:SS ────
  const formatHHMMSS = useCallback((ms: number): string => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // ─── Session clock (global + per-athlete) ────
  useEffect(() => {
    if (!sessionStarted) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setElapsedStr(formatHHMMSS(now - sessionStartTime));
      const map: Record<string, string> = {};
      sessionsRef.current.forEach(sess => {
        map[sess.clientId] = formatHHMMSS(now - sess.addedAt);
      });
      setAthleteElapsed(map);
    }, 1000);
    return () => clearInterval(iv);
  }, [sessionStarted, sessionStartTime, formatHHMMSS]);

  // ─── Cleanup all timers ────
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(iv => clearInterval(iv));
      timerRefs.current.clear();
    };
  }, []);

  // ─── Start session ────
  const startSession = () => {
    setSessionStarted(true);
    setSessionStartTime(Date.now());
  };

  // ─── End session (save all) ────
  const endSession = () => {
    Alert.alert('Finalizar Sesión', '¿Guardar todos los registros y terminar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Guardar y Terminar',
        style: 'destructive',
        onPress: () => {
          const today = new Date().toISOString().split('T')[0];
          let totalLogs = 0;

          // Capture session data BEFORE clearing for the PDF
          const pdfAthletes: PdfAthleteData[] = sessions.map((sess, idx) => {
            const cl = clients.find(c => c.id === sess.clientId);
            const validEntries = sess.entries.filter(e => e.sets.some(s => s.weight > 0 || s.reps > 0));
            return {
              clientName: cl?.name || 'Atleta',
              clientColor: ATHLETE_COLORS[idx % ATHLETE_COLORS.length],
              exercises: validEntries.map(entry => ({
                name: getExerciseName(entry.exerciseId),
                muscleGroup: getExerciseMuscle(entry.exerciseId),
                sets: entry.sets.filter(s => s.weight > 0 || s.reps > 0),
                notes: entry.notes || undefined,
                exerciseId: entry.exerciseId,
              })),
            };
          }).filter(a => a.exercises.length > 0);

          // Build historical logs map for PDF comparison
          const historicalLogs: Record<string, ExerciseLog[]> = {};
          sessions.forEach(sess => {
            sess.entries.forEach(entry => {
              const key = `${sess.clientId}:${entry.exerciseId}`;
              const logs = exerciseLogs.filter(
                l => l.clientId === sess.clientId && l.exerciseId === entry.exerciseId
              );
              if (logs.length > 0) historicalLogs[key] = logs;
            });
          });

          const now = new Date();
          const pdfData: PdfSessionData = {
            date: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
            duration: elapsedStr,
            athletes: pdfAthletes,
            weightUnit,
            historicalLogs,
          };

          sessions.forEach(sess => {
            const valid = sess.entries.filter(e => e.sets.some(s => s.weight > 0 || s.reps > 0));
            valid.forEach(entry => {
              const log: ExerciseLog = {
                id: generateId(),
                clientId: sess.clientId,
                exerciseId: entry.exerciseId,
                date: today,
                sets: entry.sets.filter(s => s.weight > 0 || s.reps > 0),
                notes: entry.notes || undefined,
              };
              addExerciseLog(log);
              totalLogs++;
            });
          });

          // Cleanup timers
          timerRefs.current.forEach(iv => clearInterval(iv));
          timerRefs.current.clear();

          // Stop any active alarm in the RestTimer overlay
          if (restTimerRef.current) restTimerRef.current.forceStop();
          setTimerAthleteId(null);
          setShowTimerModal(false);
          setTimerAutoStart(false);
          Vibration.cancel();

          // Ask if user wants to share the PDF summary
          Alert.alert(
            '✓ Sesión Finalizada',
            `Se guardaron ${totalLogs} ejercicios de ${sessions.length} atletas.`,
            [
              { text: 'Cerrar', style: 'cancel' },
              {
                text: '📄 Compartir Resumen',
                onPress: () => {
                  generateAndShareWorkoutPdf(pdfData).catch(err => {
                    console.error('PDF error:', err);
                    Alert.alert('Error', 'No se pudo generar el PDF.');
                  });
                },
              },
            ],
          );

          setSessions([]);
          setSelectedAthlete(null);
          setSessionStarted(false);
          setElapsedStr('00:00:00');
          setAthleteElapsed({});
        },
      },
    ]);
  };

  // ─── Add athlete to live session ────
  const addAthlete = (clientId: string) => {
    if (sessions.find(s => s.clientId === clientId)) {
      Alert.alert('Info', 'Este cliente ya está en la sesión.');
      setShowClientPicker(false);
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Auto-load today's plan if available
    const todayDay = WEEKDAY_MAP[new Date().getDay()];
    const plan = client.plans.find(p => p.active && p.weekDays.includes(todayDay));

    let entries: WorkoutEntry[] = [];
    if (plan) {
      entries = plan.exercises.map(pe => ({
        exerciseId: pe.exerciseId,
        sets: Array.from({ length: pe.sets }, (_, i) => ({
          setNumber: i + 1,
          weight: pe.weight || 0,
          reps: parseInt(pe.reps || '0') || 0,
        })),
        notes: pe.notes || '',
      }));
    }

    const newSession: AthleteSession = {
      clientId,
      entries,
      status: entries.length > 0 ? 'working' : 'idle',
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      restTimerMs: 0,
      restTotalMs: 0,
      addedAt: Date.now(),
    };

    setSessions(prev => [...prev, newSession]);
    setSelectedAthlete(clientId);
    setShowClientPicker(false);

    if (!sessionStarted) startSession();
  };

  // ─── Remove athlete ────
  const removeAthlete = (clientId: string) => {
    const name = clients.find(c => c.id === clientId)?.name || 'Atleta';
    Alert.alert('Remover', `¿Quitar a ${name} de la sesión?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive', onPress: () => {
          // Stop their timer
          const iv = timerRefs.current.get(clientId);
          if (iv) { clearInterval(iv); timerRefs.current.delete(clientId); }

          // Stop their rest timer overlay alarm if active
          if (timerAthleteId === clientId && restTimerRef.current) {
            restTimerRef.current.forceStop();
            setTimerAthleteId(null);
            setShowTimerModal(false);
            setTimerAutoStart(false);
          }

          setSessions(prev => prev.filter(s => s.clientId !== clientId));
          if (selectedAthlete === clientId) {
            setSelectedAthlete(sessions.find(s => s.clientId !== clientId)?.clientId || null);
          }
        },
      },
    ]);
  };

  // ─── Update session helper ────
  const updateSession = useCallback((clientId: string, updater: (s: AthleteSession) => AthleteSession) => {
    setSessions(prev => prev.map(s => s.clientId === clientId ? updater(s) : s));
  }, []);

  // ─── Start rest timer for an athlete ────
  const startRestForAthlete = (clientId: string, durationSec: number = 90) => {
    const totalMs = durationSec * 1000;

    updateSession(clientId, s => ({
      ...s,
      status: 'resting',
      restTimerMs: totalMs,
      restTotalMs: totalMs,
    }));

    // Stop existing timer if any
    const existingIv = timerRefs.current.get(clientId);
    if (existingIv) clearInterval(existingIv);

    const startTime = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalMs - elapsed);

      if (remaining <= 0) {
        clearInterval(iv);
        timerRefs.current.delete(clientId);
        Vibration.vibrate(50); // Single tap

        updateSession(clientId, s => ({
          ...s,
          status: 'ready',
          restTimerMs: 0,
        }));
      } else {
        updateSession(clientId, s => ({
          ...s,
          restTimerMs: remaining,
        }));
      }
    }, 100);

    timerRefs.current.set(clientId, iv);
  };

  // ─── Dismiss ready status (athlete continues training) ────
  const dismissReady = (clientId: string) => {
    updateSession(clientId, s => ({ ...s, status: 'working' }));
  };

  // ─── Mark athlete as done ────
  const markDone = (clientId: string) => {
    const iv = timerRefs.current.get(clientId);
    if (iv) { clearInterval(iv); timerRefs.current.delete(clientId); }
    updateSession(clientId, s => ({ ...s, status: 'done', restTimerMs: 0 }));
  };

  // ─── Get session for selected athlete ────
  const selectedSession = sessions.find(s => s.clientId === selectedAthlete);
  const selectedClient = selectedAthlete ? clients.find(c => c.id === selectedAthlete) : null;

  // ─── Exercise helper ────
  const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.name || 'Desconocido';
  const getExerciseMuscle = (id: string) => exercises.find(e => e.id === id)?.muscleGroup.join(', ') || '';

  // ─── Workout CRUD for selected athlete ────
  const addExerciseToAthlete = (exerciseId: string) => {
    if (!selectedAthlete) return;
    updateSession(selectedAthlete, s => {
      if (s.entries.find(e => e.exerciseId === exerciseId)) return s;
      return {
        ...s,
        status: s.status === 'idle' ? 'working' : s.status,
        entries: [...s.entries, {
          exerciseId,
          sets: [{ setNumber: 1, weight: 0, reps: 0 }],
          notes: '',
        }],
      };
    });
    setShowExercisePicker(false);
  };

  const loadRoutineForAthlete = (routineId: string) => {
    if (!selectedAthlete) return;
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
    updateSession(selectedAthlete, s => ({
      ...s,
      entries: newEntries,
      status: 'working',
    }));
    setShowRoutinePicker(false);
  };

  const addSetToEntry = (entryIdx: number) => {
    if (!selectedAthlete) return;
    updateSession(selectedAthlete, s => {
      const entries = [...s.entries];
      const last = entries[entryIdx].sets[entries[entryIdx].sets.length - 1];
      entries[entryIdx] = {
        ...entries[entryIdx],
        sets: [...entries[entryIdx].sets, {
          setNumber: entries[entryIdx].sets.length + 1,
          weight: last?.weight || 0,
          reps: last?.reps || 0,
        }],
      };
      return { ...s, entries };
    });
  };

  const removeSetFromEntry = (entryIdx: number, setIdx: number) => {
    if (!selectedAthlete) return;
    updateSession(selectedAthlete, s => {
      const entries = [...s.entries];
      if (entries[entryIdx].sets.length <= 1) return s;
      const sets = entries[entryIdx].sets.filter((_, i) => i !== setIdx)
        .map((st, i) => ({ ...st, setNumber: i + 1 }));
      entries[entryIdx] = { ...entries[entryIdx], sets };
      return { ...s, entries };
    });
  };

  const updateSetInEntry = (entryIdx: number, setIdx: number, field: 'weight' | 'reps' | 'rpe', value: string) => {
    if (!selectedAthlete) return;
    let numVal = parseFloat(value) || 0;
    if (field === 'weight' && weightUnit === 'lbs' && numVal > 0) {
      numVal = Math.round((numVal / 2.20462) * 100) / 100;
    }
    if (field === 'rpe') numVal = Math.min(10, Math.max(0, numVal));

    updateSession(selectedAthlete, s => {
      const entries = [...s.entries];
      const sets = [...entries[entryIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: numVal };
      entries[entryIdx] = { ...entries[entryIdx], sets };
      return { ...s, entries };
    });
  };

  const removeExerciseEntry = (entryIdx: number) => {
    if (!selectedAthlete) return;
    updateSession(selectedAthlete, s => ({
      ...s,
      entries: s.entries.filter((_, i) => i !== entryIdx),
    }));
  };

  const displayWeight = (w: number): string => {
    if (w <= 0) return '';
    if (weightUnit === 'lbs') return String(Math.round(w * 2.20462 * 10) / 10);
    return String(w);
  };

  // ─── Open full timer modal for selected athlete ────
  const triggerRestForSelected = (entryIdx: number, setIdx: number) => {
    if (!selectedAthlete || !selectedSession) return;

    // If rest timer is already active for this athlete, just open the modal
    if (selectedSession.status === 'resting' && selectedSession.restTimerMs > 0) {
      Keyboard.dismiss();
      setShowTimerModal(true);
      return;
    }

    // Find rest seconds from plan or default
    const clientObj = clients.find(c => c.id === selectedAthlete);
    const todayDay = WEEKDAY_MAP[new Date().getDay()];
    const plan = clientObj?.plans.find(p => p.active && p.weekDays.includes(todayDay));
    const entry = selectedSession.entries[entryIdx];
    let restSec = 90;
    if (plan && entry) {
      const planEx = plan.exercises.find(pe => pe.exerciseId === entry.exerciseId);
      if (planEx?.restSeconds) restSec = planEx.restSeconds;
    }

    // Track context for RPE
    updateSession(selectedAthlete, s => ({
      ...s,
      currentExerciseIndex: entryIdx,
      currentSetIndex: setIdx,
      status: 'resting',
    }));

    // Show RPE feedback immediately when rest starts (before timer)
    setRpeFeedbackCtx({
      clientId: selectedAthlete,
      entryIdx,
      setIdx,
      exerciseName: getExerciseName(entry.exerciseId),
      setNumber: entry.sets[setIdx]?.setNumber || 1,
    });
    setShowRPEModal(true);

    // Also start background timer for the carousel badge
    startRestForAthlete(selectedAthlete, restSec);

    // Prepare the full-screen timer but DO NOT open it yet — wait for RPE to close.
    // Opening it together causes the underlying TextInput to keep focus and the
    // keyboard re-appears on top of the analog clock.
    setTimerAthleteId(selectedAthlete);
    setTimerDefaultSec(restSec);
    setTimerAutoStart(true);
    setTimerKey(prev => prev + 1); // Force remount to reset timer state
    pendingTimerOpenRef.current = true;
    Keyboard.dismiss();
  };

  // ─── Auto-show overlay when alarm fires (even if minimized) ────
  const handleAlarmStart = useCallback(() => {
    Keyboard.dismiss();
    setShowTimerModal(true);
  }, []);

  // ─── Sync background timer when user changes preset in RestTimer ────
  const handleDurationChange = useCallback((newTotalSec: number, newRemainingMs: number) => {
    if (!timerAthleteId) return;
    const clientId = timerAthleteId;
    const newTotalMs = newTotalSec * 1000;

    // Stop existing background timer
    const existingIv = timerRefs.current.get(clientId);
    if (existingIv) { clearInterval(existingIv); timerRefs.current.delete(clientId); }

    // Update session totals
    updateSession(clientId, s => ({
      ...s,
      restTimerMs: newRemainingMs,
      restTotalMs: newTotalMs,
    }));

    // Restart background timer with remaining time
    if (newRemainingMs <= 0) return;
    const startTime = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, newRemainingMs - elapsed);

      if (remaining <= 0) {
        clearInterval(iv);
        timerRefs.current.delete(clientId);
        Vibration.vibrate(50);
        updateSession(clientId, s => ({
          ...s,
          status: 'ready',
          restTimerMs: 0,
        }));
      } else {
        updateSession(clientId, s => ({
          ...s,
          restTimerMs: remaining,
        }));
      }
    }, 100);
    timerRefs.current.set(clientId, iv);
  }, [timerAthleteId, updateSession]);

  // ─── When RestTimer component finishes (alarm dismissed) ────
  const handleTimerModalComplete = () => {
    setShowTimerModal(false);
    setTimerAutoStart(false);
    // If the athlete was in 'ready' state (alarm finished), dismiss it so the mini bar clears
    if (timerAthleteId) {
      dismissReady(timerAthleteId);
    }
    setTimerAthleteId(null);
  };

  // ─── Handle ready notification (athlete ready after rest) ────
  const handleAthleteReady = (clientId: string) => {
    // Stop the alarm in RestTimer if it's still ringing for this athlete
    if (timerAthleteId === clientId && restTimerRef.current) {
      restTimerRef.current.forceStop();
      setTimerAthleteId(null);
      setShowTimerModal(false);
      setTimerAutoStart(false);
    }
    setSelectedAthlete(clientId);
    // RPE was already asked at rest start — just select the athlete
    dismissReady(clientId);
  };

  // Open the deferred timer overlay after the RPE modal finishes closing.
  // Wrapped in a small timeout so the keyboard (if any) has time to fully dismiss.
  const openPendingTimerIfAny = useCallback(() => {
    if (!pendingTimerOpenRef.current) return;
    pendingTimerOpenRef.current = false;
    Keyboard.dismiss();
    setTimeout(() => {
      Keyboard.dismiss();
      setShowTimerModal(true);
    }, 200);
  }, []);

  const handleRPESubmit = (rpe: number) => {
    if (rpeFeedbackCtx) {
      updateSession(rpeFeedbackCtx.clientId, s => {
        const entries = [...s.entries];
        const sets = [...entries[rpeFeedbackCtx.entryIdx].sets];
        sets[rpeFeedbackCtx.setIdx] = { ...sets[rpeFeedbackCtx.setIdx], rpe };
        entries[rpeFeedbackCtx.entryIdx] = { ...entries[rpeFeedbackCtx.entryIdx], sets };
        // Only reset timer when alarm already finished (ready); keep it running while resting
        if (s.status === 'ready') {
          return { ...s, entries, status: 'working' as const, restTimerMs: 0, restTotalMs: 0 };
        }
        // Still resting — save RPE without disrupting the background timer
        return { ...s, entries };
      });
    }
    setShowRPEModal(false);
    setRpeFeedbackCtx(null);
    openPendingTimerIfAny();
  };

  // Count ready athletes for notification badge
  const readyCount = sessions.filter(s => s.status === 'ready').length;

  // ─── Format rest timer ────
  const formatRest = (ms: number): string => {
    const sec = Math.ceil(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Volume calc ────
  const getVolume = (entries: WorkoutEntry[]) =>
    entries.reduce((t, e) => t + e.sets.reduce((s, st) => s + st.weight * st.reps, 0), 0);

  // ─── RENDER: No session started ────
  if (!sessionStarted) {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="people-circle-outline" size={64} color={C.accent} />
          </View>
          <Text style={s.emptyTitle}>Sesión en Vivo</Text>
          <Text style={s.emptySubtitle}>
            Gestiona varios alumnos al mismo tiempo{'\n'}con cronómetros independientes
          </Text>
          <TouchableOpacity style={s.startBtn} onPress={() => setShowClientPicker(true)}>
            <Ionicons name="flash" size={20} color={C.bg} />
            <Text style={s.startBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <View style={s.featureList}>
            {[
              { icon: 'timer-outline', text: 'Cronómetros simultáneos por atleta' },
              { icon: 'notifications-outline', text: 'Alertas cuando un atleta está listo' },
              { icon: 'stats-chart-outline', text: 'Registro de datos en tiempo real' },
              { icon: 'save-outline', text: 'Guardado automático al finalizar' },
            ].map((f, i) => (
              <View key={i} style={s.featureRow}>
                <Ionicons name={f.icon as any} size={18} color={C.accent} />
                <Text style={s.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Client picker to add first athlete */}
        <Modal visible={showClientPicker} animationType="slide" presentationStyle="pageSheet">
          <View style={s.modalBg}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Agregar Atleta</Text>
              <TouchableOpacity onPress={() => setShowClientPicker(false)}>
                <Text style={s.modalClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={sortedPickerClients}
              keyExtractor={item => item.id}
              ListEmptyComponent={
                <Text style={s.emptyListText}>No hay clientes activos disponibles</Text>
              }
              renderItem={({ item }) => {
                const isScheduled = scheduledClientIds.has(item.id);
                return (
                  <TouchableOpacity
                    style={[s.clientPickerItem, isScheduled && s.clientPickerItemScheduled]}
                    onPress={() => addAthlete(item.id)}
                  >
                    <View style={[s.clientPickerAvatar, isScheduled && s.clientPickerAvatarScheduled]}>
                      <Text style={[s.clientPickerInitial, isScheduled && { color: C.bg }]}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.clientPickerName}>{item.name}</Text>
                      {isScheduled ? (
                        <Text style={s.clientPickerScheduled}>📋 Programado para hoy</Text>
                      ) : (
                        <Text style={s.clientPickerSub}>{item.email}</Text>
                      )}
                    </View>
                    {isScheduled && (
                      <View style={s.scheduledBadge}>
                        <Text style={s.scheduledBadgeText}>Hoy</Text>
                      </View>
                    )}
                    <Ionicons name="add-circle" size={24} color={C.accent} />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─── RENDER: Active session ────
  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Top bar: session clock + controls */}
      <View style={s.topBar}>
        <View style={s.sessionClockWrap}>
          <View style={s.liveDot} />
          <Text style={s.sessionClockText}>{elapsedStr}</Text>
        </View>
        <View style={s.topBarActions}>
          <TouchableOpacity
            style={s.addAthleteBtn}
            onPress={() => setShowClientPicker(true)}
          >
            <Ionicons name="person-add" size={16} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.endSessionBtn} onPress={endSession}>
            <Text style={s.endSessionText}>Finalizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Athlete Carousel (horizontal scroll) */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.carouselContent}
        style={s.carousel}
      >
        {sessions.map(sess => {
          const cl = clients.find(c => c.id === sess.clientId);
          const cfg = statusConfig[sess.status];
          const isSelected = selectedAthlete === sess.clientId;
          const progress = sess.restTotalMs > 0 ? (1 - sess.restTimerMs / sess.restTotalMs) : 0;

          return (
            <TouchableOpacity
              key={sess.clientId}
              style={[
                s.athleteCard,
                isSelected && s.athleteCardSelected,
                sess.status === 'ready' && s.athleteCardReady,
              ]}
              onPress={() => {
                if (sess.status === 'ready') {
                  handleAthleteReady(sess.clientId);
                } else {
                  setSelectedAthlete(sess.clientId);
                }
              }}
              onLongPress={() => removeAthlete(sess.clientId)}
              activeOpacity={0.7}
            >
              {/* Status indicator ring */}
              <View style={[s.athleteAvatar, { borderColor: cfg.color }]}>
                <Text style={s.athleteInitial}>
                  {cl?.name.charAt(0).toUpperCase() || '?'}
                </Text>
                {/* Progress ring overlay for resting */}
                {sess.status === 'resting' && (
                  <View style={[s.restProgressRing, {
                    borderColor: C.warning,
                    borderTopColor: 'transparent',
                    transform: [{ rotate: `${progress * 360}deg` }],
                  }]} />
                )}
              </View>

              {/* Name */}
              <Text style={s.athleteName} numberOfLines={1}>
                {cl?.name.split(' ')[0] || '?'}
              </Text>

              {/* Per-athlete elapsed time */}
              <Text style={s.athleteTime}>
                {athleteElapsed[sess.clientId] || '00:00:00'}
              </Text>

              {/* Status badge */}
              <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                {sess.status === 'resting' ? (
                  <Text style={[s.statusBadgeText, { color: cfg.color }]}>
                    {formatRest(sess.restTimerMs)}
                  </Text>
                ) : (
                  <Text style={[s.statusBadgeText, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                )}
              </View>

              {/* Notification pulse for ready */}
              {sess.status === 'ready' && (
                <View style={s.readyPulse} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add athlete card */}
        <TouchableOpacity
          style={s.addAthleteCard}
          onPress={() => setShowClientPicker(true)}
        >
          <Ionicons name="add" size={24} color={C.muted} />
          <Text style={s.addAthleteCardText}>Agregar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Ready athletes banner */}
      {readyCount > 0 && selectedAthlete !== sessions.find(s => s.status === 'ready')?.clientId && (
        <TouchableOpacity
          style={s.readyBanner}
          onPress={() => {
            const ready = sessions.find(s => s.status === 'ready');
            if (ready) handleAthleteReady(ready.clientId);
          }}
        >
          <Ionicons name="notifications" size={18} color={C.bg} />
          <Text style={s.readyBannerText}>
            {readyCount === 1
              ? `${clients.find(c => c.id === sessions.find(s => s.status === 'ready')?.clientId)?.name.split(' ')[0]} está listo`
              : `${readyCount} atletas listos`}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.bg} />
        </TouchableOpacity>
      )}

      {/* Selected athlete workout panel */}
      {selectedSession && selectedClient ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }} keyboardVerticalOffset={85}
        >
          <ScrollView
            style={s.workoutPanel}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Athlete workout header */}
            <View style={s.workoutHeader}>
              <View style={s.whLeft}>
                <Text style={s.whName}>{selectedClient.name}</Text>
                <View style={s.whStats}>
                  <Ionicons name="time-outline" size={12} color={C.accent} />
                  <Text style={[s.whStat, { color: C.accent, fontWeight: '700' }]}>
                    {athleteElapsed[selectedAthlete!] || '00:00:00'}
                  </Text>
                  <Text style={s.whStatDot}>·</Text>
                  <Text style={s.whStat}>
                    {selectedSession.entries.length} ejerc.
                  </Text>
                  <Text style={s.whStatDot}>·</Text>
                  <Text style={s.whStat}>
                    {selectedSession.entries.reduce((t, e) => t + e.sets.length, 0)} series
                  </Text>
                  <Text style={s.whStatDot}>·</Text>
                  <Text style={[s.whStat, { color: C.accent }]}>
                    {(weightUnit === 'lbs'
                      ? Math.round(getVolume(selectedSession.entries) * 2.20462)
                      : getVolume(selectedSession.entries)
                    ).toLocaleString()} {weightUnit}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.whDoneBtn}
                onPress={() => markDone(selectedAthlete!)}
              >
                <Ionicons name="checkmark-done" size={18} color={C.accent} />
              </TouchableOpacity>
            </View>

            {/* Timer indicator if resting — tap to open full timer */}
            {(selectedSession.status === 'resting' || selectedSession.status === 'ready') && (
              <TouchableOpacity
                style={[
                  s.inlineTimerBar,
                  selectedSession.status === 'ready' && s.inlineTimerBarReady,
                ]}
                onPress={() => {
                  if (selectedSession.status === 'ready') {
                    handleAthleteReady(selectedAthlete!);
                  } else {
                    // Re-open timer modal (don't change key — keep running timer)
                    Keyboard.dismiss();
                    setShowTimerModal(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedSession.status === 'ready' ? 'notifications-off' : 'timer-outline'}
                  size={16}
                  color={selectedSession.status === 'ready' ? C.accent : C.warning}
                />
                <Text style={[
                  s.inlineTimerText,
                  selectedSession.status === 'ready' && { color: C.accent },
                ]}>
                  {selectedSession.status === 'ready'
                    ? '¡Listo! — Toca para parar alarma y registrar RPE'
                    : `Descansando — ${formatRest(selectedSession.restTimerMs)}`
                  }
                </Text>
                {selectedSession.status === 'resting' && (
                  <View style={s.inlineTimerTrack}>
                    <View style={[s.inlineTimerFill, {
                      width: `${(1 - selectedSession.restTimerMs / selectedSession.restTotalMs) * 100}%`,
                    }]} />
                  </View>
                )}
                {selectedSession.status === 'ready' ? (
                  <View style={s.inlineStopAlarm}>
                    <Ionicons name="stop" size={12} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="expand-outline" size={14} color={C.muted} />
                )}
              </TouchableOpacity>
            )}

            {/* Empty state */}
            {selectedSession.entries.length === 0 && (
              <View style={s.athleteEmptyState}>
                <Ionicons name="barbell-outline" size={36} color={C.muted} />
                <Text style={s.athleteEmptyText}>Sin ejercicios asignados</Text>
                <View style={s.athleteEmptyActions}>
                  <TouchableOpacity
                    style={s.athleteEmptyBtn}
                    onPress={() => setShowRoutinePicker(true)}
                  >
                    <Ionicons name="clipboard-outline" size={16} color={C.bg} />
                    <Text style={s.athleteEmptyBtnText}>Cargar Rutina</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.athleteEmptyBtn, s.athleteEmptyBtnOutline]}
                    onPress={() => setShowExercisePicker(true)}
                  >
                    <Ionicons name="add" size={16} color={C.accent} />
                    <Text style={[s.athleteEmptyBtnText, { color: C.accent }]}>
                      Ejercicio
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Exercise cards */}
            {selectedSession.entries.map((entry, eIdx) => (
              <View key={eIdx} style={s.exCard}>
                <View style={s.exHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.exName}>{getExerciseName(entry.exerciseId)}</Text>
                    <Text style={s.exMuscle}>{getExerciseMuscle(entry.exerciseId)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExerciseEntry(eIdx)}>
                    <Ionicons name="close-circle" size={20} color={C.danger} />
                  </TouchableOpacity>
                </View>

                {/* Sets header */}
                <View style={s.tblHeader}>
                  <Text style={[s.tblH, { width: 34 }]}>SET</Text>
                  <Text style={[s.tblH, { flex: 1 }]}>PESO ({weightUnit})</Text>
                  <Text style={[s.tblH, { flex: 1 }]}>REPS</Text>
                  <Text style={[s.tblH, { width: 42 }]}>RPE</Text>
                  <View style={{ width: 28 }} />
                </View>

                {/* Sets */}
                {entry.sets.map((set, sIdx) => (
                  <View key={sIdx} style={s.setRow}>
                    <View style={s.setNum}>
                      <Text style={s.setNumText}>{set.setNumber}</Text>
                    </View>
                    <TextInput
                      style={s.setInput}
                      value={displayWeight(set.weight)}
                      onChangeText={v => updateSetInEntry(eIdx, sIdx, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#3d5a80"
                    />
                    <TextInput
                      style={s.setInput}
                      value={set.reps > 0 ? String(set.reps) : ''}
                      onChangeText={v => updateSetInEntry(eIdx, sIdx, 'reps', v)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#3d5a80"
                    />
                    <TextInput
                      style={[
                        s.rpeInput,
                        set.rpe && set.rpe >= 9 ? s.rpeHigh : set.rpe && set.rpe >= 7 ? s.rpeMed : null,
                      ]}
                      value={set.rpe ? String(set.rpe) : ''}
                      onChangeText={v => updateSetInEntry(eIdx, sIdx, 'rpe', v)}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor="#3d5a80"
                      maxLength={4}
                    />
                    <TouchableOpacity
                      style={s.rmSetBtn}
                      onPress={() => removeSetFromEntry(eIdx, sIdx)}
                    >
                      <Ionicons name="remove-circle-outline" size={16} color={C.muted} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Set actions */}
                <View style={s.setActions}>
                  <TouchableOpacity
                    style={s.addSetBtn}
                    onPress={() => addSetToEntry(eIdx)}
                  >
                    <Ionicons name="add" size={14} color={C.accent} />
                    <Text style={s.addSetText}>Serie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.restBtn}
                    onPress={() => {
                      const firstIncomplete = entry.sets.findIndex(st => st.rpe == null || st.rpe === undefined);
                      const targetIdx = firstIncomplete >= 0 ? firstIncomplete : entry.sets.length - 1;
                      triggerRestForSelected(eIdx, targetIdx);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="timer" size={20} color="#0a1f0a" />
                    <Text style={s.restBtnText}>Descanso</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add more exercises */}
            {selectedSession.entries.length > 0 && (
              <View style={s.addMoreRow}>
                <TouchableOpacity style={s.addMoreBtn} onPress={() => setShowExercisePicker(true)}>
                  <Ionicons name="add-circle" size={18} color={C.accent} />
                  <Text style={s.addMoreText}>Ejercicio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.addMoreBtn} onPress={() => setShowRoutinePicker(true)}>
                  <Ionicons name="clipboard-outline" size={16} color={C.accent} />
                  <Text style={s.addMoreText}>Rutina</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={s.noSelectionWrap}>
          <Ionicons name="hand-left-outline" size={36} color={C.muted} />
          <Text style={s.noSelectionText}>Selecciona un atleta arriba</Text>
        </View>
      )}

      {/* ─── Modals ──── */}

      {/* Client Picker */}
      <Modal visible={showClientPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalBg}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Agregar Atleta</Text>
            <TouchableOpacity onPress={() => setShowClientPicker(false)}>
              <Text style={s.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={sortedPickerClients}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={s.emptyListText}>No hay más clientes disponibles</Text>
            }
            renderItem={({ item }) => {
              const isScheduled = scheduledClientIds.has(item.id);
              return (
                <TouchableOpacity
                  style={[s.clientPickerItem, isScheduled && s.clientPickerItemScheduled]}
                  onPress={() => addAthlete(item.id)}
                >
                  <View style={[s.clientPickerAvatar, isScheduled && s.clientPickerAvatarScheduled]}>
                    <Text style={[s.clientPickerInitial, isScheduled && { color: C.bg }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientPickerName}>{item.name}</Text>
                    {isScheduled ? (
                      <Text style={s.clientPickerScheduled}>📋 Programado para hoy</Text>
                    ) : (
                      <Text style={s.clientPickerSub}>{item.email}</Text>
                    )}
                  </View>
                  {isScheduled && (
                    <View style={s.scheduledBadge}>
                      <Text style={s.scheduledBadgeText}>Hoy</Text>
                    </View>
                  )}
                  <Ionicons name="add-circle" size={24} color={C.accent} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Exercise Picker */}
      <Modal visible={showExercisePicker} animationType="slide" presentationStyle="pageSheet">
        <ExercisePicker
          exercises={exercises}
          onSelect={(ex) => addExerciseToAthlete(ex.id)}
          onClose={() => setShowExercisePicker(false)}
        />
      </Modal>

      {/* Routine Picker */}
      <Modal visible={showRoutinePicker} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalBg}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Cargar Rutina</Text>
            <TouchableOpacity onPress={() => { setRoutineSearch(''); setShowRoutinePicker(false); }}>
              <Text style={s.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
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
          <FlatList
            data={routines.filter(r => {
              if (!routineSearch.trim()) return true;
              const q = routineSearch.toLowerCase();
              return r.name.toLowerCase().includes(q)
                || (r.description || '').toLowerCase().includes(q);
            })}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
                <Ionicons name="search-outline" size={36} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 14 }}>Sin resultados para "{routineSearch}"</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.clientPickerItem}
                onPress={() => loadRoutineForAthlete(item.id)}
              >
                <View style={[s.clientPickerAvatar, { backgroundColor: 'rgba(100,255,218,0.1)' }]}>
                  <Ionicons name="clipboard-outline" size={18} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.clientPickerName}>{item.name}</Text>
                  <Text style={s.clientPickerSub}>{item.exercises.length} ejercicios</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.accent} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Full Timer Overlay — always mounted so timer doesn't lose state on minimize */}
      {timerAthleteId && (
        <View
          style={[
            s.timerOverlay,
            !showTimerModal && s.timerOverlayHidden,
          ]}
          pointerEvents={showTimerModal ? 'auto' : 'none'}
        >
          <SafeAreaView style={s.timerModalBg} edges={['top', 'bottom']}>
            <View style={s.timerModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.timerModalTitle}>
                  {clients.find(c => c.id === timerAthleteId)?.name || 'Atleta'}
                </Text>
                <Text style={s.timerModalSub}>Cronómetro de descanso</Text>
              </View>
              <TouchableOpacity
                style={s.timerModalCloseBtn}
                onPress={() => setShowTimerModal(false)}
              >
                <Ionicons name="chevron-down" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <View style={s.timerModalBody}>
              <RestTimer
                ref={restTimerRef}
                key={timerKey}
                defaultRestSeconds={timerDefaultSec}
                onTimerComplete={handleTimerModalComplete}
                onAlarmStart={handleAlarmStart}
                onDurationChange={handleDurationChange}
                initialAnalogMode={preferredAnalogMode}
                onModeChange={setPreferredAnalogMode}
                alarmUntilDismissed
                autoStart={timerAutoStart}
                athleteName={selectedClient?.name}
              />
            </View>
            <TouchableOpacity
              style={s.timerModalMinimize}
              onPress={() => setShowTimerModal(false)}
            >
              <Ionicons name="chevron-down-outline" size={16} color={C.muted} />
              <Text style={s.timerModalMinText}>Minimizar — el timer sigue en segundo plano</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      )}

      {/* RPE Feedback Modal */}
      <RPEFeedbackModal
        visible={showRPEModal}
        exerciseName={rpeFeedbackCtx?.exerciseName || ''}
        setNumber={rpeFeedbackCtx?.setNumber || 1}
        onSubmit={handleRPESubmit}
        onSkip={() => { setShowRPEModal(false); setRpeFeedbackCtx(null); openPendingTimerIfAny(); }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────
const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { color: C.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, marginTop: 24,
  },
  startBtnText: { color: C.bg, fontSize: 16, fontWeight: '800' },
  featureList: { marginTop: 36, gap: 14, width: '100%' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { color: C.muted, fontSize: 14 },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sessionClockWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4444',
  },
  sessionClockText: {
    color: C.text, fontSize: 18, fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addAthleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.border, justifyContent: 'center', alignItems: 'center',
  },
  endSessionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)',
  },
  endSessionText: { color: '#ff4444', fontSize: 13, fontWeight: '700' },

  // Carousel
  carousel: { maxHeight: 124, borderBottomWidth: 1, borderBottomColor: C.border },
  carouselContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  athleteCard: {
    alignItems: 'center', width: 76, paddingVertical: 6, paddingHorizontal: 4,
    borderRadius: 14, backgroundColor: C.card,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  athleteCardSelected: {
    borderColor: C.accent, backgroundColor: C.accentDim,
  },
  athleteCardReady: {
    borderColor: C.accent, backgroundColor: C.accentSoft,
  },
  athleteAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.border, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  athleteInitial: { color: C.text, fontSize: 16, fontWeight: '800' },
  restProgressRing: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    borderWidth: 2,
  },
  athleteName: { color: C.text, fontSize: 11, fontWeight: '600', marginTop: 4 },
  athleteTime: {
    color: C.muted, fontSize: 9, fontWeight: '600',
    fontVariant: ['tabular-nums'] as any, marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },
  readyPulse: {
    position: 'absolute', top: 2, right: 2,
    width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent,
  },
  addAthleteCard: {
    alignItems: 'center', justifyContent: 'center', width: 66,
    paddingVertical: 10, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  addAthleteCardText: { color: C.muted, fontSize: 10, fontWeight: '600', marginTop: 4 },

  // Ready banner
  readyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, paddingVertical: 10,
    backgroundColor: C.accent, borderRadius: 10,
  },
  readyBannerText: { color: C.bg, fontSize: 14, fontWeight: '700' },

  // Workout panel
  workoutPanel: { flex: 1 },
  workoutHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  whLeft: { flex: 1 },
  whName: { color: C.text, fontSize: 17, fontWeight: '700' },
  whStats: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5 },
  whStat: { color: C.muted, fontSize: 12, fontWeight: '600' },
  whStatDot: { color: C.border, fontSize: 12 },
  whDoneBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.accent,
  },

  // Inline timer
  inlineTimerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginVertical: 8,
    padding: 10, backgroundColor: 'rgba(255,167,38,0.08)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,167,38,0.2)',
  },
  inlineTimerBarReady: {
    backgroundColor: C.accentSoft, borderColor: C.accent,
  },
  inlineTimerText: { color: C.warning, fontSize: 12, fontWeight: '600', flex: 1 },
  inlineTimerTrack: {
    width: 60, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,167,38,0.15)',
  },
  inlineTimerFill: { height: 4, borderRadius: 2, backgroundColor: C.warning },
  inlineStopAlarm: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#ff4444', justifyContent: 'center', alignItems: 'center',
  },

  // Timer overlay (always mounted, visibility toggled)
  timerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: C.bg,
  },
  timerOverlayHidden: {
    opacity: 0,
  },
  timerModalBg: { flex: 1, backgroundColor: C.bg },
  timerModalHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  timerModalTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  timerModalSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  timerModalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.border, justifyContent: 'center', alignItems: 'center',
  },
  timerModalBody: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerModalMinimize: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border,
  },
  timerModalMinText: { color: C.muted, fontSize: 12 },

  // Athlete empty
  athleteEmptyState: { alignItems: 'center', padding: 32, gap: 10 },
  athleteEmptyText: { color: C.muted, fontSize: 14 },
  athleteEmptyActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  athleteEmptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.accent,
  },
  athleteEmptyBtnOutline: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: C.accent,
  },
  athleteEmptyBtnText: { color: C.bg, fontSize: 13, fontWeight: '700' },

  // Exercise card
  exCard: {
    marginHorizontal: 14, marginTop: 10,
    backgroundColor: C.card, borderRadius: 12, overflow: 'hidden',
  },
  exHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  exName: { color: C.text, fontWeight: '700', fontSize: 15 },
  exMuscle: { color: C.muted, fontSize: 11, marginTop: 2 },

  // Table
  tblHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  tblH: { color: C.accent, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 3, gap: 6 },
  setNum: { width: 34, alignItems: 'center' },
  setNumText: { color: C.muted, fontWeight: '700', fontSize: 13 },
  setInput: {
    flex: 1, backgroundColor: C.border, paddingVertical: 8, paddingHorizontal: 8,
    borderRadius: 8, color: C.text, fontSize: 15, fontWeight: '600', textAlign: 'center',
    borderWidth: 1, borderColor: '#2d4a6f',
  },
  rpeInput: {
    width: 42, backgroundColor: C.border, paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 8, color: C.text, fontSize: 13, fontWeight: '600', textAlign: 'center',
    borderWidth: 1, borderColor: '#2d4a6f',
  },
  rpeHigh: { borderColor: C.danger, backgroundColor: 'rgba(255,107,107,0.1)' },
  rpeMed: { borderColor: C.warning, backgroundColor: 'rgba(255,167,38,0.08)' },
  rmSetBtn: { width: 28, alignItems: 'center' },

  // Set actions
  setActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border },
  addSetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 4,
  },
  addSetText: { color: C.accent, fontSize: 11, fontWeight: '600' },
  restBtn: {
    flex: 1.6,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
    backgroundColor: C.success,
    borderLeftWidth: 1, borderLeftColor: C.border,
  },
  restBtnText: { color: '#0a1f0a', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // Add more
  addMoreRow: { flexDirection: 'row', gap: 8, marginHorizontal: 14, marginTop: 10 },
  addMoreBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 5,
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: 10,
  },
  addMoreText: { color: C.accent, fontWeight: '600', fontSize: 12 },

  // No selection
  noSelectionWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  noSelectionText: { color: C.muted, fontSize: 14 },

  // Modals
  modalBg: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.card,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  modalClose: { color: C.accent, fontWeight: '600', fontSize: 16 },
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
  emptyListText: { color: C.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  clientPickerItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: C.card, gap: 12,
  },
  clientPickerItemScheduled: {
    backgroundColor: C.accentSoft,
    borderBottomColor: C.accentDim,
  },
  clientPickerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.border, justifyContent: 'center', alignItems: 'center',
  },
  clientPickerAvatarScheduled: {
    backgroundColor: C.accent,
  },
  clientPickerInitial: { color: C.accent, fontSize: 16, fontWeight: '800' },
  clientPickerName: { color: C.text, fontSize: 16, fontWeight: '500' },
  clientPickerSub: { color: C.muted, fontSize: 13, marginTop: 1 },
  clientPickerScheduled: { color: C.accent, fontSize: 12, fontWeight: '600', marginTop: 2 },
  scheduledBadge: {
    backgroundColor: C.accent, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 4,
  },
  scheduledBadgeText: { color: C.bg, fontSize: 11, fontWeight: '800' },
});
