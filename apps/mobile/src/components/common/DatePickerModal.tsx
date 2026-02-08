import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { TimePicker } from './TimePicker';
import { colors } from '../../theme/paperTheme';

// Only import DateTimePicker for native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

/**
 * Cross-platform date/time picker
 * - Web: Shows HTML date input in a modal
 * - iOS: Shows in a modal with Done/Cancel buttons
 * - Android: Shows native dialog (auto-dismisses on selection)
 */
export function DatePickerModal({
  visible,
  value,
  mode = 'date',
  minimumDate,
  maximumDate,
  title,
  onConfirm,
  onCancel,
}: DatePickerModalProps) {
  const [tempDate, setTempDate] = React.useState(value);

  // Reset temp date when modal opens
  React.useEffect(() => {
    if (visible) {
      setTempDate(value);
    }
  }, [visible, value]);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android: Dialog auto-dismisses
      if (event.type === 'set' && selectedDate) {
        onConfirm(selectedDate);
      } else {
        onCancel();
      }
    } else {
      // iOS: Update temp date, user will confirm with Done button
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm(tempDate);
  };

  // Format date for HTML input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Web: Use HTML date input or custom TimePicker
  if (Platform.OS === 'web') {
    if (!visible) return null;
    
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
      >
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.webModalContent}>
                {title && <Text style={styles.webTitle}>{title}</Text>}
                
                {mode === 'time' ? (
                  <View style={{ marginVertical: 8 }}>
                    <TimePicker
                      date={tempDate}
                      onTimeChange={(newDate) => setTempDate(newDate)}
                    />
                  </View>
                ) : (
                  <input
                    type="date"
                    value={formatDateForInput(tempDate)}
                    min={minimumDate ? formatDateForInput(minimumDate) : undefined}
                    max={maximumDate ? formatDateForInput(maximumDate) : undefined}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setTempDate(newDate);
                      }
                    }}
                    style={{
                      fontSize: 18,
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      marginVertical: 16,
                      width: '100%',
                    }}
                  />
                )}

                <View style={styles.webButtonRow}>
                  <TouchableOpacity onPress={onCancel} style={styles.webButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleConfirm} style={[styles.webButton, styles.webConfirmButton]}>
                    <Text style={[styles.doneText, { color: '#FFFFFF' }]}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  // Android: Just render the picker directly when visible
  if (Platform.OS === 'android') {
    if (!visible || !DateTimePicker) return null;
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={handleChange}
      />
    );
  }

  // iOS: Render in a modal with header
  if (!DateTimePicker) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                {title && <Text style={styles.title}>{title}</Text>}
                <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Picker */}
              <DateTimePicker
                value={tempDate}
                mode={mode}
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={handleChange}
                style={styles.picker}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  picker: {
    height: 200,
  },
  // Web styles
  webModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 'auto',
    width: 320,
    maxWidth: '90%',
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  webButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  webButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  webConfirmButton: {
    backgroundColor: '#007AFF',
  },
});
