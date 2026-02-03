import React from 'react';
import { renderWithProviders, fireEvent } from '../utils/testHelpers';
import SecureTextInput from '../../components/security/SecureTextInput';

describe('SecureTextInput', () => {
  it('renders correctly', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SecureTextInput
        placeholder="Enter password"
        value=""
        onChangeText={jest.fn()}
      />
    );

    expect(getByPlaceholderText('Enter password')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const mockOnChangeText = jest.fn();
    const { getByPlaceholderText } = renderWithProviders(
      <SecureTextInput
        placeholder="Enter password"
        value=""
        onChangeText={mockOnChangeText}
      />
    );

    const input = getByPlaceholderText('Enter password');
    fireEvent.changeText(input, 'new password');

    expect(mockOnChangeText).toHaveBeenCalledWith('new password');
  });

  it('displays error state when error prop is provided', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SecureTextInput
        placeholder="Enter password"
        value=""
        onChangeText={jest.fn()}
        error={true}
      />
    );

    const input = getByPlaceholderText('Enter password');
    expect(input).toBeTruthy();
  });

  it('has secure text entry enabled by default', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SecureTextInput
        placeholder="Enter password"
        value=""
        onChangeText={jest.fn()}
      />
    );

    const input = getByPlaceholderText('Enter password');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('can disable secure text entry', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SecureTextInput
        placeholder="Enter text"
        value=""
        onChangeText={jest.fn()}
        secureTextEntry={false}
      />
    );

    const input = getByPlaceholderText('Enter text');
    expect(input.props.secureTextEntry).toBe(false);
  });
});
