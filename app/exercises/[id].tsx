import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Image, Animated, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';
import { getExerciseGif } from '../../src/assets/exerciseGifs';
import { MuscleBodyMap } from '../../src/components/MuscleBodyMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Muscle anatomy data ──────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MUSCLE_MAP: Record<string, { icon: IoniconsName; region: string; color: string }> = {
  'Pectoral Mayor': { icon: 'fitness-outline', region: 'Pecho', color: '#7c4dff' },
  'Pectoral Mayor (porción esternal)': { icon: 'fitness-outline', region: 'Pecho', color: '#7c4dff' },
  'Pectoral Mayor (porción clavicular)': { icon: 'fitness-outline', region: 'Pecho Superior', color: '#9c6dff' },
  'Pectoral Inferior': { icon: 'fitness-outline', region: 'Pecho Inferior', color: '#6c3dff' },
  'Deltoides Anterior': { icon: 'arrow-up-circle-outline', region: 'Hombro Frontal', color: '#FFA726' },
  'Deltoides Lateral': { icon: 'arrow-up-circle-outline', region: 'Hombro Lateral', color: '#FFB74D' },
  'Deltoides Posterior': { icon: 'arrow-up-circle-outline', region: 'Hombro Posterior', color: '#FF9800' },
  'Deltoides': { icon: 'arrow-up-circle-outline', region: 'Hombros', color: '#FFA726' },
  'Tríceps Braquial': { icon: 'barbell-outline', region: 'Tríceps', color: '#ef5350' },
  'Tríceps Braquial (las 3 cabezas)': { icon: 'barbell-outline', region: 'Tríceps (3 cabezas)', color: '#ef5350' },
  'Tríceps Braquial (cabeza lateral y medial)': { icon: 'barbell-outline', region: 'Tríceps (lateral/medial)', color: '#ef5350' },
  'Bíceps Braquial': { icon: 'barbell-outline', region: 'Bíceps', color: '#66bb6a' },
  'Bíceps Braquial (cabeza corta y larga)': { icon: 'barbell-outline', region: 'Bíceps (2 cabezas)', color: '#66bb6a' },
  'Bíceps (estabilizador)': { icon: 'barbell-outline', region: 'Bíceps', color: '#66bb6a' },
  'Braquial': { icon: 'barbell-outline', region: 'Braquial', color: '#4caf50' },
  'Braquiorradial': { icon: 'hand-left-outline', region: 'Antebrazo', color: '#78909c' },
  'Dorsal Ancho': { icon: 'expand-outline', region: 'Dorsal', color: '#4fc3f7' },
  'Redondo Mayor': { icon: 'expand-outline', region: 'Dorsal Lateral', color: '#29b6f6' },
  'Romboides': { icon: 'contract-outline', region: 'Espalda Media', color: '#4db6ac' },
  'Trapecio Inferior': { icon: 'chevron-down-outline', region: 'Trapecio Inferior', color: '#26a69a' },
  'Trapecio Superior': { icon: 'chevron-up-outline', region: 'Trapecio Superior', color: '#26a69a' },
  'Trapecio Medio': { icon: 'remove-outline', region: 'Trapecio Medio', color: '#26a69a' },
  'Trapecio': { icon: 'chevron-up-outline', region: 'Trapecio', color: '#26a69a' },
  'Erectores Espinales': { icon: 'resize-outline', region: 'Espalda Baja', color: '#8d6e63' },
  'Cuádriceps': { icon: 'walk-outline', region: 'Cuádriceps', color: '#26c6da' },
  'Glúteo Mayor': { icon: 'body-outline', region: 'Glúteo Mayor', color: '#ec407a' },
  'Glúteo Medio': { icon: 'body-outline', region: 'Glúteo Medio', color: '#f06292' },
  'Isquiotibiales': { icon: 'walk-outline', region: 'Isquiotibiales', color: '#00bcd4' },
  'Aductores': { icon: 'walk-outline', region: 'Aductores', color: '#0097a7' },
  'Core': { icon: 'body-outline', region: 'Core', color: '#ffca28' },
  'Recto Abdominal': { icon: 'body-outline', region: 'Abdominales', color: '#ffca28' },
  'Transverso Abdominal': { icon: 'body-outline', region: 'Core Profundo', color: '#ffd54f' },
  'Oblicuos': { icon: 'body-outline', region: 'Oblicuos', color: '#ffb300' },
  'Serrato Anterior': { icon: 'fitness-outline', region: 'Serrato', color: '#ab47bc' },
  'Anconeo': { icon: 'barbell-outline', region: 'Codo', color: '#ef5350' },
  'Antebrazos': { icon: 'hand-left-outline', region: 'Antebrazos', color: '#78909c' },
  'Supraespinoso': { icon: 'arrow-up-circle-outline', region: 'Manguito Rotador', color: '#ff8a65' },
  'Pronador Redondo': { icon: 'hand-left-outline', region: 'Antebrazo Interno', color: '#78909c' },
  'Glúteos': { icon: 'body-outline', region: 'Glúteos', color: '#ec407a' },
  'Hombros': { icon: 'arrow-up-circle-outline', region: 'Hombros', color: '#FFA726' },
};

/** Returns an Ionicons name based on exercise muscle group / equipment */
const getHeroIcon = (exercise: { muscleGroup: string[]; equipment?: string }): IoniconsName => {
  const equip = (exercise.equipment || '').toLowerCase();
  const groups = exercise.muscleGroup.map(g => g.toLowerCase());
  if (groups.includes('cardio')) return 'pulse-outline';
  if (equip.includes('peso corporal') || equip === '') return 'body-outline';
  if (groups.includes('core') || groups.includes('cuerpo completo')) return 'body-outline';
  return 'barbell-outline';
};

const getDifficultyColor = (d?: string) => {
  if (d === 'Principiante') return '#66bb6a';
  if (d === 'Intermedio') return '#FFA726';
  if (d === 'Avanzado') return '#ef5350';
  return '#8892b0';
};

// Animated pulse for exercise icon
const PulsingIcon = ({ iconName, circleStyle, iconColor }: { iconName: IoniconsName; circleStyle: any; iconColor: string }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[circleStyle, { transform: [{ scale }] }]}>
      <Ionicons name={iconName} size={44} color={iconColor} />
    </Animated.View>
  );
};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { exercises, updateExercise, deleteExercise, clients, exerciseLogs } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const exercise = exercises.find(e => e.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');

  // Clients who have logged this exercise
  const clientsWithLogs = React.useMemo(() => {
    const map = new Map<string, { clientId: string; name: string; maxWeight: number; sessions: number }>();
    exerciseLogs
      .filter(l => l.exerciseId === id)
      .forEach(log => {
        const c = clients.find(cl => cl.id === log.clientId);
        if (!c) return;
        const maxW = Math.max(...log.sets.map(set => set.weight));
        const existing = map.get(log.clientId);
        if (!existing) {
          map.set(log.clientId, { clientId: log.clientId, name: c.name, maxWeight: maxW, sessions: 1 });
        } else {
          existing.sessions++;
          if (maxW > existing.maxWeight) existing.maxWeight = maxW;
        }
      });
    return Array.from(map.values());
  }, [exerciseLogs, id, clients]);

  useEffect(() => {
    if (exercise) {
      setName(exercise.name);
      setMuscleGroup(exercise.muscleGroup.join(', '));
      setDescription(exercise.description || '');
      setEquipment(exercise.equipment || '');
    }
  }, [exercise]);

  if (!exercise) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={C.muted} />
          <Text style={s.notFoundText}>Ejercicio no encontrado</Text>
          <TouchableOpacity style={s.backBtnAlt} onPress={() => router.back()}>
            <Text style={s.backBtnAltText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    if (!name.trim() || !muscleGroup.trim()) {
      Alert.alert('Error', 'Nombre y Grupo Muscular son obligatorios.');
      return;
    }
    updateExercise(exercise.id, {
      name: name.trim(),
      muscleGroup: muscleGroup.split(',').map(g => g.trim()).filter(Boolean),
      description: description.trim() || undefined,
      equipment: equipment.trim() || undefined,
    });
    setIsEditing(false);
    Alert.alert('Éxito', 'Ejercicio actualizado correctamente.');
  };

  const handleDelete = () => {
    Alert.alert('Eliminar Ejercicio', `¿Estás seguro de que quieres eliminar "${exercise.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteExercise(exercise.id); router.back(); } },
    ]);
  };

  const localGif = getExerciseGif(exercise.id);
  const hasRichData = exercise.instructions || exercise.primaryMuscles || localGif;
  const diffColor = getDifficultyColor(exercise.difficulty);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{exercise.name}</Text>
        <TouchableOpacity
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          style={s.headerBtn}
        >
          {isEditing ? (
            <Text style={s.saveText}>Guardar</Text>
          ) : (
            <Ionicons name="create-outline" size={22} color={C.accent} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ═══ HERO SECTION ═══ */}
        <View style={s.heroSection}>
          {/* GIF or Animated Icon */}
          {localGif && !gifFailed ? (
            <View style={s.gifContainer}>
              <Image
                source={localGif}
                style={s.gifImage}
                resizeMode="contain"
                onError={() => setGifFailed(true)}
              />
              <View style={s.gifOverlay}>
                <View style={s.gifBadge}>
                  <Ionicons name="videocam" size={10} color={C.accent} />
                  <Text style={s.gifBadgeText}>Demo</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.heroIconContainer}>
              <PulsingIcon iconName={getHeroIcon(exercise)} circleStyle={s.heroIconCircle} iconColor={C.accent} />
            </View>
          )}

          {/* Title + Meta */}
          <Text style={s.heroTitle}>{exercise.name}</Text>

          <View style={s.heroMeta}>
            {exercise.difficulty && (
              <View style={[s.diffBadge, { backgroundColor: diffColor + '20', borderColor: diffColor }]}>
                <View style={[s.diffDot, { backgroundColor: diffColor }]} />
                <Text style={[s.diffText, { color: diffColor }]}>{exercise.difficulty}</Text>
              </View>
            )}
            {exercise.equipment && (
              <View style={s.equipBadge}>
                <Ionicons name="construct-outline" size={12} color={C.muted} />
                <Text style={s.equipText}>{exercise.equipment}</Text>
              </View>
            )}
          </View>

          {/* Popularity Stars */}
          {exercise.popularity && (
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Ionicons
                  key={i}
                  name={i <= exercise.popularity! ? 'star' : 'star-outline'}
                  size={16}
                  color={i <= exercise.popularity! ? C.warning : C.border}
                />
              ))}
              <Text style={s.starsLabel}>Popularidad</Text>
            </View>
          )}

          {exercise.description && (
            <Text style={s.heroDesc}>{exercise.description}</Text>
          )}
        </View>

        {/* ═══ MUSCLE ANATOMY ═══ */}
        {(exercise.primaryMuscles || exercise.secondaryMuscles) && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="body-outline" size={20} color={C.accent} />
              <Text style={s.sectionTitle}>Anatomía Muscular</Text>
            </View>

            {/* Body Map Visual */}
            <MuscleBodyMap
              primaryMuscles={exercise.primaryMuscles}
              secondaryMuscles={exercise.secondaryMuscles}
              size={180}
            />

            {exercise.primaryMuscles && exercise.primaryMuscles.length > 0 && (
              <>
                <Text style={s.muscleLabel}><Ionicons name="ellipse" size={10} color="#ef5350" /> Músculos Principales</Text>
                <View style={s.muscleGrid}>
                  {exercise.primaryMuscles.map((m, i) => {
                    const info = MUSCLE_MAP[m] || { icon: 'barbell-outline' as IoniconsName, region: m, color: '#64ffda' };
                    return (
                      <View key={i} style={[s.muscleChip, { borderColor: info.color }]}>
                        <Ionicons name={info.icon} size={20} color={info.color} />
                        <View>
                          <Text style={[s.muscleChipName, { color: info.color }]}>{info.region}</Text>
                          <Text style={s.muscleChipDetail}>{m}</Text>
                        </View>
                        <View style={[s.intensityBar, { backgroundColor: info.color }]}>
                          <View style={[s.intensityFill, { width: '100%', backgroundColor: info.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
              <>
                <Text style={[s.muscleLabel, { marginTop: 12 }]}><Ionicons name="ellipse" size={10} color={C.warning} /> Músculos Secundarios</Text>
                <View style={s.muscleGrid}>
                  {exercise.secondaryMuscles.map((m, i) => {
                    const info = MUSCLE_MAP[m] || { icon: 'barbell-outline' as IoniconsName, region: m, color: '#8892b0' };
                    return (
                      <View key={i} style={[s.muscleChipSecondary, { borderColor: info.color + '60' }]}>
                        <Ionicons name={info.icon} size={18} color={info.color + 'cc'} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.muscleChipName, { color: info.color + 'cc' }]}>{info.region}</Text>
                        </View>
                        <View style={[s.intensityBarSmall, { backgroundColor: info.color + '30' }]}>
                          <View style={[s.intensityFill, { width: '50%', backgroundColor: info.color + '80' }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* ═══ TECHNICAL EXECUTION ═══ */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={C.accent} />
              <Text style={s.sectionTitle}>Ejecución Técnica</Text>
            </View>
            {exercise.instructions.map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={s.stepNumber}>
                  <Text style={s.stepNumberText}>{i + 1}</Text>
                </View>
                <View style={s.stepLine}>
                  {i < exercise.instructions!.length - 1 && <View style={s.stepConnector} />}
                </View>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ═══ PRO TIPS ═══ */}
        {exercise.tips && exercise.tips.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color={C.warning} />
              <Text style={s.sectionTitle}>Tips Pro</Text>
            </View>
            {exercise.tips.map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <Ionicons name="checkmark-circle" size={16} color={C.success} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ═══ COMMON MISTAKES ═══ */}
        {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="warning-outline" size={20} color={C.danger} />
              <Text style={s.sectionTitle}>Errores Comunes</Text>
            </View>
            {exercise.commonMistakes.map((mistake, i) => (
              <View key={i} style={s.mistakeRow}>
                <Ionicons name="close-circle" size={16} color={C.danger} />
                <Text style={s.mistakeText}>{mistake}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ═══ EDIT FORM ═══ */}
        {isEditing && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="create-outline" size={20} color={C.accent} />
              <Text style={s.sectionTitle}>Editar Información</Text>
            </View>

            <Text style={s.label}>Nombre *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Nombre del ejercicio" placeholderTextColor={C.muted} />

            <Text style={s.label}>Grupo Muscular * (separar por comas)</Text>
            <TextInput style={s.input} value={muscleGroup} onChangeText={setMuscleGroup} placeholder="Ej. Hombros, Tríceps" placeholderTextColor={C.muted} />

            <Text style={s.label}>Descripción</Text>
            <TextInput style={[s.input, s.textArea]} value={description} onChangeText={setDescription} placeholder="Descripción técnica..." placeholderTextColor={C.muted} multiline numberOfLines={4} />

            <Text style={s.label}>Equipamiento</Text>
            <TextInput style={s.input} value={equipment} onChangeText={setEquipment} placeholder="Ej. Barra, Mancuernas" placeholderTextColor={C.muted} />

            <TouchableOpacity style={s.cancelEditBtn} onPress={() => setIsEditing(false)}>
              <Text style={s.cancelEditText}>Cancelar edición</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ WEIGHT LOGS PER CLIENT ═══ */}
        {clientsWithLogs.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="trending-up" size={20} color={C.accent} />
              <Text style={s.sectionTitle}>Historial por Alumno</Text>
            </View>
            {clientsWithLogs.map((cl) => (
              <TouchableOpacity
                key={cl.clientId}
                style={s.clientLogCard}
                onPress={() => router.push(`/clients/exercise-history?exerciseId=${id}&clientId=${cl.clientId}`)}
                activeOpacity={0.7}
              >
                <View style={s.clientLogLeft}>
                  <View style={s.clientLogAvatar}>
                    <Ionicons name="person" size={16} color={C.accent} />
                  </View>
                  <View>
                    <Text style={s.clientLogName}>{cl.name}</Text>
                    <Text style={s.clientLogMeta}>{cl.sessions} sesiones</Text>
                  </View>
                </View>
                <View style={s.clientLogRight}>
                  <Text style={s.clientLogMax}>{cl.maxWeight}kg</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Delete */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={C.danger} />
          <Text style={s.deleteBtnText}>Eliminar Ejercicio</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { color: C.muted, fontSize: 16 },
  backBtnAlt: { marginTop: 16, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnAltText: { color: C.bg, fontWeight: 'bold' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text, flex: 1, textAlign: 'center' },
  saveText: { color: C.accent, fontSize: 16, fontWeight: '600' },

  // Hero
  heroSection: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  gifContainer: { width: SCREEN_WIDTH - 40, height: 260, borderRadius: 20, overflow: 'hidden', backgroundColor: C.card, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  gifImage: { width: '100%', height: '100%', backgroundColor: C.bg },
  gifOverlay: { position: 'absolute', top: 10, right: 10 },
  gifBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(10,25,47,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gifBadgeText: { color: C.accent, fontSize: 10, fontWeight: '600' },
  heroIconContainer: { marginBottom: 16 },
  heroIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.accent },

  heroTitle: { fontSize: 24, fontWeight: 'bold', color: C.text, textAlign: 'center', marginBottom: 8 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' },
  diffBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  diffText: { fontSize: 12, fontWeight: '600' },
  equipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  equipText: { color: C.muted, fontSize: 12 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  starsLabel: { color: C.muted, fontSize: 11, marginLeft: 6 },
  heroDesc: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  // Sections
  section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, padding: 16, borderRadius: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: 'bold' },

  // Muscle anatomy
  muscleLabel: { color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  muscleGrid: { gap: 6 },
  muscleChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, padding: 12, borderRadius: 12, borderLeftWidth: 3 },
  muscleChipSecondary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, padding: 10, borderRadius: 10, borderLeftWidth: 2 },
  muscleChipName: { fontSize: 13, fontWeight: '600' },
  muscleChipDetail: { fontSize: 10, color: C.muted, marginTop: 1 },
  intensityBar: { position: 'absolute', right: 12, width: 40, height: 4, borderRadius: 2, overflow: 'hidden' },
  intensityBarSmall: { position: 'absolute', right: 12, width: 30, height: 3, borderRadius: 2, overflow: 'hidden' },
  intensityFill: { height: '100%', borderRadius: 2 },

  // Steps
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 10 },
  stepNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: C.bg, fontSize: 12, fontWeight: 'bold' },
  stepLine: { position: 'absolute', left: 12, top: 26, bottom: -4 },
  stepConnector: { width: 2, height: '100%', backgroundColor: C.border },
  stepText: { flex: 1, color: C.text, fontSize: 14, lineHeight: 22, paddingTop: 2 },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipText: { flex: 1, color: C.text, fontSize: 13, lineHeight: 20 },

  // Mistakes
  mistakeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  mistakeText: { flex: 1, color: C.text, fontSize: 13, lineHeight: 20 },

  // Edit form
  label: { color: C.accent, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.inputBg, padding: 12, borderRadius: 8, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  cancelEditBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelEditText: { color: C.muted, fontSize: 14 },

  // Client logs
  clientLogCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.border, padding: 12, borderRadius: 10, marginBottom: 8 },
  clientLogLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clientLogAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accentDim, justifyContent: 'center', alignItems: 'center' },
  clientLogName: { color: C.text, fontWeight: '600', fontSize: 14 },
  clientLogMeta: { color: C.muted, fontSize: 11, marginTop: 2 },
  clientLogRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientLogMax: { color: C.accent, fontWeight: 'bold', fontSize: 18 },

  // Delete
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: C.danger, gap: 8 },
  deleteBtnText: { color: C.danger, fontWeight: '600', fontSize: 15 },
});
