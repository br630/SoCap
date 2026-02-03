import React, { useState } from 'react';
import { TextInput, TextInputProps } from 'react-native-paper';
import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface SecureTextInputProps extends TextInputProps {
  clearClipboardOnPaste?: boolean;
  clearClipboardDelay?: number;
}

/**
 * Secure Text Input Component
 * - Uses secureTextEntry for passwords
 * - Clears clipboard after paste (optional)
 * - Disables autocomplete on sensitive fields
 */
export default function SecureTextInput({
  clearClipboardOnPaste = false,
  clearClipboardDelay = 30000, // 30 seconds
  ...props
}: SecureTextInputProps) {
  const [isSecure, setIsSecure] = useState(props.secureTextEntry ?? false);

  const handlePaste = async () => {
    if (clearClipboardOnPaste) {
      // Clear clipboard after delay
      setTimeout(async () => {
        try {
          await Clipboard.setStringAsync('');
        } catch (error) {
          console.error('Error clearing clipboard:', error);
        }
      }, clearClipboardDelay);
    }
  };

  return (
    <TextInput
      {...props}
      secureTextEntry={isSecure}
      autoComplete={props.autoComplete || (isSecure ? 'off' : undefined)}
      textContentType={Platform.OS === 'ios' && isSecure ? 'password' : props.textContentType}
      autoCorrect={false}
      autoCapitalize="none"
      right={
        props.secureTextEntry !== undefined ? (
          <TextInput.Icon
            icon={isSecure ? 'eye-off' : 'eye'}
            onPress={() => setIsSecure(!isSecure)}
          />
        ) : (
          props.right
        )
      }
      onPaste={handlePaste}
    />
  );
}
