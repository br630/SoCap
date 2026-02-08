import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  Checkbox,
  ActivityIndicator,
  ProgressBar,
  List,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useContacts } from '../../hooks/useContacts';
import contactService, { CreateContactData } from '../../services/contactService';

export default function ImportContactsScreen() {
  const navigation = useNavigation();
  const { importContacts, isImporting, importResult } = useContacts();

  const [phoneContacts, setPhoneContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadPhoneContacts();
  }, []);

  const loadPhoneContacts = async () => {
    try {
      setLoading(true);
      const contacts = await contactService.requestPhoneContacts();
      const converted = contactService.convertPhoneContacts(contacts);
      setPhoneContacts(converted);
      // Select all by default
      setSelectedContacts(new Set(converted.map((_, index) => index.toString())));
    } catch (error: any) {
      Alert.alert('Permission Required', error.message || 'Please grant contacts permission to import contacts.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (index: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedContacts(newSelected);
  };

  const handleImport = async () => {
    if (selectedContacts.size === 0) {
      Alert.alert('No Contacts Selected', 'Please select at least one contact to import.');
      return;
    }

    const contactsToImport = Array.from(selectedContacts)
      .map((index) => phoneContacts[parseInt(index)])
      .filter(Boolean);

    setImporting(true);
    setProgress(0);

    try {
      await importContacts(contactsToImport);
      
      Alert.alert(
        'Import Complete',
        `Successfully imported ${importResult?.created || contactsToImport.length} contacts.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Import Failed', 'Failed to import contacts. Please try again.');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading contacts from phone...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              Import Contacts
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Select the contacts you want to import. Duplicates will be automatically skipped.
            </Text>
          </Card.Content>
        </Card>

        {importing && (
          <Card style={styles.progressCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.progressText}>
                Importing contacts...
              </Text>
              <ProgressBar progress={progress} color="#5AC8FA" style={styles.progressBar} />
            </Card.Content>
          </Card>
        )}

        <View style={styles.header}>
          <Text variant="titleMedium">
            {phoneContacts.length} contacts found
          </Text>
          <Button
            mode="text"
            onPress={() => {
              if (selectedContacts.size === phoneContacts.length) {
                setSelectedContacts(new Set());
              } else {
                setSelectedContacts(new Set(phoneContacts.map((_, i) => i.toString())));
              }
            }}
          >
            {selectedContacts.size === phoneContacts.length ? 'Deselect All' : 'Select All'}
          </Button>
        </View>

        <FlatList
          data={phoneContacts}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => (
            <List.Item
              title={item.name}
              description={item.phone || item.email || 'No contact info'}
              left={(props) => (
                <Checkbox
                  status={selectedContacts.has(index.toString()) ? 'checked' : 'unchecked'}
                  onPress={() => toggleContact(index.toString())}
                />
              )}
              style={styles.listItem}
            />
          )}
          scrollEnabled={false}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text variant="bodyMedium" style={styles.footerText}>
          {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
        </Text>
        <Button
          mode="contained"
          onPress={handleImport}
          loading={isImporting || importing}
          disabled={isImporting || importing || selectedContacts.size === 0}
          style={styles.importButton}
        >
          Import Selected
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    marginBottom: 8,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    opacity: 0.7,
  },
  progressCard: {
    margin: 16,
    marginTop: 8,
  },
  progressText: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  importButton: {
    marginTop: 8,
  },
});
