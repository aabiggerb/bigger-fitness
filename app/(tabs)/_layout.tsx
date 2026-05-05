import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabsLayout() {
  const router = useRouter();
  const { colors: C } = useTheme();

  const headerRightAdd = (route: string) => (
    <TouchableOpacity onPress={() => router.push(route)} style={{ marginRight: 16 }}>
       <Ionicons name="add-circle" size={32} color={C.accent} />
    </TouchableOpacity>
  );

  return (
    <Tabs screenOptions={{ 
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted, 
        headerShown: true,
        headerStyle: { backgroundColor: C.bg, borderBottomWidth: 0, shadowOpacity: 0, elevation: 0 },
        headerTitleStyle: { color: C.heading, fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: C.tabBar, borderTopColor: C.tabBarBorder, height: 60, paddingBottom: 8 },
    }}>
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clientes',
           headerRight: () => headerRightAdd('/clients/add'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
           headerRight: () => headerRightAdd('/routines/create'),
          tabBarIcon: ({ color, size }) => <Ionicons name="fitness" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Ejercicios',
           headerRight: () => headerRightAdd('/exercises/add'),
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'En Vivo',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
