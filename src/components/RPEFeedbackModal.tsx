import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/themes';

// ─── RPE Scale definition ────
const RPE_LEVELS = [
  { value: 1, label: 'Muy fácil', emoji: '😴', color: '#4CAF50' },
  { value: 2, label: 'Fácil', emoji: '😊', color: '#66BB6A' },
  { value: 3, label: 'Ligero', emoji: '🙂', color: '#8BC34A' },
  { value: 4, label: 'Moderado-', emoji: '😐', color: '#CDDC39' },
  { value: 5, label: 'Moderado', emoji: '😐', color: '#FFEB3B' },
  { value: 6, label: 'Moderado+', emoji: '😤', color: '#FFC107' },
  { value: 7, label: 'Difícil', emoji: '😓', color: '#FF9800' },
  { value: 8, label: 'Muy difícil', emoji: '😰', color: '#FF5722' },
  { value: 9, label: 'Máximo', emoji: '🔥', color: '#F44336' },
  { value: 10, label: 'Fallo', emoji: '💀', color: '#D32F2F' },
];

interface RPEFeedbackModalProps {
  visible: boolean;
  exerciseName: string;
  setNumber: number;
  onSubmit: (rpe: number) => void;
  onSkip: () => void;
}

/**
 * Touch-interactive RPE bar chart modal.
 * Shown after completing a set to capture perceived exertion.
 */
export const RPEFeedbackModal: React.FC<RPEFeedbackModalProps> = ({
  visible,
  exerciseName,
  setNumber,
  onSubmit,
  onSkip,
}) => {
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  const [selectedRPE, setSelectedRPE] = useState<number | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(RPE_LEVELS.map(() => new Animated.Value(0))).current;

  // Animate in when modal becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedRPE(null);
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Stagger bar animations
      barAnims.forEach((anim, i) => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: i * 40 + 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible]);

  const handleBarPress = (rpe: number) => {
    setSelectedRPE(rpe);
  };

  const handleConfirm = () => {
    if (selectedRPE !== null) {
      onSubmit(selectedRPE);
    }
  };

  const selectedLevel = selectedRPE !== null
    ? RPE_LEVELS.find(l => l.value === selectedRPE)
    : null;

  // Bar height calculation based on level
  const getBarHeight = (value: number): number => {
    const minH = 32;
    const maxH = 140;
    return minH + ((value - 1) / 9) * (maxH - minH);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <Animated.View style={[
          s.card,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}>
              <Ionicons name="fitness" size={20} color={C.accent} />
            </View>
            <View style={s.headerTextBlock}>
              <Text style={s.headerTitle}>¿Cómo fue la serie?</Text>
              <Text style={s.headerSubtitle}>
                {exerciseName} — Serie {setNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onSkip} style={s.skipBtn}>
              <Ionicons name="close" size={20} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Selected feedback display */}
          <View style={s.feedbackDisplay}>
            {selectedLevel ? (
              <>
                <Text style={s.feedbackEmoji}>{selectedLevel.emoji}</Text>
                <Text style={[s.feedbackLabel, { color: selectedLevel.color }]}>
                  RPE {selectedLevel.value} — {selectedLevel.label}
                </Text>
              </>
            ) : (
              <Text style={s.feedbackPlaceholder}>Toca una barra para calificar</Text>
            )}
          </View>

          {/* Bar Chart — Touchable RPE Bars */}
          <View style={s.chartContainer}>
            <View style={s.barsRow}>
              {RPE_LEVELS.map((level, index) => {
                const barH = getBarHeight(level.value);
                const isSelected = selectedRPE === level.value;

                return (
                  <Animated.View
                    key={level.value}
                    style={{
                      opacity: barAnims[index],
                      transform: [{
                        translateY: barAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      }],
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        s.barTouchable,
                        { height: barH + 28 }, // Extra touch area
                      ]}
                      onPress={() => handleBarPress(level.value)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          s.bar,
                          {
                            height: barH,
                            backgroundColor: isSelected
                              ? level.color
                              : `${level.color}40`, // 25% opacity when not selected
                            borderColor: isSelected ? level.color : 'transparent',
                            transform: [{ scaleX: isSelected ? 1.15 : 1 }],
                          },
                        ]}
                      />
                      <Text style={[
                        s.barLabel,
                        isSelected && { color: level.color, fontWeight: '800' },
                      ]}>
                        {level.value}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Scale labels */}
            <View style={s.scaleLabels}>
              <Text style={s.scaleLabelText}>Fácil</Text>
              <Text style={s.scaleLabelText}>Intenso</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={s.actionsRow}>
            <TouchableOpacity style={s.skipTextBtn} onPress={onSkip}>
              <Text style={s.skipBtnText}>Omitir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.confirmBtn,
                !selectedRPE && s.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedRPE}
            >
              <Text style={[
                s.confirmBtnText,
                !selectedRPE && s.confirmBtnTextDisabled,
              ]}>
                Confirmar
              </Text>
              <Ionicons
                name="checkmark"
                size={18}
                color={selectedRPE ? C.bg : C.muted}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (C: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${C.accent}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 1,
  },
  skipBtn: {
    padding: 6,
  },
  feedbackDisplay: {
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 56,
    justifyContent: 'center',
  },
  feedbackEmoji: {
    fontSize: 32,
  },
  feedbackLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  feedbackPlaceholder: {
    color: C.muted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  chartContainer: {
    marginVertical: 8,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    height: 170,
  },
  barTouchable: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    minWidth: 26,
  },
  bar: {
    width: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginBottom: 4,
  },
  barLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 6,
  },
  scaleLabelText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
    alignItems: 'center',
  },
  skipTextBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  skipBtnText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: C.accent,
  },
  confirmBtnDisabled: {
    backgroundColor: C.border,
  },
  confirmBtnText: {
    color: C.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtnTextDisabled: {
    color: C.muted,
  },
});
