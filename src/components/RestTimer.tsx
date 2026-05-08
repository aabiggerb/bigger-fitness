import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { startAlarmSound, stopAlarmSound } from '../utils/alarmSound';
import {
  scheduleRestTimerNotification,
  cancelRestTimerNotification,
  cancelAllRestNotifications,
} from '../utils/notifications';
import RestTimerActivity from '../../modules/rest-timer-activity';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/themes';

// ─── Preset rest durations (seconds) ────
const REST_PRESETS = [30, 60, 90, 120, 180];

/** Methods exposed via ref to let the parent control the timer programmatically */
export interface RestTimerHandle {
  /** Dismiss the active alarm, stop vibration, and fire onTimerComplete */
  dismissAlarm: () => void;
  /** Full reset — stop everything and return to initial state */
  reset: () => void;
  /** Force-stop timer + alarm without triggering onTimerComplete */
  forceStop: () => void;
}

interface RestTimerProps {
  /** Default rest seconds from the exercise config */
  defaultRestSeconds?: number;
  /** Called when timer finishes — triggers RPE feedback flow */
  onTimerComplete?: () => void;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Initial analog mode (persisted by parent) */
  initialAnalogMode?: boolean;
  /** Called when user toggles display mode */
  onModeChange?: (analog: boolean) => void;
  /** Keep alarm vibrating until user dismisses */
  alarmUntilDismissed?: boolean;
  /** Auto start the timer on mount */
  autoStart?: boolean;
  /** Athlete name for notification text */
  athleteName?: string;
  /** Called when alarm starts (useful to auto-show timer overlay) */
  onAlarmStart?: () => void;
  /** Called when user changes preset while timer is active — reports new total (sec) and remaining (ms) */
  onDurationChange?: (newTotalSec: number, remainingMs: number) => void;
}

// ─── Analog Clock Face Component (Professional Chronometer) ────
const AnalogClock: React.FC<{
  remainingMs: number;
  totalMs: number;
  isRunning: boolean;
  timerFinished: boolean;
  size?: number;
  colors: ThemeColors;
}> = ({ remainingMs, totalMs, isRunning, timerFinished, size = 200, colors }) => {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - 12;

  const totalSec = remainingMs / 1000;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const centiseconds = Math.floor((remainingMs % 1000) / 10);

  // Progress fraction (for sweep hand)
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  // Second hand: full 360° per 60 seconds, smooth movement
  const secAngle = (seconds / 60) * 360;
  // Minute hand: based on minutes within the countdown
  const minAngle = (minutes / Math.max(Math.ceil(totalMs / 60000), 1)) * 360;
  // Centisecond hand in sub-dial
  const centiAngle = (centiseconds / 100) * 360;

  // Progress arc for countdown
  const progressAngle = progress * 360;

  // Helper: polar to cartesian
  const polarToCartesian = (cxp: number, cyp: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cxp + r * Math.cos(rad), y: cyp + r * Math.sin(rad) };
  };

  // SVG arc path
  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  // Generate tick marks
  const majorTicks: { x1: number; y1: number; x2: number; y2: number; label: string }[] = [];
  const minorTicks: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (let i = 0; i < 60; i++) {
    const angle = ((i * 6 - 90) * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const outerTick = innerR - 1;
    const innerTick = isMajor ? outerTick - 12 : outerTick - 6;

    const x1 = cx + outerTick * Math.cos(angle);
    const y1 = cy + outerTick * Math.sin(angle);
    const x2 = cx + innerTick * Math.cos(angle);
    const y2 = cy + innerTick * Math.sin(angle);

    if (isMajor) {
      const labelR = innerTick - 10;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      majorTicks.push({ x1, y1, x2, y2, label: `${i === 0 ? 60 : i}` });
    }
    minorTicks.push({ x1, y1, x2, y2 });
  }

  // Active color based on state
  const handColor = timerFinished
    ? colors.accent
    : remainingMs <= 5000
      ? colors.danger
      : remainingMs <= 10000
        ? colors.warning
        : colors.accent;

  // Sub-dial center (bottom area for centiseconds)
  const subCx = cx;
  const subCy = cy + 38;
  const subR = 22;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer bezel */}
        <Circle cx={cx} cy={cy} r={outerR} fill="none" stroke={colors.border} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={outerR - 2} fill="none" stroke={colors.border} strokeWidth={1} />

        {/* Face background */}
        <Circle cx={cx} cy={cy} r={innerR} fill={colors.card} />

        {/* Progress arc (elapsed time) */}
        {progressAngle > 0.5 && (
          <Circle
            cx={cx}
            cy={cy}
            r={innerR - 3}
            fill="none"
            stroke={`${handColor}15`}
            strokeWidth={6}
            strokeDasharray={`${((progressAngle / 360) * 2 * Math.PI * (innerR - 3))}, ${2 * Math.PI * (innerR - 3)}`}
            strokeLinecap="round"
            transform={`rotate(-90, ${cx}, ${cy})`}
          />
        )}

        {/* Minor tick marks */}
        {minorTicks.map((t, i) => (
          <Line
            key={`mt-${i}`}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={i % 5 === 0 ? colors.text : colors.border}
            strokeWidth={i % 5 === 0 ? 2 : 0.8}
            strokeLinecap="round"
          />
        ))}

        {/* Major tick labels */}
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((i, idx) => {
          const angle = ((i * 6 - 90) * Math.PI) / 180;
          const labelR = innerR - 26;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          return (
            <SvgText
              key={`label-${idx}`}
              x={lx}
              y={ly + 4}
              textAnchor="middle"
              fill={colors.muted}
              fontSize={10}
              fontWeight="600"
            >
              {i === 0 ? '60' : `${i}`}
            </SvgText>
          );
        })}

        {/* Center brand text */}
        <SvgText
          x={cx}
          y={cy - 22}
          textAnchor="middle"
          fill={colors.muted}
          fontSize={7}
          fontWeight="500"
          letterSpacing={2}
        >
          CHRONOMETER
        </SvgText>
        <SvgText
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fill={handColor}
          fontSize={6}
          fontWeight="700"
          letterSpacing={1.5}
        >
          REST TIMER
        </SvgText>

        {/* Sub-dial for centiseconds */}
        <Circle cx={subCx} cy={subCy} r={subR} fill={colors.bg} stroke={colors.border} strokeWidth={1} />
        {/* Sub-dial ticks */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
          const a = ((i * 36 - 90) * Math.PI) / 180;
          const ox = subCx + (subR - 2) * Math.cos(a);
          const oy = subCy + (subR - 2) * Math.sin(a);
          const ix = subCx + (subR - 5) * Math.cos(a);
          const iy = subCy + (subR - 5) * Math.sin(a);
          return (
            <Line key={`st-${i}`} x1={ox} y1={oy} x2={ix} y2={iy}
              stroke={colors.muted} strokeWidth={0.8} />
          );
        })}
        {/* Centisecond hand */}
        <G transform={`rotate(${centiAngle}, ${subCx}, ${subCy})`}>
          <Line x1={subCx} y1={subCy} x2={subCx} y2={subCy - subR + 7}
            stroke={handColor} strokeWidth={1} strokeLinecap="round" />
        </G>
        <Circle cx={subCx} cy={subCy} r={2} fill={handColor} />

        {/* Minute hand (thick, short) */}
        <G transform={`rotate(${minAngle}, ${cx}, ${cy})`}>
          <Line x1={cx} y1={cy + 10} x2={cx} y2={cy - innerR * 0.45}
            stroke={colors.text} strokeWidth={3.5} strokeLinecap="round" />
        </G>

        {/* Second hand (thin, long, with counterweight) */}
        <G transform={`rotate(${secAngle}, ${cx}, ${cy})`}>
          <Line x1={cx} y1={cy + 16} x2={cx} y2={cy - innerR * 0.78}
            stroke={handColor} strokeWidth={1.5} strokeLinecap="round" />
          {/* Counterweight */}
          <Circle cx={cx} cy={cy + 12} r={2.5} fill={handColor} />
        </G>

        {/* Center cap */}
        <Circle cx={cx} cy={cy} r={5} fill={colors.border} />
        <Circle cx={cx} cy={cy} r={3} fill={handColor} />

        {/* Outer chrome bezel highlight */}
        <Circle cx={cx} cy={cy} r={outerR} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      </Svg>
    </View>
  );
};

/**
 * Countdown rest timer with milliseconds precision.
 * Toggle between digital & analog chronometer view.
 * Single-tap vibration on completion.
 */
export const RestTimer = forwardRef<RestTimerHandle, RestTimerProps>(({
  defaultRestSeconds = 90,
  onTimerComplete,
  compact = false,
  initialAnalogMode = true,
  onModeChange,
  alarmUntilDismissed = false,
  autoStart = false,
  onAlarmStart,
  onDurationChange,
  athleteName,
}, ref) => {
  const { colors: C } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);

  // Track time in milliseconds for precision
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalMs, setTotalMs] = useState(defaultRestSeconds * 1000);
  const [remainingMs, setRemainingMs] = useState(defaultRestSeconds * 1000);
  const [showPresets, setShowPresets] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [analogMode, setAnalogMode] = useState(initialAnalogMode);
  const [alarmActive, setAlarmActive] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingAtStartRef = useRef<number>(0);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const autoStartedRef = useRef(false);

  // ─── Cleanup intervals on unmount ────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      Vibration.cancel();
      stopAlarmSound();
      cancelRestTimerNotification(notifIdRef.current);
      // Best-effort: end any Live Activity tied to this timer instance
      RestTimerActivity.end(true);
    };
  }, []);

  // ─── Auto start on mount if requested ────
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && !isRunning && !isPaused && !timerFinished) {
      autoStartedRef.current = true;
      // Slight delay to ensure component is fully mounted
      const t = setTimeout(() => {
        setIsRunning(true);
        setTimerFinished(false);
        // Live Activity for the auto-started timer
        const totalSec = Math.max(1, Math.round(totalMs / 1000));
        RestTimerActivity.start({
          athleteName: athleteName || 'Atleta',
          totalSec,
          remainingSec: totalSec,
        });
        startInterval(totalMs);
      }, 100);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  // ─── Pulsing animation when timer is done ────
  useEffect(() => {
    if (timerFinished) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timerFinished]);

  // ─── High-precision timer using Date.now() delta ────
  const startInterval = useCallback((startRemainingMs: number) => {
    startTimeRef.current = Date.now();
    remainingAtStartRef.current = startRemainingMs;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newRemaining = Math.max(0, remainingAtStartRef.current - elapsed);

      setRemainingMs(newRemaining);

      if (newRemaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);
        setIsPaused(false);
        setTimerFinished(true);
        setRemainingMs(0);

        // Mark Live Activity as finished (turns red, shows ¡LISTO!)
        RestTimerActivity.update({ isFinished: true });

        if (alarmUntilDismissed) {
          // Start continuous alarm — vibrate every 1.5s + play alarm sound until dismissed
          Vibration.vibrate(400);
          startAlarmSound();
          const alarmIv = setInterval(() => {
            Vibration.vibrate(400);
          }, 1500);
          alarmIntervalRef.current = alarmIv;
          setAlarmActive(true);
          // Notify parent so it can auto-show the overlay
          onAlarmStart?.();
          // Don't call onTimerComplete yet — wait for user dismiss
        } else {
          Vibration.vibrate(50);
          if (onTimerComplete) {
            setTimeout(() => onTimerComplete(), 500);
          }
        }
      }
    }, 16); // ~60fps for smooth millisecond updates
  }, [onTimerComplete, onAlarmStart, alarmUntilDismissed]);

  // ─── Start / Resume ────
  const startTimer = () => {
    let startMs = remainingMs;
    const wasPausedResume = isPaused && !timerFinished;
    if (timerFinished || (!isRunning && !isPaused)) {
      startMs = totalMs;
      setRemainingMs(totalMs);
    }

    setIsRunning(true);
    setIsPaused(false);
    setTimerFinished(false);

    // Schedule local notification for when timer ends
    cancelRestTimerNotification(notifIdRef.current);
    const delaySec = startMs / 1000;
    scheduleRestTimerNotification(delaySec, athleteName).then(id => {
      notifIdRef.current = id;
    });

    // Live Activity (Dynamic Island / lock screen)
    const totalSec = Math.max(1, Math.round(totalMs / 1000));
    const remainingSec = Math.max(1, Math.round(startMs / 1000));
    if (wasPausedResume) {
      // Resume the existing activity (recompute endsAt from new remaining)
      RestTimerActivity.update({ isPaused: false, remainingSec, totalSec });
    } else {
      RestTimerActivity.start({
        athleteName: athleteName || 'Atleta',
        totalSec,
        remainingSec,
      });
    }

    startInterval(startMs);
  };

  // ─── Pause ────
  const pauseTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    setIsPaused(true);
    // Cancel scheduled notification while paused
    cancelRestTimerNotification(notifIdRef.current);
    notifIdRef.current = null;
    // Freeze Live Activity at current remaining
    const remainingSec = Math.max(0, Math.round(remainingMs / 1000));
    RestTimerActivity.update({ isPaused: true, remainingSec });
  };

  // ─── Dismiss alarm ────
  const dismissAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    Vibration.cancel();
    stopAlarmSound();
    setAlarmActive(false);
    cancelRestTimerNotification(notifIdRef.current);
    notifIdRef.current = null;
    RestTimerActivity.end(true);
    if (onTimerComplete) {
      onTimerComplete();
    }
  }, [onTimerComplete]);

  // ─── Reset ────
  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    alarmIntervalRef.current = null;
    setIsRunning(false);
    setIsPaused(false);
    setTimerFinished(false);
    setAlarmActive(false);
    setRemainingMs(totalMs);
    Vibration.cancel();
    stopAlarmSound();
    cancelRestTimerNotification(notifIdRef.current);
    notifIdRef.current = null;
    RestTimerActivity.end(true);
  }, [totalMs]);

  // ─── Force stop (no onTimerComplete callback) ────
  const forceStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    alarmIntervalRef.current = null;
    setIsRunning(false);
    setIsPaused(false);
    setTimerFinished(false);
    setAlarmActive(false);
    setRemainingMs(totalMs);
    Vibration.cancel();
    stopAlarmSound();
    cancelRestTimerNotification(notifIdRef.current);
    notifIdRef.current = null;
    RestTimerActivity.end(true);
  }, [totalMs]);

  // ─── Expose methods via ref ────
  useImperativeHandle(ref, () => ({
    dismissAlarm,
    reset: resetTimer,
    forceStop,
  }), [dismissAlarm, resetTimer, forceStop]);

  // ─── Select preset ────
  const selectPreset = (seconds: number) => {
    const newTotalMs = seconds * 1000;

    if (isRunning) {
      // Timer is active — calculate how much time has already elapsed
      const elapsed = Date.now() - startTimeRef.current;
      const alreadyElapsed = remainingAtStartRef.current - Math.max(0, remainingAtStartRef.current - elapsed);
      // New remaining = new total minus what's already elapsed (clamped to 0)
      const newRemaining = Math.max(0, newTotalMs - alreadyElapsed);

      setTotalMs(newTotalMs);
      setRemainingMs(newRemaining);
      setShowPresets(false);

      // Restart the interval with the recalculated remaining
      startInterval(newRemaining);

      // Reschedule notification with new remaining time
      cancelRestTimerNotification(notifIdRef.current);
      scheduleRestTimerNotification(newRemaining / 1000, athleteName).then(id => {
        notifIdRef.current = id;
      });

      // Notify parent so background timer can sync
      onDurationChange?.(seconds, newRemaining);
    } else if (isPaused) {
      // Timer is paused — calculate elapsed from the original total vs current remaining
      const alreadyElapsed = totalMs - remainingMs;
      const newRemaining = Math.max(0, newTotalMs - alreadyElapsed);

      setTotalMs(newTotalMs);
      setRemainingMs(newRemaining);
      setShowPresets(false);

      // Notify parent so background timer can sync
      onDurationChange?.(seconds, newRemaining);
    } else {
      // Timer not started — just set new duration
      setTotalMs(newTotalMs);
      setRemainingMs(newTotalMs);
      setShowPresets(false);
      setTimerFinished(false);
    }
  };

  // ─── Format mm:ss.cc (with centiseconds) ────
  const formatTimeFull = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // ─── Format mm:ss (short, for presets) ────
  const formatTimeShort = (s: number): string => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Progress fraction ────
  const progress = totalMs > 0 ? remainingMs / totalMs : 0;

  // ─── Determine ring color ────
  const ringColor = timerFinished
    ? C.accent
    : remainingMs <= 5000
      ? C.danger
      : remainingMs <= 10000
        ? C.warning
        : C.accent;

  // ─── Circumference for SVG ring (digital mode) ────
  const RING_SIZE = compact ? 64 : 200;
  const RING_STROKE = compact ? 4 : 6;
  const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // ─── Compact inline mode ────
  if (compact) {
    return (
      <View style={s.wrapper}>
        <TouchableOpacity
          style={[
            s.timerBtn,
            isRunning && s.timerBtnActive,
            timerFinished && s.timerBtnFinished,
          ]}
          onPress={isRunning ? pauseTimer : startTimer}
          onLongPress={resetTimer}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            {timerFinished ? (
              <Ionicons name="checkmark-circle" size={18} color={C.bg} />
            ) : isRunning ? (
              <Text style={s.timerText}>
                {formatTimeShort(Math.ceil(remainingMs / 1000))}
              </Text>
            ) : isPaused ? (
              <Text style={[s.timerText, { color: C.warning }]}>
                {formatTimeShort(Math.ceil(remainingMs / 1000))}
              </Text>
            ) : (
              <Ionicons name="timer-outline" size={18} color={C.accent} />
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Full timer UI ────
  return (
    <View style={s.container}>
      {/* Mode toggle: Digital ↔ Analog */}
      <View style={s.modeToggleRow}>
        <TouchableOpacity
          style={[s.modeBtn, !analogMode && s.modeBtnActive]}
          onPress={() => { setAnalogMode(false); onModeChange?.(false); }}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={14}
            color={!analogMode ? C.accent : C.muted} />
          <Text style={[s.modeBtnText, !analogMode && s.modeBtnTextActive]}>
            Digital
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeBtn, analogMode && s.modeBtnActive]}
          onPress={() => { setAnalogMode(true); onModeChange?.(true); }}
          activeOpacity={0.7}
        >
          <Ionicons name="speedometer-outline" size={14}
            color={analogMode ? C.accent : C.muted} />
          <Text style={[s.modeBtnText, analogMode && s.modeBtnTextActive]}>
            Análogo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timer Display */}
      <Animated.View style={[s.ringContainer, { transform: [{ scale: pulseAnim }] }]}>
        {analogMode ? (
          /* ─── Analog Chronometer ──── */
          <View style={s.analogWrapper}>
            <AnalogClock
              colors={C}
              remainingMs={remainingMs}
              totalMs={totalMs}
              isRunning={isRunning}
              timerFinished={timerFinished}
              size={200}
            />
            {/* Digital readout below analog face */}
            <Text style={[s.analogDigitalReadout, { color: ringColor }]}>
              {timerFinished ? '¡VAMOS!' : formatTimeFull(remainingMs)}
            </Text>
          </View>
        ) : (
          /* ─── Digital SVG Ring ──── */
          <View style={{ width: RING_SIZE, height: RING_SIZE }}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              {/* Background track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={C.border}
                strokeWidth={RING_STROKE}
              />
              {/* Progress arc */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={ringColor}
                strokeWidth={RING_STROKE}
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                strokeLinecap="round"
                transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
                opacity={0.3 + progress * 0.7}
              />
            </Svg>
            {/* Center text overlay */}
            <View style={s.digitalCenter}>
              {timerFinished ? (
                <Text style={[s.timerDisplay, { color: C.accent, fontSize: 32 }]}>
                  ¡VAMOS!
                </Text>
              ) : (
                <>
                  <Text style={[s.timerDisplay, { color: ringColor }]}>
                    {formatTimeFull(remainingMs)}
                  </Text>
                  <Text style={s.timerLabel}>
                    {isRunning ? 'Descansando' : isPaused ? 'Pausado' : 'Descanso'}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
      </Animated.View>

      {/* Controls Row */}
      <View style={s.controlsRow}>
        {/* Preset selector */}
        <TouchableOpacity
          style={s.presetBtn}
          onPress={() => setShowPresets(!showPresets)}
        >
          <Text style={s.presetBtnText}>
            {formatTimeShort(totalMs / 1000)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={C.muted} />
        </TouchableOpacity>

        {/* Main action button / Dismiss alarm */}
        {alarmActive ? (
          <TouchableOpacity
            style={s.dismissAlarmBtn}
            onPress={dismissAlarm}
            activeOpacity={0.7}
          >
            <Ionicons name="stop-circle" size={26} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              s.actionBtn,
              isRunning && s.actionBtnPause,
              timerFinished && s.actionBtnFinished,
            ]}
            onPress={isRunning ? pauseTimer : startTimer}
            activeOpacity={0.7}
          >
            <Ionicons
              name={timerFinished ? 'refresh' : isRunning ? 'pause' : 'play'}
              size={22}
              color={timerFinished ? C.bg : isRunning ? C.warning : C.bg}
            />
          </TouchableOpacity>
        )}

        {/* Reset button */}
        <TouchableOpacity
          style={s.resetBtn}
          onPress={resetTimer}
          disabled={!isRunning && !isPaused && !timerFinished}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={isRunning || isPaused || timerFinished ? C.danger : C.border}
          />
        </TouchableOpacity>
      </View>

      {/* Alarm active — prominent dismiss zone */}
      {alarmActive && (
        <View style={s.alarmZone}>
          <Animated.View style={[s.alarmPulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <TouchableOpacity style={s.alarmBanner} onPress={dismissAlarm} activeOpacity={0.7}>
            <View style={s.alarmIconWrap}>
              <Ionicons name="notifications" size={22} color="#fff" />
            </View>
            <View style={s.alarmTextWrap}>
              <Text style={s.alarmBannerTitle}>¡Tiempo de descanso terminado!</Text>
              <Text style={s.alarmBannerSub}>Toca aquí para detener la alarma</Text>
            </View>
            <View style={s.alarmStopPill}>
              <Ionicons name="stop" size={14} color="#fff" />
              <Text style={s.alarmStopText}>PARAR</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Presets dropdown */}
      {showPresets && (
        <View style={s.presetsRow}>
          {REST_PRESETS.map(sec => (
            <TouchableOpacity
              key={sec}
              style={[
                s.presetChip,
                sec * 1000 === totalMs && s.presetChipActive,
              ]}
              onPress={() => selectPreset(sec)}
            >
              <Text style={[
                s.presetChipText,
                sec * 1000 === totalMs && s.presetChipTextActive,
              ]}>
                {formatTimeShort(sec)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

// ─── Styles ────
const createStyles = (C: ThemeColors) => StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  timerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accentDim,
    borderWidth: 1.5,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBtnActive: {
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
  },
  timerBtnFinished: {
    borderColor: C.accent,
    backgroundColor: C.accent,
  },
  timerText: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // ─── Full timer styles ────
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 3,
    gap: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: C.border,
  },
  modeBtnText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: C.accent,
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  analogWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  analogDigitalReadout: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  digitalCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDisplay: {
    color: C.text,
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presetBtnText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtnPause: {
    backgroundColor: C.border,
    shadowOpacity: 0,
  },
  actionBtnFinished: {
    backgroundColor: C.accent,
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.border,
    borderWidth: 1,
    borderColor: C.border,
  },
  presetChipActive: {
    borderColor: C.accent,
    backgroundColor: C.accentDim,
  },
  presetChipText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  presetChipTextActive: {
    color: C.accent,
  },
  dismissAlarmBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  alarmZone: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  alarmPulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.15)',
  },
  alarmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,68,68,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,68,68,0.4)',
    width: '100%',
  },
  alarmIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmTextWrap: {
    flex: 1,
  },
  alarmBannerTitle: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  alarmBannerSub: {
    color: 'rgba(255,107,107,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  alarmStopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  alarmStopText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  alarmBannerText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
