import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clients, updateClient } = useAppData();
  const client = clients.find(c => c.id === id);
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthDateObj, setBirthDateObj] = useState(new Date(2000, 0, 1));
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [height, setHeight] = useState('');
  const [active, setActive] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  const calculateAge = (bd?: string): number | null => {
    if (!bd) return null;
    const birth = new Date(bd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email);
      setPhone(client.phone || '');
      setBirthDate(client.birthDate || '');
      if (client.birthDate) setBirthDateObj(new Date(client.birthDate));
      setHeight(client.height?.toString() || '');
      setActive(client.active);
      setPhotoUri(client.photoUrl);
    }
  }, [client]);

  if (!client) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Cliente no encontrado</Text>
      </SafeAreaView>
    );
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Nombre y correo electrónico son obligatorios.');
      return;
    }

    updateClient(client.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      birthDate: birthDate || undefined,
      height: height ? parseFloat(height) : undefined,
      active,
      photoUrl: photoUri,
    });

    Alert.alert('Éxito', 'Datos del cliente actualizados correctamente.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Editar Cliente</Text>
        <TouchableOpacity onPress={handleSave} style={s.headerBtn}>
          <Text style={s.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={s.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color={C.accent} />
            )}
          </View>
          <TouchableOpacity onPress={pickImage}>
            <Text style={s.changePhotoText}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={s.formSection}>
          <Text style={s.sectionTitle}>Información Personal</Text>

          <Text style={s.label}>Nombre Completo *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre completo"
            placeholderTextColor={C.muted}
          />

          <Text style={s.label}>Correo Electrónico *</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={C.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.label}>Teléfono</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+56 9 1234 5678"
            placeholderTextColor={C.muted}
            keyboardType="phone-pad"
          />

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

          <View style={s.formRow}>
            <View style={s.formCol}>
              <Text style={s.label}>Estatura (cm)</Text>
              <TextInput
                style={s.input}
                value={height}
                onChangeText={setHeight}
                placeholder="175"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={s.formSection}>
          <Text style={s.sectionTitle}>Estado</Text>
          <View style={s.switchRow}>
            <View>
              <Text style={s.switchLabel}>Cliente Activo</Text>
              <Text style={s.switchSubLabel}>
                {active ? 'El cliente puede acceder a su plan' : 'El cliente está desactivado'}
              </Text>
            </View>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: C.border, true: C.accentSoft }}
              thumbColor={active ? C.accent : C.muted}
            />
          </View>
        </View>

        {/* Info */}
        <View style={s.formSection}>
          <Text style={s.sectionTitle}>Datos del Sistema</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fecha de registro</Text>
            <Text style={s.infoValue}>
              {new Date(client.joinDate).toLocaleDateString('es-CL')}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Medidas registradas</Text>
            <Text style={s.infoValue}>{client.measurements.length}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Objetivos</Text>
            <Text style={s.infoValue}>{client.goals.length}</Text>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  errorText: { color: C.danger, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  saveText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  scrollContent: { flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.accent, overflow: 'hidden' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  changePhotoText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  formSection: { marginHorizontal: 16, marginBottom: 20, backgroundColor: C.card, padding: 16, borderRadius: 12 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  label: { color: C.accent, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: C.border, padding: 12, borderRadius: 8, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  formCol: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { color: C.text, fontSize: 15, fontWeight: '500' },
  switchSubLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoLabel: { color: C.muted, fontSize: 14 },
  infoValue: { color: C.text, fontSize: 14, fontWeight: '600' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.border, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, marginBottom: 16, gap: 10 },
  datePickerText: { flex: 1, color: C.text, fontSize: 15 },
  ageBadge: { color: C.accent, fontSize: 13, fontWeight: 'bold', backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  datePickerContainer: { backgroundColor: C.card, borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  datePickerDoneBtn: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  datePickerDoneText: { color: C.accent, fontWeight: '600', fontSize: 15 },
});
