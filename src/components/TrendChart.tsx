import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/themes';

interface DataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: DataPoint[];
  title: string;
  unit: string;
  color?: string;
  height?: number;
}

/**
 * A minimal SVG line chart for displaying measurement trends.
 * Uses react-native-svg (already installed in the project).
 */
export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  unit,
  color: colorProp,
  height = 160,
}) => {
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const color = colorProp ?? C.accent;

  if (data.length < 2) return null;
  const CHART_WIDTH = 300;
  const CHART_HEIGHT = height - 40; // Reserve space for labels
  const PADDING_X = 36;
  const PADDING_Y = 16;
  const plotWidth = CHART_WIDTH - PADDING_X * 2;
  const plotHeight = CHART_HEIGHT - PADDING_Y * 2;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Add 10% padding to the range
  const paddedMin = minVal - range * 0.1;
  const paddedMax = maxVal + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  const getX = (i: number) => PADDING_X + (i / (data.length - 1)) * plotWidth;
  const getY = (v: number) => PADDING_Y + plotHeight - ((v - paddedMin) / paddedRange) * plotHeight;

  // Build SVG path
  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.value).toFixed(1)}`)
    .join(' ');

  // Area fill path
  const areaD = `${pathD} L ${getX(data.length - 1).toFixed(1)} ${(PADDING_Y + plotHeight).toFixed(1)} L ${getX(0).toFixed(1)} ${(PADDING_Y + plotHeight).toFixed(1)} Z`;

  // Y-axis labels (3 ticks)
  const yTicks = [paddedMin, (paddedMin + paddedMax) / 2, paddedMax];

  // Determine label interval to avoid overcrowding
  const maxLabels = 5;
  const labelInterval = Math.max(1, Math.ceil(data.length / maxLabels));

  // Change calculation
  const firstVal = data[0].value;
  const lastVal = data[data.length - 1].value;
  const change = lastVal - firstVal;
  const changePercent = ((change / firstVal) * 100).toFixed(1);

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.title}>{title}</Text>
        <View style={s.changeContainer}>
          <Text style={[s.changeText, { color: change <= 0 ? C.accent : C.danger }]}>
            {change > 0 ? '+' : ''}{change.toFixed(1)} {unit} ({change > 0 ? '+' : ''}{changePercent}%)
          </Text>
        </View>
      </View>
      <View style={s.chartWrapper}>
        <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
          {/* Y-axis grid lines */}
          {yTicks.map((tick, i) => (
            <React.Fragment key={`ytick-${i}`}>
              <Line
                x1={PADDING_X}
                y1={getY(tick)}
                x2={CHART_WIDTH - PADDING_X}
                y2={getY(tick)}
                stroke={C.border}
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <SvgText
                x={PADDING_X - 4}
                y={getY(tick) + 4}
                fill={C.muted}
                fontSize="9"
                textAnchor="end"
              >
                {tick.toFixed(1)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Area fill */}
          <Path d={areaD} fill={color} opacity={0.08} />

          {/* Line */}
          <Path d={pathD} stroke={color} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* Data points */}
          {data.map((d, i) => (
            <Circle
              key={`point-${i}`}
              cx={getX(i)}
              cy={getY(d.value)}
              r={i === 0 || i === data.length - 1 ? 4 : 3}
              fill={color}
              stroke={C.card}
              strokeWidth="2"
            />
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % labelInterval !== 0 && i !== data.length - 1) return null;
            return (
              <SvgText
                key={`xlabel-${i}`}
                x={getX(i)}
                y={height - 4}
                fill={C.muted}
                fontSize="8"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  changeContainer: {
    backgroundColor: C.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartWrapper: {
    overflow: 'hidden',
  },
});
