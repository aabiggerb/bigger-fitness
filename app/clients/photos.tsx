import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from '../../src/context/AppDataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { ProgressPhoto } from '../../src/types';
import { generateId } from '../../src/utils/generateId';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/theme/themes';

export default function PhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clients, addProgressPhoto, deleteProgressPhoto } = useAppData();
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const client = clients.find(c => c.id === id);

  const [showForm, setShowForm] = useState(false);
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [sideUrl, setSideUrl] = useState('');

  if (!client) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errorText}>Cliente no encontrado</Text>
      </SafeAreaView>
    );
  }

  const pickImage = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const takePhoto = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const showImageOptions = (setter: (uri: string) => void) => {
    Alert.alert('Agregar Foto', 'Elige una opción', [
      { text: 'Cámara', onPress: () => takePhoto(setter) },
      { text: 'Galería', onPress: () => pickImage(setter) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSave = () => {
    if (!frontUrl) {
      Alert.alert('Error', 'La foto frontal es obligatoria.');
      return;
    }

    const photo: ProgressPhoto = {
      id: generateId(),
      date: new Date().toISOString(),
      frontUrl,
      backUrl: backUrl || undefined,
      sideUrl: sideUrl || undefined,
    };

    addProgressPhoto(client.id, photo);
    setFrontUrl(''); setBackUrl(''); setSideUrl('');
    setShowForm(false);
    Alert.alert('Éxito', 'Fotos de progreso agregadas correctamente.');
  };

  const handleDelete = (photoId: string) => {
    Alert.alert('Eliminar', '¿Deseas eliminar estas fotos de progreso?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteProgressPhoto(client.id, photoId) },
    ]);
  };

  const sortedPhotos = [...client.progressPhotos].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Fotos de Progreso</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={s.headerBtn}>
          <Ionicons name={showForm ? 'close' : 'camera'} size={24} color={C.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Add Form */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Nuevo Registro Fotográfico</Text>
            <Text style={s.formSubtitle}>
              Toma fotos con la cámara o selecciona de la galería.
            </Text>

            <View style={s.photoInputRow}>
              <TouchableOpacity style={s.photoInputCard} onPress={() => showImageOptions(setFrontUrl)}>
                {frontUrl ? (
                  <Image source={{ uri: frontUrl }} style={s.previewThumb} />
                ) : (
                  <Ionicons name="camera-outline" size={28} color={C.accent} />
                )}
                <Text style={s.photoLabel}>Frontal *</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.photoInputCard} onPress={() => showImageOptions(setBackUrl)}>
                {backUrl ? (
                  <Image source={{ uri: backUrl }} style={s.previewThumb} />
                ) : (
                  <Ionicons name="camera-outline" size={28} color={C.muted} />
                )}
                <Text style={s.photoLabel}>Espalda</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.photoInputCard} onPress={() => showImageOptions(setSideUrl)}>
                {sideUrl ? (
                  <Image source={{ uri: sideUrl }} style={s.previewThumb} />
                ) : (
                  <Ionicons name="camera-outline" size={28} color={C.muted} />
                )}
                <Text style={s.photoLabel}>Lateral</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={20} color={C.bg} />
              <Text style={s.saveBtnText}>Guardar Fotos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Photos List */}
        {sortedPhotos.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="images-outline" size={48} color={C.border} />
            <Text style={s.emptyText}>Sin fotos de progreso</Text>
            <TouchableOpacity onPress={() => setShowForm(true)}>
              <Text style={s.emptyAction}>Agregar primera sesión fotográfica</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedPhotos.map(photo => (
            <View key={photo.id} style={s.photoCard}>
              <View style={s.photoHeader}>
                <View style={s.dateContainer}>
                  <Ionicons name="calendar-outline" size={16} color={C.accent} />
                  <Text style={s.dateText}>
                    {new Date(photo.date).toLocaleDateString('es-CL', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(photo.id)}>
                  <Ionicons name="trash-outline" size={18} color={C.danger} />
                </TouchableOpacity>
              </View>

              <View style={s.photoGrid}>
                <View style={s.photoSlot}>
                  {photo.frontUrl ? (
                    <Image source={{ uri: photo.frontUrl }} style={s.photoImage} />
                  ) : (
                    <View style={s.photoPlaceholder}>
                      <Ionicons name="image-outline" size={24} color={C.border} />
                    </View>
                  )}
                  <Text style={s.photoSlotLabel}>Frontal</Text>
                </View>
                <View style={s.photoSlot}>
                  {photo.backUrl ? (
                    <Image source={{ uri: photo.backUrl }} style={s.photoImage} />
                  ) : (
                    <View style={s.photoPlaceholder}>
                      <Ionicons name="image-outline" size={24} color={C.border} />
                    </View>
                  )}
                  <Text style={s.photoSlotLabel}>Espalda</Text>
                </View>
                <View style={s.photoSlot}>
                  {photo.sideUrl ? (
                    <Image source={{ uri: photo.sideUrl }} style={s.photoImage} />
                  ) : (
                    <View style={s.photoPlaceholder}>
                      <Ionicons name="image-outline" size={24} color={C.border} />
                    </View>
                  )}
                  <Text style={s.photoSlotLabel}>Lateral</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
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
  formCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, padding: 16, borderRadius: 12 },
  formTitle: { color: C.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  formSubtitle: { color: C.muted, fontSize: 12, marginBottom: 16 },
  photoInputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  photoInputCard: { flex: 1, backgroundColor: C.border, padding: 12, borderRadius: 10, alignItems: 'center', gap: 8 },
  photoLabel: { color: C.text, fontSize: 12, fontWeight: '600' },
  previewThumb: { width: 56, height: 75, borderRadius: 8, backgroundColor: C.border },
  saveBtn: { flexDirection: 'row', backgroundColor: C.accent, paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnText: { color: C.bg, fontWeight: 'bold', fontSize: 15 },
  emptyCard: { marginHorizontal: 16, backgroundColor: C.card, padding: 40, borderRadius: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyText: { color: C.muted, fontSize: 14 },
  emptyAction: { color: C.accent, fontSize: 14, fontWeight: '600', marginTop: 8 },
  photoCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.card, padding: 16, borderRadius: 12 },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: C.text, fontSize: 14, fontWeight: '500' },
  photoGrid: { flexDirection: 'row', gap: 10 },
  photoSlot: { flex: 1, alignItems: 'center' },
  photoImage: { width: '100%', aspectRatio: 0.75, borderRadius: 10, backgroundColor: C.border },
  photoPlaceholder: { width: '100%', aspectRatio: 0.75, borderRadius: 10, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  photoSlotLabel: { color: C.muted, fontSize: 11, marginTop: 6 },
});
