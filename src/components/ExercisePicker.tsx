import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/themes';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MUSCLE_GROUPS: { key: string; icon: IoniconsName }[] = [
  { key: 'Todos', icon: 'apps-outline' },
  { key: 'Pecho', icon: 'barbell-outline' },
  { key: 'Espalda', icon: 'barbell-outline' },
  { key: 'Hombros', icon: 'barbell-outline' },
  { key: 'Bíceps', icon: 'barbell-outline' },
  { key: 'Tríceps', icon: 'barbell-outline' },
  { key: 'Piernas', icon: 'barbell-outline' },
  { key: 'Glúteos', icon: 'barbell-outline' },
  { key: 'Core', icon: 'body-outline' },
  { key: 'Pantorrillas', icon: 'barbell-outline' },
  { key: 'Antebrazos', icon: 'barbell-outline' },
  { key: 'Cuerpo Completo', icon: 'body-outline' },
  { key: 'Cardio', icon: 'pulse-outline' },
];

/** Returns an Ionicons name based on exercise equipment / muscle group */
const getExerciseIcon = (exercise: Exercise): IoniconsName => {
  const equip = (exercise.equipment || '').toLowerCase();
  const groups = exercise.muscleGroup.map(g => g.toLowerCase());

  // Cardio
  if (groups.includes('cardio')) return 'pulse-outline';

  // Equipment-based
  if (equip.includes('barra') && !equip.includes('paralela') && !equip.includes('dominada'))
    return 'barbell-outline';
  if (equip.includes('mancuerna')) return 'barbell-outline';
  if (equip.includes('polea') || equip.includes('cable')) return 'git-pull-request-outline';
  if (equip.includes('máquina') || equip.includes('pec deck') || equip.includes('smith'))
    return 'cog-outline';
  if (equip.includes('dominada') || equip.includes('multiagarre')) return 'arrow-up-outline';
  if (equip.includes('paralela')) return 'swap-vertical-outline';
  if (equip.includes('peso corporal') || equip === '') return 'body-outline';
  if (equip.includes('banco romano') || equip.includes('colchoneta')) return 'body-outline';
  if (equip.includes('bicicleta') || equip.includes('elíptica')) return 'bicycle-outline';
  if (equip.includes('cinta') || equip.includes('treadmill')) return 'walk-outline';
  if (equip.includes('cuerda') || equip.includes('soga')) return 'flash-outline';

  // Muscle-group fallback
  if (groups.includes('core')) return 'body-outline';
  if (groups.includes('cuerpo completo')) return 'body-outline';

  return 'barbell-outline';
};

interface Props {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  title?: string;
}

export const ExercisePicker: React.FC<Props> = ({
  exercises,
  onSelect,
  onClose,
  title = 'Seleccionar Ejercicio',
}) => {
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Todos');

  const filtered = useMemo(() => {
    let list = [...exercises];

    if (selectedGroup !== 'Todos') {
      list = list.filter(e => e.muscleGroup.includes(selectedGroup));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.some(g => g.toLowerCase().includes(q)) ||
        (e.equipment && e.equipment.toLowerCase().includes(q))
      );
    }

    // Sort by popularity desc, then name
    list.sort((a, b) => {
      const popDiff = (b.popularity || 0) - (a.popularity || 0);
      if (popDiff !== 0) return popDiff;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [exercises, selectedGroup, search]);

  const groupCounts = useMemo(() => {
    const map: Record<string, number> = { Todos: exercises.length };
    exercises.forEach(e => {
      e.muscleGroup.forEach(g => {
        map[g] = (map[g] || 0) + 1;
      });
    });
    return map;
  }, [exercises]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={s.closeText}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchContainer}>
        <Ionicons name="search" size={18} color={C.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar ejercicio, músculo o equipo..."
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Muscle Group Chips */}
      <View style={s.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsContainer}
        >
          {MUSCLE_GROUPS.map(group => {
            const isSelected = selectedGroup === group.key;
            const count = groupCounts[group.key] || 0;
            return (
              <TouchableOpacity
                key={group.key}
                style={[s.chip, isSelected && s.chipSelected]}
                onPress={() => setSelectedGroup(group.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={group.icon} size={14} color={isSelected ? C.accent : C.muted} />
                <Text style={[s.chipText, isSelected && s.chipTextSelected]}>
                  {group.key}
                </Text>
                <View style={[s.chipCount, isSelected && s.chipCountSelected]}>
                  <Text style={[s.chipCountText, isSelected && s.chipCountTextSelected]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results count */}
      <Text style={s.resultCount}>{filtered.length} ejercicios</Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => onSelect(item)} activeOpacity={0.7}>
            <View style={s.itemIcon}>
              <Ionicons name={getExerciseIcon(item)} size={20} color={C.accent} />
            </View>
            <View style={s.itemInfo}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemMuscle}>{item.muscleGroup.join(' · ')}</Text>
              {item.equipment && (
                <Text style={s.itemEquip}>{item.equipment}</Text>
              )}
            </View>
            <Ionicons name="add-circle-outline" size={22} color={C.accent} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="search-outline" size={40} color={C.border} />
            <Text style={s.emptyText}>No se encontraron ejercicios</Text>
            <Text style={s.emptySubtext}>Intenta con otra búsqueda</Text>
          </View>
        }
      />
    </View>
  );
};

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.card,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: C.text },
  closeText: { color: C.accent, fontWeight: '600', fontSize: 16 },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12,
    backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  searchInput: {
    flex: 1, color: C.text, fontSize: 15, padding: 0,
  },

  chipsWrapper: { marginTop: 10 },
  chipsContainer: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, gap: 4,
  },
  chipSelected: {
    backgroundColor: C.accentSoft, borderColor: C.accent,
  },

  chipText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: C.accent },
  chipCount: {
    backgroundColor: C.border, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8,
    minWidth: 18, alignItems: 'center',
  },
  chipCountSelected: { backgroundColor: C.accentSoft },
  chipCountText: { color: C.muted, fontSize: 9, fontWeight: 'bold' },
  chipCountTextSelected: { color: C.accent },

  resultCount: {
    color: C.muted, fontSize: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
  },

  item: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: C.card,
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.accentDim,
    justifyContent: 'center', alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { color: C.text, fontSize: 15, fontWeight: '600' },
  itemMuscle: { color: C.muted, fontSize: 12, marginTop: 1 },
  itemEquip: { color: C.border, fontSize: 11, marginTop: 1 },

  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: C.muted, fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: C.border, fontSize: 13 },
});

export default ExercisePicker;
