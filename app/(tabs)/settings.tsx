import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, Switch, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemeTemplate } from '../../src/theme/themes';
import {
  ALARM_SOUNDS,
  AlarmSoundType,
  loadAlarmSoundPreference,
  saveAlarmSoundPreference,
  previewAlarmSound,
  stopAlarmSound,
} from '../../src/utils/alarmSound';
import RestTimerActivity from '../../modules/rest-timer-activity';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48 - 12) / 2; // 2 columns, 16px padding each side + 12px gap

export default function SettingsScreen() {
  const { colors: C, theme, themes, setTheme } = useTheme();

  // ─── Alarm sound state ────
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmSoundType>('beep');
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);

  useEffect(() => {
    loadAlarmSoundPreference().then(setSelectedAlarm);
  }, []);

  const handleAlarmSelect = async (type: AlarmSoundType) => {
    setSelectedAlarm(type);
    await saveAlarmSoundPreference(type);
    previewAlarmSound(type);
  };

  // Stop preview when closing picker
  useEffect(() => {
    if (!showAlarmPicker) {
      stopAlarmSound();
    }
  }, [showAlarmPicker]);

  // ─── Live Activity diagnostic state ────
  const [liveActivityReport, setLiveActivityReport] = useState<string | null>(null);

  const runLiveActivityDiag = async () => {
    const lines: string[] = [];
    const ts = new Date().toLocaleTimeString();
    lines.push(`Diagnóstico ${ts}`);
    const before = RestTimerActivity.diagnostics();
    lines.push(`• Plataforma: ${before.platform}`);
    lines.push(`• Módulo nativo enlazado: ${before.moduleLinked ? 'SÍ' : 'NO'}`);
    lines.push(`• Permiso (Ajustes): ${before.liveActivitiesEnabled ? 'SÍ' : 'NO'}`);
    lines.push(`• isSupported: ${RestTimerActivity.isSupported}`);
    let testId: string | null = null;
    try {
      testId = await RestTimerActivity.start({
        athleteName: 'Diagnóstico',
        totalSec: 30,
        remainingSec: 30,
      });
      lines.push(`• start() → ${testId ?? 'null'}`);
    } catch (e: unknown) {
      lines.push(`• start() THREW: ${String(e)}`);
    }
    const after = RestTimerActivity.diagnostics();
    lines.push(`• lastError: ${after.lastError ?? '—'}`);
    if (testId) {
      lines.push('Live Activity iniciada. Mira pantalla bloqueada / Dynamic Island.');
    } else {
      lines.push('NO se inició. Revisa Ajustes → Bigger Fitness → "Permitir actividades en vivo".');
    }
    const report = lines.join('\n');
    setLiveActivityReport(report);
    Alert.alert(
      'Live Activity — Diagnóstico',
      report,
      [{
        text: testId ? 'Detener' : 'OK',
        onPress: () => { if (testId) RestTimerActivity.end(true); },
      }]
    );
  };

  // ─── Animated selection ────
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [lastSelected, setLastSelected] = useState(theme.id);

  useEffect(() => {
    if (lastSelected !== theme.id) {
      setLastSelected(theme.id);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [theme.id]);

  const handleThemeSelect = (t: ThemeTemplate) => {
    setTheme(t.id);
  };

  const handleResetAll = () => {
    Alert.alert(
      'Restablecer Configuración',
      '¿Estás seguro? Esto volverá al tema predeterminado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer', style: 'destructive',
          onPress: () => setTheme('midnight-navy'),
        },
      ],
    );
  };

  // ─── Theme Preview Card ────
  const ThemeCard = ({ t }: { t: ThemeTemplate }) => {
    const isActive = theme.id === t.id;
    const tc = t.colors;

    return (
      <TouchableOpacity
        style={[
          styles.themeCard,
          { backgroundColor: C.card, borderColor: isActive ? C.accent : C.border },
          isActive && { borderWidth: 2, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
        ]}
        onPress={() => handleThemeSelect(t)}
        activeOpacity={0.7}
      >
        {/* Mini Preview */}
        <View style={[styles.previewContainer, { backgroundColor: tc.bg, borderColor: tc.border }]}>
          {/* Mini header bar */}
          <View style={[styles.previewHeader, { backgroundColor: tc.card }]}>
            <View style={[styles.previewDot, { backgroundColor: tc.accent }]} />
            <View style={[styles.previewTitleBar, { backgroundColor: tc.muted + '40' }]} />
          </View>

          {/* Mini cards */}
          <View style={styles.previewBody}>
            <View style={[styles.previewCardMini, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={[styles.previewLine, { backgroundColor: tc.text + '60' }]} />
              <View style={[styles.previewLineSm, { backgroundColor: tc.muted + '40' }]} />
              <View style={[styles.previewAccentBar, { backgroundColor: tc.accent }]} />
            </View>
            <View style={[styles.previewCardMini, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={[styles.previewLine, { backgroundColor: tc.text + '60' }]} />
              <View style={[styles.previewLineSm, { backgroundColor: tc.muted + '40' }]} />
            </View>
          </View>

          {/* Mini tab bar */}
          <View style={[styles.previewTabBar, { backgroundColor: tc.tabBar, borderTopColor: tc.tabBarBorder }]}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  styles.previewTabDot,
                  { backgroundColor: i === 0 ? tc.accent : tc.muted + '50' },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Card Info */}
        <View style={styles.themeCardInfo}>
          <View style={styles.themeCardNameRow}>
            <Ionicons
              name={t.icon as any}
              size={14}
              color={isActive ? C.accent : C.muted}
            />
            <Text
              style={[
                styles.themeCardName,
                { color: isActive ? C.accent : C.heading },
              ]}
              numberOfLines={1}
            >
              {t.name}
            </Text>
          </View>
          <Text
            style={[styles.themeCardDesc, { color: C.muted }]}
            numberOfLines={2}
          >
            {t.description}
          </Text>
        </View>

        {/* Active indicator */}
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: C.accent }]}>
            <Ionicons name="checkmark" size={12} color={C.bg} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ─── Section Header ────
  const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: C.accentDim }]}>
        <Ionicons name={icon as any} size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: C.heading }]}>{title}</Text>
        {subtitle && <Text style={[styles.sectionSubtitle, { color: C.muted }]}>{subtitle}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header Card ──── */}
        <View style={[styles.headerCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.headerIconWrap, { backgroundColor: C.accentDim }]}>
            <Ionicons name="color-palette" size={28} color={C.accent} />
          </View>
          <Text style={[styles.headerTitle, { color: C.heading }]}>Configuración</Text>
          <Text style={[styles.headerSubtitle, { color: C.muted }]}>
            Personaliza la apariencia de tu aplicación
          </Text>
        </View>

        {/* ─── Appearance Section ──── */}
        <SectionHeader
          icon="color-filter-outline"
          title="Apariencia"
          subtitle="Selecciona un tema para toda la app"
        />

        {/* Current theme indicator */}
        <Animated.View style={[
          styles.currentThemeBanner,
          { backgroundColor: C.accentDim, borderColor: C.accent + '30', transform: [{ scale: scaleAnim }] },
        ]}>
          <Ionicons name={theme.icon as any} size={20} color={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.currentThemeName, { color: C.accent }]}>{theme.name}</Text>
            <Text style={[styles.currentThemeDesc, { color: C.muted }]}>Tema actual</Text>
          </View>
          <View style={styles.colorDotsRow}>
            {theme.preview.map((color, i) => (
              <View key={i} style={[styles.colorDot, { backgroundColor: color, borderColor: C.border }]} />
            ))}
          </View>
        </Animated.View>

        {/* Theme Grid */}
        <View style={styles.themeGrid}>
          {themes.map(t => (
            <ThemeCard key={t.id} t={t} />
          ))}
        </View>

        {/* ─── Preferences Section ──── */}
        <SectionHeader
          icon="options-outline"
          title="Preferencias"
          subtitle="Ajustes generales de la aplicación"
        />

        <View style={[styles.prefCard, { backgroundColor: C.card, borderColor: C.border }]}>
          {/* Alarm Sound Picker */}
          <TouchableOpacity
            style={styles.prefRow}
            onPress={() => setShowAlarmPicker(!showAlarmPicker)}
            activeOpacity={0.7}
          >
            <View style={[styles.prefIconWrap, { backgroundColor: C.accentDim }]}>
              <Ionicons name="musical-notes-outline" size={16} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.prefLabel, { color: C.text }]}>Sonido de Alarma</Text>
              <Text style={[styles.prefSublabel, { color: C.muted }]}>
                {ALARM_SOUNDS.find(a => a.id === selectedAlarm)?.label || 'Beep Clásico'}
              </Text>
            </View>
            <Ionicons
              name={showAlarmPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.muted}
            />
          </TouchableOpacity>

          {/* Expandable alarm options */}
          {showAlarmPicker && (
            <View style={[styles.alarmPickerContainer, { borderTopColor: C.border }]}>
              {ALARM_SOUNDS.map((alarm) => {
                const isSelected = selectedAlarm === alarm.id;
                return (
                  <TouchableOpacity
                    key={alarm.id}
                    style={[
                      styles.alarmOption,
                      { borderColor: C.border },
                      isSelected && { backgroundColor: C.accentDim, borderColor: C.accent + '60' },
                    ]}
                    onPress={() => handleAlarmSelect(alarm.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.alarmOptionEmoji}>{alarm.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.alarmOptionLabel,
                        { color: isSelected ? C.accent : C.text },
                      ]}>
                        {alarm.label}
                      </Text>
                      <Text style={[styles.alarmOptionDesc, { color: C.muted }]}>
                        {alarm.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.alarmCheckMark, { backgroundColor: C.accent }]}>
                        <Ionicons name="checkmark" size={12} color={C.bg} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={[styles.prefDivider, { backgroundColor: C.border }]} />
          <PreferenceRow
            icon="notifications-outline"
            label="Notificaciones"
            sublabel="Alertas de cronómetros y recordatorios"
            colors={C}
          />
          <View style={[styles.prefDivider, { backgroundColor: C.border }]} />
          <PreferenceRow
            icon="fitness-outline"
            label="Unidades de peso"
            sublabel="Kilogramos (kg)"
            colors={C}
            showChevron
          />
          <View style={[styles.prefDivider, { backgroundColor: C.border }]} />
          <PreferenceRow
            icon="vibrate-outline"
            label="Vibración del cronómetro"
            sublabel="Vibrar al terminar descanso"
            colors={C}
          />
        </View>

        {/* ─── About Section ──── */}
        <SectionHeader
          icon="information-circle-outline"
          title="Acerca de"
        />

        <View style={[styles.prefCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: C.text }]}>Versión</Text>
            <Text style={[styles.aboutValue, { color: C.muted }]}>1.0.0</Text>
          </View>
          <View style={[styles.prefDivider, { backgroundColor: C.border }]} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: C.text }]}>Plataforma</Text>
            <Text style={[styles.aboutValue, { color: C.muted }]}>React Native + Expo</Text>
          </View>
        </View>

        {/* Reset button */}
        <TouchableOpacity
          style={[styles.resetBtn, { borderColor: C.danger + '40' }]}
          onPress={handleResetAll}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={16} color={C.danger} />
          <Text style={[styles.resetBtnText, { color: C.danger }]}>Restablecer Configuración</Text>
        </TouchableOpacity>

        {/* Live Activity diagnostics */}
        <TouchableOpacity
          style={[styles.resetBtn, { borderColor: C.accent + '40', marginTop: 8 }]}
          onPress={runLiveActivityDiag}
          activeOpacity={0.7}
        >
          <Ionicons name="bug-outline" size={16} color={C.accent} />
          <Text style={[styles.resetBtnText, { color: C.accent }]}>Probar Live Activity</Text>
        </TouchableOpacity>

        {/* Persistent on-screen report (in case Alert doesn't render) */}
        {liveActivityReport && (
          <View style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Text style={{ color: C.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 }} selectable>
              {liveActivityReport}
            </Text>
            <TouchableOpacity
              onPress={() => { setLiveActivityReport(null); RestTimerActivity.end(true); }}
              style={{ marginTop: 8, alignSelf: 'flex-end' }}
            >
              <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>Cerrar y detener</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <Text style={[styles.footerText, { color: C.muted }]}>
          Secret Trainer App • 2026
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Preference Row Component ────
const PreferenceRow: React.FC<{
  icon: string;
  label: string;
  sublabel: string;
  colors: any;
  showChevron?: boolean;
}> = ({ icon, label, sublabel, colors: C, showChevron }) => {
  const [enabled, setEnabled] = useState(true);

  return (
    <View style={styles.prefRow}>
      <View style={[styles.prefIconWrap, { backgroundColor: C.accentDim }]}>
        <Ionicons name={icon as any} size={16} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.prefLabel, { color: C.text }]}>{label}</Text>
        <Text style={[styles.prefSublabel, { color: C.muted }]}>{sublabel}</Text>
      </View>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      ) : (
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: C.border, true: C.accent + '50' }}
          thumbColor={enabled ? C.accent : C.muted}
        />
      )}
    </View>
  );
};

// ─── Styles ────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Header card
  headerCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: 8,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },

  // Current theme banner
  currentThemeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  currentThemeName: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentThemeDesc: {
    fontSize: 11,
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },

  // Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },

  // Theme card
  themeCard: {
    width: CARD_W,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Mini preview (inside card)
  previewContainer: {
    height: 100,
    borderBottomWidth: 1,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewTitleBar: {
    width: 40,
    height: 6,
    borderRadius: 3,
  },
  previewBody: {
    flex: 1,
    paddingHorizontal: 6,
    gap: 4,
    paddingTop: 3,
  },
  previewCardMini: {
    borderRadius: 4,
    padding: 5,
    borderWidth: 0.5,
    gap: 3,
  },
  previewLine: {
    width: '60%',
    height: 4,
    borderRadius: 2,
  },
  previewLineSm: {
    width: '40%',
    height: 3,
    borderRadius: 2,
  },
  previewAccentBar: {
    width: '30%',
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  previewTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 5,
    borderTopWidth: 0.5,
  },
  previewTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Card info
  themeCardInfo: {
    padding: 10,
    gap: 3,
  },
  themeCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeCardName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  themeCardDesc: {
    fontSize: 10,
    lineHeight: 14,
  },

  // Active indicator
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // Preferences
  prefCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  prefIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefSublabel: {
    fontSize: 11,
    marginTop: 1,
  },
  prefDivider: {
    height: 1,
    marginLeft: 58,
  },

  // Alarm picker
  alarmPickerContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  alarmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  alarmOptionEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  alarmOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  alarmOptionDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  alarmCheckMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  aboutValue: {
    fontSize: 13,
  },

  // Reset
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 8,
  },
});
