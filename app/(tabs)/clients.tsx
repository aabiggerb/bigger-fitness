import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { useAppData } from '../../src/context/AppDataContext';
import { Client } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter } from 'expo-router';


export default function ClientsScreen() {
  const { clients } = useAppData();
  const { colors: C } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const isEvalOverdue = (client: typeof clients[0]) => {
    if (client.measurements.length === 0) return true;
    const lastDate = new Date(client.measurements[client.measurements.length - 1].date);
    const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 35;
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase().trim();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [clients, searchQuery]);

  const renderClient = ({ item }: { item: Client }) => {
    const overdue = isEvalOverdue(item);
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: C.card, borderColor: C.border, shadowColor: C.shadow }]}
        onPress={() => router.push(`/clients/${item.id}`)}
      >
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle-outline" size={50} color={C.text} />
          {overdue && <View style={[styles.alertDot, { borderColor: C.card, backgroundColor: C.warning }]} />}
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.name, { color: C.heading }]}>{item.name}</Text>
          <Text style={[styles.email, { color: C.muted }]}>{item.email}</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.status, { color: C.accent }]}>{item.active ? 'Activo' : 'Inactivo'}</Text>
            {overdue && (
              <View style={[styles.alertTag, { backgroundColor: C.warning + '1F' }]}>
                <Ionicons name="warning" size={10} color={C.warning} />
                <Text style={[styles.alertTagText, { color: C.warning }]}>Evaluar</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color={C.border} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: C.inputBg, borderColor: C.border }]}>
        <Ionicons name="search" size={18} color={C.muted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Buscar por nombre, email o teléfono..."
          placeholderTextColor={C.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {filteredClients.length === 0 && searchQuery.trim() ? (
        <View style={styles.emptySearch}>
          <Ionicons name="search-outline" size={40} color={C.border} />
          <Text style={[styles.emptySearchText, { color: C.text }]}>No se encontraron clientes</Text>
          <Text style={[styles.emptySearchSub, { color: C.muted }]}>Intenta con otro término de búsqueda</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
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
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  alertTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  alertTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },
  emptySearch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  emptySearchText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySearchSub: {
    fontSize: 13,
  },
});
