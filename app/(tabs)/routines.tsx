import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Routine } from '../../src/types';


export default function RoutinesScreen() {
  const router = useRouter();
  const { routines } = useAppData();
  const { colors: C } = useTheme();

  const renderRoutine = ({ item }: { item: Routine }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => router.push(`/routines/${item.id}`)}>
      <View style={[styles.iconContainer, { backgroundColor: C.accentDim }]}>
          <Ionicons name="clipboard" size={24} color={C.accent} />
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: C.heading }]}>{item.name}</Text>
        <Text style={[styles.details, { color: C.muted }]}>{item.exercises.length} ejercicios</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.accent} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      
      {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={80} color={C.border} />
            <Text style={[styles.emptyText, { color: C.muted }]}>No tienes rutinas activas</Text>
            <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: C.accent, shadowColor: C.accent }]}
            onPress={() => router.push('/routines/create')}
            >
                <Text style={[styles.createButtonText, { color: C.bg }]}>Crear mi Primera Rutina</Text>
            </TouchableOpacity>
        </View>
      ) : (
          <FlatList 
            data={routines}
            renderItem={renderRoutine}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
          />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
  },
  emptyText: {
      fontSize: 18,
      marginTop: 20,
      marginBottom: 30,
      fontWeight: '500',
  },
  createButton: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 30,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
  },
  createButtonText: {
      fontWeight: 'bold',
      fontSize: 16,
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  list: {
      padding: 16,
  },
  card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
  },
  iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
  },
  infoContainer: {
      flex: 1,
  },
  name: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
  },
  details: {
      fontSize: 14,
  }
});
