import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows, typography } from '../../theme/paperTheme';

// ——— Types ———

export interface DateRangePickerProps {
  /** Start date+time */
  startDate: Date;
  /** End date+time */
  endDate: Date;
  /** Called when the user applies the selection */
  onApply: (start: Date, end: Date) => void;
  /** Minimum selectable date */
  minimumDate?: Date;
  /** Placeholder text when no date is selected */
  placeholder?: string;
}

// ——— Helpers ———

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(day: Date, start: Date, end: Date): boolean {
  const d = day.getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d > s && d < e;
}

function isBeforeDay(a: Date, b: Date): boolean {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return ad.getTime() < bd.getTime();
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeHHMM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatRangeLabel(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (isSameDay(start, end)) return startStr;
  return `${startStr} – ${endStr}`;
}

// ——— Calendar Grid ———

interface CalendarGridProps {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  minimumDate?: Date;
  onDayPress: (day: Date) => void;
}

function CalendarGrid({ year, month, startDate, endDate, minimumDate, onDayPress }: CalendarGridProps) {
  const weeks = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    // Monday = 0, Sunday = 6
    let startWeekday = firstDayOfMonth.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

    // Previous month trailing days
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        inMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        inMonth: true,
      });
    }

    // Next month leading days (fill to complete last week)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          date: new Date(year, month + 1, d),
          inMonth: false,
        });
      }
    }

    // Split into weeks
    const rows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const isDisabled = useCallback(
    (date: Date) => {
      if (!minimumDate) return false;
      const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
      return date.getTime() < min.getTime();
    },
    [minimumDate]
  );

  return (
    <View style={calStyles.grid}>
      {/* Weekday headers */}
      <View style={calStyles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={calStyles.weekdayCell}>
            <Text style={calStyles.weekdayText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Day rows */}
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map((cell, di) => {
            const isStart = isSameDay(cell.date, startDate);
            const isEnd = isSameDay(cell.date, endDate);
            const inRange = !isSameDay(startDate, endDate) && isInRange(cell.date, startDate, endDate);
            const disabled = !cell.inMonth || isDisabled(cell.date);
            const isToday = isSameDay(cell.date, new Date());

            return (
              <TouchableOpacity
                key={di}
                style={[
                  calStyles.dayCell,
                  inRange && calStyles.dayCellInRange,
                  isStart && calStyles.dayCellRangeStart,
                  isEnd && calStyles.dayCellRangeEnd,
                ]}
                onPress={() => {
                  if (!disabled) onDayPress(cell.date);
                }}
                activeOpacity={disabled ? 1 : 0.5}
                disabled={disabled}
              >
                <View
                  style={[
                    calStyles.dayCircle,
                    (isStart || isEnd) && calStyles.dayCircleSelected,
                    isToday && !isStart && !isEnd && calStyles.dayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      calStyles.dayText,
                      !cell.inMonth && calStyles.dayTextOutside,
                      disabled && calStyles.dayTextDisabled,
                      (isStart || isEnd) && calStyles.dayTextSelected,
                      isToday && !isStart && !isEnd && calStyles.dayTextToday,
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: { marginBottom: spacing.md },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayCellInRange: {
    backgroundColor: colors.primary + '15',
  },
  dayCellRangeStart: {
    backgroundColor: colors.primary + '15',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  dayCellRangeEnd: {
    backgroundColor: colors.primary + '15',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.textPrimary,
  },
  dayCircleToday: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayTextOutside: {
    color: colors.textTertiary,
  },
  dayTextDisabled: {
    color: colors.textTertiary,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

// ——— Time Input (inline hours:minutes) ———

interface TimeInputProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
}

function TimeInput({ value, onChange }: TimeInputProps) {
  const handleChange = (text: string) => {
    // Allow only digits and colon
    const cleaned = text.replace(/[^0-9:]/g, '');

    // Auto-format: if user types 4 digits, insert colon
    if (cleaned.length === 4 && !cleaned.includes(':')) {
      const formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
      onChange(formatted);
      return;
    }

    // Validate and clamp on blur-like behavior
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      let h = parseInt(parts[0] || '0', 10);
      let m = parseInt(parts[1] || '0', 10);
      h = Math.min(23, Math.max(0, isNaN(h) ? 0 : h));
      m = Math.min(59, Math.max(0, isNaN(m) ? 0 : m));
      onChange(`${pad2(h)}:${pad2(m)}`);
      return;
    }

    onChange(cleaned.slice(0, 5));
  };

  return (
    <RNTextInput
      style={styles.timeInput}
      value={value}
      onChangeText={handleChange}
      keyboardType="number-pad"
      maxLength={5}
      placeholder="00:00"
      placeholderTextColor={colors.textTertiary}
      selectTextOnFocus
    />
  );
}

// ——— Date Input (read-only display) ———

interface DateInputProps {
  value: string;
  onPress: () => void;
}

function DateInput({ value, onPress }: DateInputProps) {
  return (
    <TouchableOpacity style={styles.dateInput} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.dateInputText}>{value}</Text>
    </TouchableOpacity>
  );
}

// ——— Main DateRangePicker ———

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
  minimumDate,
  placeholder = 'Select Date Range',
}: DateRangePickerProps) {
  const [visible, setVisible] = useState(false);

  // Temporary state for the modal
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [selectingEnd, setSelectingEnd] = useState(false);

  // Calendar navigation
  const [viewYear, setViewYear] = useState(startDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(startDate.getMonth());

  const openPicker = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setViewYear(startDate.getFullYear());
    setViewMonth(startDate.getMonth());
    setSelectingEnd(false);
    setVisible(true);
  };

  const handleDayPress = (day: Date) => {
    if (!selectingEnd) {
      // Selecting start date — preserve time from tempStart
      const newStart = new Date(day);
      newStart.setHours(tempStart.getHours(), tempStart.getMinutes(), 0, 0);
      setTempStart(newStart);

      // If the new start is after end, reset end to same day
      if (isBeforeDay(tempEnd, newStart) || isSameDay(tempEnd, tempEnd)) {
        const newEnd = new Date(day);
        newEnd.setHours(tempEnd.getHours(), tempEnd.getMinutes(), 0, 0);
        if (newEnd.getTime() <= newStart.getTime()) {
          newEnd.setHours(23, 59, 0, 0);
        }
        setTempEnd(newEnd);
      }
      setSelectingEnd(true);
    } else {
      // Selecting end date
      const newEnd = new Date(day);
      newEnd.setHours(tempEnd.getHours(), tempEnd.getMinutes(), 0, 0);

      if (isBeforeDay(newEnd, tempStart)) {
        // User clicked before start, treat as new start
        const newStart = new Date(day);
        newStart.setHours(tempStart.getHours(), tempStart.getMinutes(), 0, 0);
        setTempStart(newStart);
        setSelectingEnd(true);
      } else {
        setTempEnd(newEnd);
        setSelectingEnd(false);
      }
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleApply = () => {
    // Ensure end is after start
    let finalEnd = tempEnd;
    if (finalEnd.getTime() <= tempStart.getTime()) {
      finalEnd = new Date(tempStart.getTime() + 60 * 60 * 1000); // +1 hour
    }
    onApply(tempStart, finalEnd);
    setVisible(false);
  };

  const handleStartTimeChange = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const updated = new Date(tempStart);
      updated.setHours(h, m, 0, 0);
      setTempStart(updated);
    }
  };

  const handleEndTimeChange = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const updated = new Date(tempEnd);
      updated.setHours(h, m, 0, 0);
      setTempEnd(updated);
    }
  };

  const rangeLabel = formatRangeLabel(startDate, endDate);
  const hasSelection = startDate.getTime() !== endDate.getTime() || startDate.getTime() > 0;

  // Timezone display
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity style={styles.triggerButton} onPress={openPicker} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.triggerText, !hasSelection && styles.triggerPlaceholder]}>
          {hasSelection ? rangeLabel : placeholder}
        </Text>
        {hasSelection && (
          <Text style={styles.triggerTime}>
            {formatTimeHHMM(startDate)} – {formatTimeHHMM(endDate)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header with date range summary */}
              <View style={styles.modalHeader}>
                <View style={styles.headerDateRange}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.headerDateText}>
                    {formatRangeLabel(tempStart, tempEnd)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Month Navigation */}
              <View style={styles.monthNav}>
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <View style={styles.monthArrows}>
                  <TouchableOpacity onPress={prevMonth} style={styles.monthArrowButton} activeOpacity={0.6}>
                    <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={nextMonth} style={styles.monthArrowButton} activeOpacity={0.6}>
                    <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calendar Grid */}
              <CalendarGrid
                year={viewYear}
                month={viewMonth}
                startDate={tempStart}
                endDate={tempEnd}
                minimumDate={minimumDate}
                onDayPress={handleDayPress}
              />

              {/* Divider */}
              <View style={styles.divider} />

              {/* Start Date/Time Row */}
              <View style={styles.dateTimeSection}>
                <Text style={styles.dateTimeLabel}>Start</Text>
                <View style={styles.dateTimeRow}>
                  <DateInput
                    value={formatDateShort(tempStart)}
                    onPress={() => {
                      setSelectingEnd(false);
                      // Navigate calendar to start month
                      setViewYear(tempStart.getFullYear());
                      setViewMonth(tempStart.getMonth());
                    }}
                  />
                  <TimeInput value={formatTimeHHMM(tempStart)} onChange={handleStartTimeChange} />
                </View>
              </View>

              {/* End Date/Time Row */}
              <View style={styles.dateTimeSection}>
                <Text style={styles.dateTimeLabel}>End</Text>
                <View style={styles.dateTimeRow}>
                  <DateInput
                    value={formatDateShort(tempEnd)}
                    onPress={() => {
                      setSelectingEnd(true);
                      // Navigate calendar to end month
                      setViewYear(tempEnd.getFullYear());
                      setViewMonth(tempEnd.getMonth());
                    }}
                  />
                  <TimeInput value={formatTimeHHMM(tempEnd)} onChange={handleEndTimeChange} />
                </View>
              </View>

              {/* Apply Button */}
              <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.7}>
                <Text style={styles.applyText}>Apply ↵</Text>
              </TouchableOpacity>

              {/* Timezone */}
              <View style={styles.tzRow}>
                <Text style={styles.tzText}>Local ({tz})</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ——— Styles ———

const styles = StyleSheet.create({
  // Trigger button
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.light,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  triggerPlaceholder: {
    color: colors.textSecondary,
  },
  triggerTime: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    ...shadows.heavy,
  },

  // Modal header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerDateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthArrows: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  monthArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Date/Time input sections
  dateTimeSection: {
    marginBottom: spacing.md,
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  timeInput: {
    width: 72,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  // Apply button
  applyButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  applyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Timezone
  tzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tzText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
