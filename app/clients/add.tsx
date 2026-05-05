import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { generateId } from '../../src/utils/generateId';
import { validateEmail } from '../../src/utils/validateEmail';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

export default function AddClientScreen() {
  const router = useRouter();
  const { addClient } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDateObj, setBirthDateObj] = useState(new Date(2000, 0, 1));
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  const calculateAge = (bd?: string): number | null => {
    if (!bd) return null;
    const birth = new Date(bd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSave = () => {
    if (!name || !email) {
      Alert.alert('Error', 'Por favor completa el nombre y el correo.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'El formato del correo electrónico no es válido.');
      return;
    }

    const clientId = generateId();
    const newClient = {
      id: clientId,
      name,
      email: email.trim().toLowerCase(),
      phone,
      birthDate: birthDate || undefined,
      active: true,
      joinDate: new Date().toISOString(),
      measurements: [],
      progressPhotos: [],
      plans: [],
      goals: goal ? [{ 
        id: generateId(), 
        type: 'other' as const, 
        description: goal, 
        isCompleted: false,
        createdAt: new Date().toISOString(),
      }] : []
    };

    addClient(newClient);
    router.back();
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backButton}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={s.title}>Nuevo Cliente</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveButton}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.form}>
        <View style={s.inputGroup}>
          <Text style={s.label}>Nombre Completo</Text>
          <TextInput
            style={s.input}
            placeholder="Ej. Ana Lopez"
            value={name}
            onChangeText={setName}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Correo Electrónico</Text>
          <TextInput
            style={s.input}
            placeholder="correo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Teléfono</Text>
          <TextInput
            style={s.input}
            placeholder="+56 9 1234 5678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Fecha de Nacimiento</Text>
          <TouchableOpacity
            style={s.datePickerBtn}
            onPress={() => setShowBirthPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={C.accent} />
            <Text style={[s.datePickerText, !birthDate && { color: C.muted }]}>
              {birthDate
                ? new Date(birthDate).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'Seleccionar fecha'}
            </Text>
            {birthDate ? (
              <Text style={s.ageBadge}>{calculateAge(birthDate)} años</Text>
            ) : null}
          </TouchableOpacity>

          {showBirthPicker && (
            <View style={s.datePickerContainer}>
              <DateTimePicker
                value={birthDateObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1940, 0, 1)}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') setShowBirthPicker(false);
                  if (event.type === 'set' && selectedDate) {
                    setBirthDateObj(selectedDate);
                    setBirthDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
                textColor={C.text}
                themeVariant="dark"
                locale="es-CL"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={s.datePickerDoneBtn}
                  onPress={() => setShowBirthPicker(false)}
                >
                  <Text style={s.datePickerDoneText}>Listo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        <View style={s.inputGroup}>
          <Text style={s.label}>Objetivo Principal</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Ej. Bajar 5kg para el verano..."
            value={goal}
            onChangeText={setGoal}
            multiline
            numberOfLines={4}
            placeholderTextColor={C.muted}
          />
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.card,
    backgroundColor: C.bg,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.text,
  },
  backButton: {
    color: C.muted,
    fontSize: 16,
  },
  saveButton: {
    color: C.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    color: C.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    fontSize: 16,
    color: C.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, gap: 10 },
  datePickerText: { flex: 1, color: C.text, fontSize: 16 },
  ageBadge: { color: C.accent, fontSize: 13, fontWeight: 'bold', backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  datePickerContainer: { backgroundColor: C.card, borderRadius: 12, marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  datePickerDoneBtn: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  datePickerDoneText: { color: C.accent, fontWeight: '600', fontSize: 15 },
});
