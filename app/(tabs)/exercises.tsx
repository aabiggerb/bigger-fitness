import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image,
} from 'react-native';
import { useAppData } from '../../src/context/AppDataContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getExerciseGif } from '../../src/assets/exerciseGifs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Category config ─────────────────────────────
const CATEGORIES = [
  { key: 'Todos', icon: '🔥', color: '#64ffda' },
  { key: 'Pecho', icon: '🏋️', color: '#7c4dff' },
  { key: 'Espalda', icon: '🧗', color: '#4fc3f7' },
  { key: 'Hombros', icon: '🦅', color: '#FFA726' },
  { key: 'Bíceps', icon: '💪', color: '#66bb6a' },
  { key: 'Tríceps', icon: '🤸', color: '#ef5350' },
  { key: 'Piernas', icon: '🦵', color: '#26c6da' },
  { key: 'Glúteos', icon: '🍑', color: '#ec407a' },
  { key: 'Core', icon: '🧘', color: '#ffca28' },
  { key: 'Pantorrillas', icon: '🦶', color: '#8d6e63' },
  { key: 'Antebrazos', icon: '✊', color: '#78909c' },
  { key: 'Cuerpo Completo', icon: '🦸', color: '#ab47bc' },
  { key: 'Cardio', icon: '🏃', color: '#ff7043' },
];

// Stars component
const Stars = ({ count, borderColor }: { count: number; borderColor: string }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= count ? 'star' : 'star-outline'}
        size={10}
        color={i <= count ? '#ffca28' : borderColor}
        style={{ marginRight: 1 }}
      />
    );
  }
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
};

export default function ExercisesScreen() {
  const { exercises } = useAppData();
  const { colors: C } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...exercises];

    // Category filter
    if (selectedCategory !== 'Todos') {
      list = list.filter(e => e.muscleGroup.includes(selectedCategory));
    }

    // Search
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
  }, [exercises, selectedCategory, search]);

  // Count exercises per category
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { Todos: exercises.length };
    exercises.forEach(e => {
      e.muscleGroup.forEach(g => {
        map[g] = (map[g] || 0) + 1;
      });
    });
    return map;
  }, [exercises]);

  const getCategoryColor = (cat: string) => {
    return CATEGORIES.find(c => c.key === cat)?.color || '#64ffda';
  };

  const renderExercise = ({ item }: { item: typeof exercises[0] }) => {
    const catColor = getCategoryColor(item.muscleGroup[0]);
    const pop = item.popularity || 0;
    const localGif = getExerciseGif(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.card, borderLeftColor: catColor }]}
        onPress={() => router.push(`/exercises/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Icon / GIF Thumbnail */}
        <View style={[styles.iconContainer, { backgroundColor: localGif ? C.bg : catColor + '15' }]}>
          {localGif ? (
            <Image source={localGif} style={styles.iconGif} resizeMode="contain" />
          ) : (
            <Text style={styles.iconEmoji}>{item.icon || '🏋️'}</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
            {pop >= 5 && (
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>TOP</Text>
              </View>
            )}
          </View>
          <Text style={[styles.muscle, { color: C.muted }]} numberOfLines={1}>
            {item.muscleGroup.join(' · ')}
          </Text>
          <View style={styles.metaRow}>
            <Stars count={pop} borderColor={C.border} />
            {item.equipment && (
              <Text style={[styles.equipmentText, { color: C.muted }]} numberOfLines={1}>
                {item.equipment}
              </Text>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={C.border} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: C.inputBg, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Buscar ejercicio, músculo o equipo..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.key;
            const count = categoryCounts[cat.key] || 0;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  { backgroundColor: C.card, borderColor: C.border },
                  isSelected && { backgroundColor: cat.color + '20', borderColor: cat.color },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryText,
                  { color: C.muted },
                  isSelected && { color: cat.color },
                ]}>
                  {cat.key}
                </Text>
                <View style={[
                  styles.categoryCount,
                  { backgroundColor: C.border },
                  isSelected && { backgroundColor: cat.color + '30' },
                ]}>
                  <Text style={[
                    styles.categoryCountText,
                    { color: C.muted },
                    isSelected && { color: cat.color },
                  ]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: C.muted }]}>
          {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''}
        </Text>
        <View style={styles.sortBadge}>
          <Ionicons name="star" size={11} color="#ffca28" />
          <Text style={[styles.sortText, { color: C.muted }]}>Popularidad</Text>
        </View>
      </View>

      {/* Exercise List */}
      <FlatList
        data={filtered}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: C.muted }]}>Sin resultados</Text>
            <Text style={[styles.emptyText, { color: C.muted }]}>
              No se encontraron ejercicios{selectedCategory !== 'Todos' ? ` en "${selectedCategory}"` : ''}{search ? ` para "${search}"` : ''}.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  // Categories
  categoriesWrapper: {
    paddingTop: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 5,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryCount: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Results header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 11,
  },
  // List
  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    gap: 12,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },  iconGif: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },  infoContainer: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  topBadge: {
    backgroundColor: 'rgba(255,202,40,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  topBadgeText: {
    color: '#ffca28',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  muscle: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  equipmentText: {
    fontSize: 10,
    flexShrink: 1,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
