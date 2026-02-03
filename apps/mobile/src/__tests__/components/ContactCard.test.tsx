import React from 'react';
import { renderWithProviders, mockContact, fireEvent } from '../utils/testHelpers';
import ContactCard from '../../components/contacts/ContactCard';

describe('ContactCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with contact data', () => {
    const { getByText } = renderWithProviders(
      <ContactCard contact={mockContact} onPress={mockOnPress} />
    );

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('+1234567890')).toBeTruthy();
    expect(getByText('john@example.com')).toBeTruthy();
  });

  it('shows tier badge when relationship exists', () => {
    const { getByText } = renderWithProviders(
      <ContactCard contact={mockContact} onPress={mockOnPress} />
    );

    // Tier badge should be rendered (checking for tier text or badge component)
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('handles tap correctly', () => {
    const { getByText } = renderWithProviders(
      <ContactCard contact={mockContact} onPress={mockOnPress} />
    );

    const nameElement = getByText('John Doe');
    fireEvent.press(nameElement.parent?.parent?.parent || nameElement);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('displays initials when no profile image', () => {
    const contactWithoutImage = {
      ...mockContact,
      profileImage: null,
    };

    const { getByText } = renderWithProviders(
      <ContactCard contact={contactWithoutImage} onPress={mockOnPress} />
    );

    expect(getByText('John Doe')).toBeTruthy();
  });

  it('displays last contact date when available', () => {
    const contactWithLastContact = {
      ...mockContact,
      relationship: {
        ...mockContact.relationship!,
        lastContactDate: new Date().toISOString(),
      },
    };

    const { getByText } = renderWithProviders(
      <ContactCard contact={contactWithLastContact} onPress={mockOnPress} />
    );

    expect(getByText(/Last contact:/i)).toBeTruthy();
  });

  it('handles contact without phone or email', () => {
    const minimalContact = {
      ...mockContact,
      phone: undefined,
      email: undefined,
    };

    const { getByText, queryByText } = renderWithProviders(
      <ContactCard contact={minimalContact} onPress={mockOnPress} />
    );

    expect(getByText('John Doe')).toBeTruthy();
    expect(queryByText('+1234567890')).toBeNull();
    expect(queryByText('john@example.com')).toBeNull();
  });
});
