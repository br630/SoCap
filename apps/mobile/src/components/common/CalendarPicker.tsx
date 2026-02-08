import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows, typography } from '../../theme/paperTheme';

// ——— Types ———

type ViewLevel = 'year' | 'month' | 'day';

export interface CalendarPickerProps {
  /** Currently visible in the modal */
  visible: boolean;
  /** Currently selected date (or sensible default) */
  value: Date;
  /** Modal title */
  title?: string;
  /** Earliest selectable date */
  minimumDate?: Date;
  /** Latest selectable date */
  maximumDate?: Date;
  /** Called when user confirms a date */
  onConfirm: (date: Date) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

// ——— Constants ———

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ——— Helpers ———

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

// ——— Year Grid ———

interface YearGridProps {
  selectedYear: number;
  minYear: number;
  maxYear: number;
  onSelectYear: (year: number) => void;
}

function YearGrid({ selectedYear, minYear, maxYear, onSelectYear }: YearGridProps) {
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      arr.push(y);
    }
    return arr;
  }, [minYear, maxYear]);

  return (
    <View style={gridStyles.container}>
      {years.map((year) => {
        const isSelected = year === selectedYear;
        return (
          <TouchableOpacity
            key={year}
            style={[gridStyles.cell, isSelected && gridStyles.cellSelected]}
            onPress={() => onSelectYear(year)}
            activeOpacity={0.6}
          >
            <Text style={[gridStyles.cellText, isSelected && gridStyles.cellTextSelected]}>
              {year}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ——— Month Grid ———

interface MonthGridProps {
  selectedMonth: number; // 0-11
  selectedYear: number;
  onSelectMonth: (month: number) => void;
}

function MonthGrid({ selectedMonth, selectedYear, onSelectMonth }: MonthGridProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return (
    <View style={gridStyles.container}>
      {MONTH_SHORT.map((name, index) => {
        const isSelected = index === selectedMonth;
        const isCurrent = index === currentMonth && selectedYear === currentYear;
        return (
          <TouchableOpacity
            key={name}
            style={[
              gridStyles.cell,
              isSelected && gridStyles.cellSelected,
              isCurrent && !isSelected && gridStyles.cellCurrent,
            ]}
            onPress={() => onSelectMonth(index)}
            activeOpacity={0.6}
          >
            <Text
              style={[
                gridStyles.cellText,
                isSelected && gridStyles.cellTextSelected,
                isCurrent && !isSelected && gridStyles.cellTextCurrent,
              ]}
            >
              {name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cell: {
    width: '30%',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cellSelected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  cellCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cellText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cellTextCurrent: {
    color: colors.primary,
    fontWeight: '600',
  },
});

// ——— Day Grid (Calendar) ———

interface DayGridProps {
  year: number;
  month: number;
  selectedDate: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onSelectDay: (date: Date) => void;
}

function DayGrid({ year, month, selectedDate, minimumDate, maximumDate, onSelectDay }: DayGridProps) {
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let startWeekday = firstDay.getDay() - 1; // Monday = 0
    if (startWeekday < 0) startWeekday = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

    // Previous month days
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrev - i), inMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }

    // Next month fill
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        cells.push({ date: new Date(year, month + 1, d), inMonth: false });
      }
    }

    const rows: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const isDisabled = useCallback(
    (date: Date) => {
      if (minimumDate) {
        const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
        if (date.getTime() < min.getTime()) return true;
      }
      if (maximumDate) {
        const max = new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate());
        if (date.getTime() > max.getTime()) return true;
      }
      return false;
    },
    [minimumDate, maximumDate]
  );

  return (
    <View style={dayStyles.grid}>
      {/* Weekday headers */}
      <View style={dayStyles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={dayStyles.weekdayCell}>
            <Text style={dayStyles.weekdayText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Day rows */}
      {weeks.map((week, wi) => (
        <View key={wi} style={dayStyles.weekRow}>
          {week.map((cell, di) => {
            const selected = isSameDay(cell.date, selectedDate);
            const today = isToday(cell.date);
            const disabled = !cell.inMonth || isDisabled(cell.date);

            return (
              <TouchableOpacity
                key={di}
                style={dayStyles.dayCell}
                onPress={() => {
                  if (!disabled) onSelectDay(cell.date);
                }}
                disabled={disabled}
                activeOpacity={disabled ? 1 : 0.5}
              >
                <View
                  style={[
                    dayStyles.dayCircle,
                    selected && dayStyles.dayCircleSelected,
                    today && !selected && dayStyles.dayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      dayStyles.dayText,
                      !cell.inMonth && dayStyles.dayTextOutside,
                      disabled && dayStyles.dayTextDisabled,
                      selected && dayStyles.dayTextSelected,
                      today && !selected && dayStyles.dayTextToday,
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

const dayStyles = StyleSheet.create({
  grid: {},
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  weekdayText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: { backgroundColor: colors.textPrimary },
  dayCircleToday: { backgroundColor: colors.primary },
  dayText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  dayTextOutside: { color: colors.textTertiary },
  dayTextDisabled: { color: colors.textTertiary },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  dayTextToday: { color: '#FFFFFF', fontWeight: '700' },
});

// ——— Main CalendarPicker ———

export function CalendarPicker({
  visible,
  value,
  title = 'Select a Date',
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}: CalendarPickerProps) {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('year');
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedDate, setSelectedDate] = useState(value);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedYear(value.getFullYear());
      setSelectedMonth(value.getMonth());
      setSelectedDate(value);
      setViewLevel('year');
    }
  }, [visible, value]);

  // Year range
  const minYear = minimumDate?.getFullYear() ?? 1920;
  const maxYear = maximumDate?.getFullYear() ?? new Date().getFullYear() + 5;

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    setViewLevel('month');
  };

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    setViewLevel('day');
  };

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    onConfirm(date);
  };

  const handleBack = () => {
    if (viewLevel === 'day') setViewLevel('month');
    else if (viewLevel === 'month') setViewLevel('year');
    else onCancel();
  };

  // Navigation for day view (prev/next month)
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Header title based on view level
  const getTitle = () => {
    switch (viewLevel) {
      case 'year':
        return 'Select a Year';
      case 'month':
        return `Select a Month`;
      case 'day':
        return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {viewLevel !== 'year' && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.6}>
                  <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle}>{getTitle()}</Text>
            </View>

            {/* View level toggle (Year / Month) — only in year or month view */}
            {viewLevel !== 'day' ? (
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.toggleButton, viewLevel === 'year' && styles.toggleButtonActive]}
                  onPress={() => setViewLevel('year')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleText, viewLevel === 'year' && styles.toggleTextActive]}>
                    Year
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, viewLevel === 'month' && styles.toggleButtonActive]}
                  onPress={() => setViewLevel('month')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleText, viewLevel === 'month' && styles.toggleTextActive]}>
                    Month
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Month navigation arrows in day view */
              <View style={styles.monthArrows}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthArrowButton} activeOpacity={0.6}>
                  <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={nextMonth} style={styles.monthArrowButton} activeOpacity={0.6}>
                  <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Breadcrumb / context */}
          {viewLevel === 'month' && (
            <Text style={styles.breadcrumb}>{selectedYear}</Text>
          )}

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {viewLevel === 'year' && (
              <YearGrid
                selectedYear={selectedYear}
                minYear={minYear}
                maxYear={maxYear}
                onSelectYear={handleSelectYear}
              />
            )}
            {viewLevel === 'month' && (
              <MonthGrid
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onSelectMonth={handleSelectMonth}
              />
            )}
            {viewLevel === 'day' && (
              <DayGrid
                year={selectedYear}
                month={selectedMonth}
                selectedDate={selectedDate}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onSelectDay={handleSelectDay}
              />
            )}
          </ScrollView>

          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.6}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ——— Styles ———

const styles = StyleSheet.create({
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
    maxWidth: 400,
    maxHeight: '85%',
    ...shadows.heavy,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonActive: {
    backgroundColor: colors.textPrimary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  monthArrows: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  monthArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumb: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  content: {
    flexGrow: 0,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
