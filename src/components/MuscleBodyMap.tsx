import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Rect, Circle, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/themes';

// ─── Region type ────────────────────────────────
type BodyRegion =
  | 'chest_l' | 'chest_r'
  | 'f_shoulder_l' | 'f_shoulder_r'
  | 'bicep_l' | 'bicep_r'
  | 'forearm_l' | 'forearm_r'
  | 'core'
  | 'quad_l' | 'quad_r'
  | 'calf_l' | 'calf_r'
  | 'trapezius'
  | 'b_shoulder_l' | 'b_shoulder_r'
  | 'lat_l' | 'lat_r'
  | 'tricep_l' | 'tricep_r'
  | 'lower_back'
  | 'glutes'
  | 'hamstring_l' | 'hamstring_r'
  | 'b_calf_l' | 'b_calf_r'
  | 'b_forearm_l' | 'b_forearm_r';

// ─── Muscle-to-region mapping ───────────────────
const MUSCLE_REGIONS: Record<string, BodyRegion[]> = {
  // Pecho
  'Pectoral Mayor': ['chest_l', 'chest_r'],
  'Pectoral Mayor (porción esternal)': ['chest_l', 'chest_r'],
  'Pectoral Mayor (porción clavicular)': ['chest_l', 'chest_r'],
  'Pectoral Inferior': ['chest_l', 'chest_r'],
  // Hombros
  'Deltoides Anterior': ['f_shoulder_l', 'f_shoulder_r'],
  'Deltoides Lateral': ['f_shoulder_l', 'f_shoulder_r', 'b_shoulder_l', 'b_shoulder_r'],
  'Deltoides Posterior': ['b_shoulder_l', 'b_shoulder_r'],
  'Deltoides': ['f_shoulder_l', 'f_shoulder_r', 'b_shoulder_l', 'b_shoulder_r'],
  'Hombros': ['f_shoulder_l', 'f_shoulder_r', 'b_shoulder_l', 'b_shoulder_r'],
  // Bíceps
  'Bíceps Braquial': ['bicep_l', 'bicep_r'],
  'Bíceps Braquial (cabeza corta y larga)': ['bicep_l', 'bicep_r'],
  'Bíceps (estabilizador)': ['bicep_l', 'bicep_r'],
  'Braquial': ['bicep_l', 'bicep_r'],
  // Tríceps
  'Tríceps Braquial': ['tricep_l', 'tricep_r'],
  'Tríceps Braquial (las 3 cabezas)': ['tricep_l', 'tricep_r'],
  'Tríceps Braquial (cabeza lateral y medial)': ['tricep_l', 'tricep_r'],
  'Anconeo': ['tricep_l', 'tricep_r'],
  // Antebrazos
  'Braquiorradial': ['forearm_l', 'forearm_r', 'b_forearm_l', 'b_forearm_r'],
  'Antebrazos': ['forearm_l', 'forearm_r', 'b_forearm_l', 'b_forearm_r'],
  'Pronador Redondo': ['forearm_l', 'forearm_r'],
  // Espalda
  'Dorsal Ancho': ['lat_l', 'lat_r'],
  'Redondo Mayor': ['lat_l', 'lat_r'],
  'Romboides': ['lat_l', 'lat_r'],
  'Trapecio': ['trapezius'],
  'Trapecio Superior': ['trapezius'],
  'Trapecio Medio': ['trapezius'],
  'Trapecio Inferior': ['trapezius'],
  'Erectores Espinales': ['lower_back'],
  // Core
  'Core': ['core'],
  'Recto Abdominal': ['core'],
  'Transverso Abdominal': ['core'],
  'Oblicuos': ['core'],
  'Serrato Anterior': ['core'],
  // Piernas
  'Cuádriceps': ['quad_l', 'quad_r'],
  'Isquiotibiales': ['hamstring_l', 'hamstring_r'],
  'Aductores': ['quad_l', 'quad_r'],
  // Glúteos
  'Glúteo Mayor': ['glutes'],
  'Glúteo Medio': ['glutes'],
  'Glúteos': ['glutes'],
  // Pantorrillas
  'Supraespinoso': ['b_shoulder_l', 'b_shoulder_r'],
};

// ─── Muscle-specific colors (kept static) ───────
const PRIMARY_COLOR = '#64ffda';
const SECONDARY_COLOR = '#ffca28';

interface Props {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  size?: number; // height of the component
}

export const MuscleBodyMap: React.FC<Props> = ({
  primaryMuscles = [],
  secondaryMuscles = [],
  size = 180,
}) => {
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  // Theme-derived body-map base colors
  const BASE_COLOR = C.card;
  const OUTLINE_COLOR = C.border;
  const HEAD_COLOR = C.border;

  // Collect all highlighted regions
  const primaryRegions = new Set<BodyRegion>();
  const secondaryRegions = new Set<BodyRegion>();

  primaryMuscles.forEach(m => {
    (MUSCLE_REGIONS[m] || []).forEach(r => primaryRegions.add(r));
  });
  secondaryMuscles.forEach(m => {
    (MUSCLE_REGIONS[m] || []).forEach(r => {
      if (!primaryRegions.has(r)) secondaryRegions.add(r);
    });
  });

  const getColor = (region: BodyRegion): string => {
    if (primaryRegions.has(region)) return PRIMARY_COLOR;
    if (secondaryRegions.has(region)) return SECONDARY_COLOR;
    return BASE_COLOR;
  };

  const getOpacity = (region: BodyRegion): number => {
    if (primaryRegions.has(region)) return 0.85;
    if (secondaryRegions.has(region)) return 0.6;
    return 0.4;
  };

  const scale = size / 200;
  const svgW = 130 * scale;
  const svgH = 200 * scale;

  // ─── Render single body view ──────────────────
  const renderBody = (
    view: 'front' | 'back',
    offsetX: number,
  ) => {
    const rs = (region: BodyRegion) => ({
      fill: getColor(region),
      opacity: getOpacity(region),
      stroke: primaryRegions.has(region) || secondaryRegions.has(region) ? getColor(region) : OUTLINE_COLOR,
      strokeWidth: primaryRegions.has(region) || secondaryRegions.has(region) ? 1.2 : 0.5,
    });

    const isFront = view === 'front';

    return (
      <G key={view} x={offsetX}>
        {/* Head */}
        <Circle cx={60} cy={18} r={13} fill={HEAD_COLOR} opacity={0.5} stroke={OUTLINE_COLOR} strokeWidth={0.5} />

        {/* Neck */}
        <Rect x={53} y={31} width={14} height={10} rx={3} fill={isFront ? HEAD_COLOR : getColor('trapezius')} opacity={isFront ? 0.4 : getOpacity('trapezius')} stroke={OUTLINE_COLOR} strokeWidth={0.5} />

        {/* Trapezius (back view) */}
        {!isFront && (
          <Rect x={38} y={36} width={44} height={12} rx={5} {...rs('trapezius')} />
        )}

        {/* Shoulders */}
        <Ellipse cx={34} cy={48} rx={14} ry={9} {...rs(isFront ? 'f_shoulder_l' : 'b_shoulder_l')} />
        <Ellipse cx={86} cy={48} rx={14} ry={9} {...rs(isFront ? 'f_shoulder_r' : 'b_shoulder_r')} />

        {/* Chest (front) / Lats (back) */}
        {isFront ? (
          <>
            <Rect x={43} y={44} width={16} height={20} rx={4} {...rs('chest_l')} />
            <Rect x={61} y={44} width={16} height={20} rx={4} {...rs('chest_r')} />
          </>
        ) : (
          <>
            <Rect x={40} y={48} width={16} height={22} rx={4} {...rs('lat_l')} />
            <Rect x={64} y={48} width={16} height={22} rx={4} {...rs('lat_r')} />
          </>
        )}

        {/* Upper Arms */}
        <Rect x={18} y={50} width={12} height={26} rx={5} {...rs(isFront ? 'bicep_l' : 'tricep_l')} />
        <Rect x={90} y={50} width={12} height={26} rx={5} {...rs(isFront ? 'bicep_r' : 'tricep_r')} />

        {/* Forearms */}
        <Rect x={14} y={78} width={11} height={24} rx={4} {...rs(isFront ? 'forearm_l' : 'b_forearm_l')} />
        <Rect x={95} y={78} width={11} height={24} rx={4} {...rs(isFront ? 'forearm_r' : 'b_forearm_r')} />

        {/* Core (front) / Lower back (back) */}
        {isFront ? (
          <Rect x={46} y={66} width={28} height={26} rx={4} {...rs('core')} />
        ) : (
          <Rect x={48} y={66} width={24} height={20} rx={4} {...rs('lower_back')} />
        )}

        {/* Hips / Glutes */}
        <Ellipse cx={60} cy={96} rx={22} ry={8}
          fill={getColor('glutes')}
          opacity={isFront ? 0.3 : getOpacity('glutes')}
          stroke={!isFront && (primaryRegions.has('glutes') || secondaryRegions.has('glutes')) ? getColor('glutes') : OUTLINE_COLOR}
          strokeWidth={0.5}
        />

        {/* Upper Legs */}
        <Rect x={39} y={102} width={17} height={38} rx={6} {...rs(isFront ? 'quad_l' : 'hamstring_l')} />
        <Rect x={64} y={102} width={17} height={38} rx={6} {...rs(isFront ? 'quad_r' : 'hamstring_r')} />

        {/* Calves */}
        <Rect x={41} y={144} width={13} height={30} rx={5} {...rs(isFront ? 'calf_l' : 'b_calf_l')} />
        <Rect x={66} y={144} width={13} height={30} rx={5} {...rs(isFront ? 'calf_r' : 'b_calf_r')} />
      </G>
    );
  };

  const totalWidth = svgW * 2 + 16 * scale;

  return (
    <View style={s.container}>
      <View style={s.mapRow}>
        {/* Front view */}
        <View style={s.viewContainer}>
          <Svg width={svgW} height={svgH} viewBox="0 0 120 200">
            {renderBody('front', 0)}
          </Svg>
          <Text style={s.viewLabel}>Frontal</Text>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Back view */}
        <View style={s.viewContainer}>
          <Svg width={svgW} height={svgH} viewBox="0 0 120 200">
            {renderBody('back', 0)}
          </Svg>
          <Text style={s.viewLabel}>Posterior</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: PRIMARY_COLOR }]} />
          <Text style={s.legendText}>Principal</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: SECONDARY_COLOR }]} />
          <Text style={s.legendText}>Secundario</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: BASE_COLOR, borderWidth: 1, borderColor: OUTLINE_COLOR }]} />
          <Text style={s.legendText}>Inactivo</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginBottom: 16,
      paddingVertical: 12,
      backgroundColor: C.bg,
      borderRadius: 12,
    },
    mapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewContainer: {
      alignItems: 'center',
    },
    viewLabel: {
      color: C.muted,
      fontSize: 10,
      fontWeight: '600',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    divider: {
      width: 1,
      height: '70%',
      backgroundColor: C.border,
      marginHorizontal: 8,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 10,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      color: C.muted,
      fontSize: 10,
    },
  });

export default MuscleBodyMap;
