import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateId } from '../../src/utils/generateId';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

const DIFFICULTY_OPTIONS = ['Principiante', 'Intermedio', 'Avanzado'] as const;

export default function AddExerciseScreen() {
  const router = useRouter();
  const { addExercise } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('');
  const [difficulty, setDifficulty] = useState<'Principiante' | 'Intermedio' | 'Avanzado'>('Intermedio');
  const [primaryMuscles, setPrimaryMuscles] = useState('');
  const [secondaryMuscles, setSecondaryMuscles] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tips, setTips] = useState('');
  const [commonMistakes, setCommonMistakes] = useState('');

  const handleSave = () => {
    if (!name || !muscleGroup) {
      Alert.alert('Error', 'Nombre y Grupo Muscular son obligatorios.');
      return;
    }

    const parseList = (text: string) => text.split('\n').map(s => s.trim()).filter(Boolean);

    const newExercise = {
      id: generateId(),
      name,
      muscleGroup: muscleGroup.split(',').map(g => g.trim()),
      description,
      equipment: equipment || undefined,
      difficulty,
      primaryMuscles: primaryMuscles ? parseList(primaryMuscles) : undefined,
      secondaryMuscles: secondaryMuscles ? parseList(secondaryMuscles) : undefined,
      instructions: instructions ? parseList(instructions) : undefined,
      tips: tips ? parseList(tips) : undefined,
      commonMistakes: commonMistakes ? parseList(commonMistakes) : undefined,
      popularity: 3,
      icon: '💪',
    };

    addExercise(newExercise);
    router.back();
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nuevo Ejercicio</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Nombre */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Nombre del Ejercicio *</Text>
          <TextInput
            style={s.input}
            placeholder="Ej. Press Militar"
            value={name}
            onChangeText={setName}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Grupo Muscular */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Grupo Muscular * (separar por comas)</Text>
          <TextInput
            style={s.input}
            placeholder="Ej. Hombros, Tríceps"
            value={muscleGroup}
            onChangeText={setMuscleGroup}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Equipamiento */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Equipamiento</Text>
          <TextInput
            style={s.input}
            placeholder="Ej. Barra, Mancuernas"
            value={equipment}
            onChangeText={setEquipment}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Dificultad */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Dificultad</Text>
          <View style={s.chipRow}>
            {DIFFICULTY_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[s.chip, difficulty === d && s.chipActive]}
                onPress={() => setDifficulty(d)}
              >
                <Text style={[s.chipText, difficulty === d && s.chipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Descripción */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Descripción</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Breve descripción del ejercicio..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Músculos Primarios */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Músculos Primarios (uno por línea)</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder={"Pectoral Mayor\nDeltoides Anterior"}
            value={primaryMuscles}
            onChangeText={setPrimaryMuscles}
            multiline
            numberOfLines={3}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Músculos Secundarios */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Músculos Secundarios (uno por línea)</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder={"Tríceps Braquial\nCore"}
            value={secondaryMuscles}
            onChangeText={setSecondaryMuscles}
            multiline
            numberOfLines={3}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Instrucciones */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Instrucciones (una por línea)</Text>
          <TextInput
            style={[s.input, s.textAreaLarge]}
            placeholder={"Paso 1...\nPaso 2...\nPaso 3..."}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={5}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Tips */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Tips / Consejos (uno por línea)</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder={"Mantén la espalda recta\nRespira al empujar"}
            value={tips}
            onChangeText={setTips}
            multiline
            numberOfLines={3}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Errores Comunes */}
        <View style={s.inputGroup}>
          <Text style={s.label}>Errores Comunes (uno por línea)</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder={"Usar impulso\nNo completar el rango"}
            value={commonMistakes}
            onChangeText={setCommonMistakes}
            multiline
            numberOfLines={3}
            placeholderTextColor={C.muted}
          />
        </View>

        <TouchableOpacity style={s.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={20} color={C.bg} />
          <Text style={s.saveButtonText}>Guardar Ejercicio</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { padding: 8, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    color: C.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: C.card,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    fontSize: 15,
    color: C.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    height: 120,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: C.accentDim,
    borderColor: C.accent,
  },
  chipText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: C.accent,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: C.accent,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  saveButtonText: {
    color: C.bg,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
