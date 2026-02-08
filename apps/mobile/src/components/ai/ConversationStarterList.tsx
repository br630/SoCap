import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

interface ConversationStarterListProps {
  starters: string[] | null;
  contactName?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ConversationStarterList({
  starters,
  contactName = 'them',
  isLoading = false,
  onRefresh,
}: ConversationStarterListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    await Clipboard.setStringAsync(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💬 Conversation Starters</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#5856D6" />
          <Text style={styles.loadingText}>
            Finding topics for {contactName}...
          </Text>
        </View>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <View style={styles.skeletonText} />
          </View>
        ))}
      </View>
    );
  }

  // Empty state
  if (!starters || starters.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={40} color="#ccc" />
          <Text style={styles.emptyText}>No conversation starters yet</Text>
          {onRefresh && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Get Ideas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Conversation Starters</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
            <Ionicons name="refresh-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        Tap any topic to copy it to your clipboard
      </Text>

      {starters.map((starter, index) => {
        const isCopied = copiedIndex === index;
        
        return (
          <TouchableOpacity
            key={index}
            style={[styles.starterItem, isCopied && styles.starterItemCopied]}
            onPress={() => handleCopy(starter, index)}
            activeOpacity={0.7}
          >
            <View style={styles.starterContent}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              <Text style={styles.starterText}>{starter}</Text>
            </View>
            <View style={styles.copyIndicator}>
              {isCopied ? (
                <>
                  <Ionicons name="checkmark" size={16} color="#34C759" />
                  <Text style={styles.copiedText}>Copied!</Text>
                </>
              ) : (
                <Ionicons name="copy-outline" size={16} color="#999" />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  refreshIcon: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  starterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  starterItemCopied: {
    backgroundColor: '#E8F5E9',
    borderColor: '#34C759',
  },
  starterContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5856D620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5856D6',
  },
  starterText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  copyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  copiedText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  skeletonItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  skeletonText: {
    width: '90%',
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  refreshButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#5856D6',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ConversationStarterList;
