import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows, typography } from '../../theme/paperTheme';

// ——— Types ———

export type Period = 'AM' | 'PM';

// ——— Utility functions (adapted from reference) ———

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function convert12To24(hour: number, period: Period): number {
  if (period === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function convert24To12(hour24: number): { hour: number; period: Period } {
  if (hour24 === 0) return { hour: 12, period: 'AM' };
  if (hour24 < 12) return { hour: hour24, period: 'AM' };
  if (hour24 === 12) return { hour: 12, period: 'PM' };
  return { hour: hour24 - 12, period: 'PM' };
}

// ——— TimePickerInput ———

interface TimePickerInputProps {
  value: string;
  label: string;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
  onFocusNext?: () => void;
  onFocusPrev?: () => void;
}

const TimePickerInput = React.forwardRef<TextInput, TimePickerInputProps>(
  ({ value, label, min, max, onValueChange, onFocusNext, onFocusPrev }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [editBuffer, setEditBuffer] = useState('');

    const handleIncrement = () => {
      let num = parseInt(value, 10);
      num = num >= max ? min : num + 1;
      onValueChange(num);
    };

    const handleDecrement = () => {
      let num = parseInt(value, 10);
      num = num <= min ? max : num - 1;
      onValueChange(num);
    };

    const handleChangeText = (text: string) => {
      // Only allow digits
      const digits = text.replace(/\D/g, '');
      if (digits.length === 0) {
        setEditBuffer('');
        return;
      }

      if (digits.length === 1) {
        setEditBuffer(digits);
        // If the digit alone is already > max's tens digit, auto-complete
        const firstDigit = parseInt(digits, 10);
        if (firstDigit > Math.floor(max / 10)) {
          const clamped = clamp(firstDigit, min, max);
          onValueChange(clamped);
          setEditBuffer('');
          onFocusNext?.();
        }
        return;
      }

      // Two digits entered
      const num = parseInt(digits.slice(0, 2), 10);
      const clamped = clamp(num, min, max);
      onValueChange(clamped);
      setEditBuffer('');
      onFocusNext?.();
    };

    const handleFocus = () => {
      setIsFocused(true);
      setEditBuffer('');
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (editBuffer.length === 1) {
        const num = clamp(parseInt(editBuffer, 10), min, max);
        onValueChange(num);
      }
      setEditBuffer('');
    };

    const displayValue = isFocused && editBuffer ? editBuffer : value;

    return (
      <View style={styles.inputColumn}>
        <Text style={styles.inputLabel}>{label}</Text>

        {/* Up arrow */}
        <TouchableOpacity
          onPress={handleIncrement}
          style={styles.arrowButton}
          activeOpacity={0.6}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-up" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TextInput
          ref={ref}
          style={[
            styles.timeInput,
            isFocused && styles.timeInputFocused,
          ]}
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          caretHidden
          textAlign="center"
        />

        {/* Down arrow */}
        <TouchableOpacity
          onPress={handleDecrement}
          style={styles.arrowButton}
          activeOpacity={0.6}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-down" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }
);

TimePickerInput.displayName = 'TimePickerInput';

// ——— PeriodSelector ———

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  return (
    <View style={styles.inputColumn}>
      <Text style={styles.inputLabel}>Period</Text>
      <View style={styles.periodContainer}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'AM' && styles.periodButtonActive,
          ]}
          onPress={() => onPeriodChange('AM')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.periodText,
              period === 'AM' && styles.periodTextActive,
            ]}
          >
            AM
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            period === 'PM' && styles.periodButtonActive,
          ]}
          onPress={() => onPeriodChange('PM')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.periodText,
              period === 'PM' && styles.periodTextActive,
            ]}
          >
            PM
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ——— Main TimePicker Component ———

export interface TimePickerProps {
  /** The currently selected date (time portion is used) */
  date: Date;
  /** Called when the time changes */
  onTimeChange: (date: Date) => void;
  /** Optional label above the picker */
  label?: string;
}

export function TimePicker({ date, onTimeChange, label }: TimePickerProps) {
  const { hour: hour12, period } = convert24To12(date.getHours());
  const minutes = date.getMinutes();

  const hourRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);

  const updateTime = useCallback(
    (newHour12: number, newMinutes: number, newPeriod: Period) => {
      const hour24 = convert12To24(newHour12, newPeriod);
      const newDate = new Date(date);
      newDate.setHours(hour24, newMinutes, 0, 0);
      onTimeChange(newDate);
    },
    [date, onTimeChange]
  );

  const handleHourChange = (h: number) => updateTime(h, minutes, period);
  const handleMinuteChange = (m: number) => updateTime(hour12, m, period);
  const handlePeriodChange = (p: Period) => updateTime(hour12, minutes, p);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.pickerLabel}>{label}</Text>}
      <View style={styles.pickerRow}>
        <TimePickerInput
          ref={hourRef}
          value={pad2(hour12)}
          label="Hours"
          min={1}
          max={12}
          onValueChange={handleHourChange}
          onFocusNext={() => minuteRef.current?.focus()}
        />

        <Text style={styles.separator}>:</Text>

        <TimePickerInput
          ref={minuteRef}
          value={pad2(minutes)}
          label="Minutes"
          min={0}
          max={59}
          onValueChange={handleMinuteChange}
          onFocusPrev={() => hourRef.current?.focus()}
        />

        <PeriodSelector period={period} onPeriodChange={handlePeriodChange} />
      </View>
    </View>
  );
}

// ——— DurationPicker ———

export interface DurationPickerProps {
  /** Duration in minutes */
  durationMinutes: number;
  /** Called when duration changes */
  onDurationChange: (minutes: number) => void;
}

const QUICK_DURATIONS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
];

export function DurationPicker({ durationMinutes, onDurationChange }: DurationPickerProps) {
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  const formatDuration = () => {
    if (durationMinutes <= 0) return 'Invalid';
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  const incrementBy = (amount: number) => {
    const newDuration = Math.max(15, durationMinutes + amount);
    onDurationChange(newDuration);
  };

  return (
    <View style={styles.durationContainer}>
      <View style={styles.durationHeader}>
        <Ionicons name="hourglass-outline" size={18} color={colors.secondary} />
        <Text style={styles.durationLabel}>Duration</Text>
        <Text style={styles.durationValue}>{formatDuration()}</Text>
      </View>

      {/* Quick duration chips */}
      <View style={styles.durationChips}>
        {QUICK_DURATIONS.map((d) => (
          <TouchableOpacity
            key={d.minutes}
            style={[
              styles.durationChip,
              durationMinutes === d.minutes && styles.durationChipActive,
            ]}
            onPress={() => onDurationChange(d.minutes)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.durationChipText,
                durationMinutes === d.minutes && styles.durationChipTextActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fine-tune buttons */}
      <View style={styles.durationAdjust}>
        <TouchableOpacity
          style={styles.durationAdjustButton}
          onPress={() => incrementBy(-15)}
          activeOpacity={0.6}
        >
          <Ionicons name="remove" size={16} color={colors.textSecondary} />
          <Text style={styles.durationAdjustText}>15 min</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.durationAdjustButton}
          onPress={() => incrementBy(15)}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={16} color={colors.textSecondary} />
          <Text style={styles.durationAdjustText}>15 min</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.durationAdjustButton}
          onPress={() => incrementBy(-60)}
          activeOpacity={0.6}
        >
          <Ionicons name="remove" size={16} color={colors.textSecondary} />
          <Text style={styles.durationAdjustText}>1 hr</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.durationAdjustButton}
          onPress={() => incrementBy(60)}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={16} color={colors.textSecondary} />
          <Text style={styles.durationAdjustText}>1 hr</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ——— Styles ———

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  pickerLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.light,
  },
  inputColumn: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arrowButton: {
    padding: spacing.xs,
  },
  timeInput: {
    width: 52,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...(Platform.OS === 'web'
      ? { fontFamily: 'monospace', outlineStyle: 'none' as any }
      : { fontVariant: ['tabular-nums'] }),
  },
  timeInputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  separator: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: spacing.xs,
    paddingTop: 20, // offset for the label above
  },
  periodContainer: {
    marginLeft: spacing.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'column',
    marginTop: 20, // offset for label
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },

  // Duration picker
  durationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.light,
    marginBottom: spacing.md,
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  durationLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  durationValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.secondary,
  },
  durationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  durationChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationChipTextActive: {
    color: '#FFFFFF',
  },
  durationAdjust: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  durationAdjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationAdjustText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
