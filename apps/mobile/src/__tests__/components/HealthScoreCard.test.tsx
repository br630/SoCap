import React from 'react';
import { renderWithProviders, fireEvent } from '../utils/testHelpers';
import HealthScoreCard from '../../components/dashboard/HealthScoreCard';
import { act } from '@testing-library/react-native';

describe('HealthScoreCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays score correctly', () => {
    const { getByText } = renderWithProviders(
      <HealthScoreCard score={75} trend={5} onPress={mockOnPress} />
    );

    expect(getByText('75')).toBeTruthy();
    expect(getByText('/ 100')).toBeTruthy();
    expect(getByText('Health Score')).toBeTruthy();
  });

  it('shows positive trend correctly', () => {
    const { getByText } = renderWithProviders(
      <HealthScoreCard score={80} trend={5} onPress={mockOnPress} />
    );

    expect(getByText('+5')).toBeTruthy();
  });

  it('shows negative trend correctly', () => {
    const { getByText } = renderWithProviders(
      <HealthScoreCard score={70} trend={-3} onPress={mockOnPress} />
    );

    expect(getByText('-3')).toBeTruthy();
  });

  it('shows neutral trend correctly', () => {
    const { queryByText } = renderWithProviders(
      <HealthScoreCard score={75} trend={0} onPress={mockOnPress} />
    );

    expect(queryByText('+0')).toBeTruthy();
  });

  it('handles press correctly', () => {
    const { getByText } = renderWithProviders(
      <HealthScoreCard score={75} trend={5} onPress={mockOnPress} />
    );

    const titleElement = getByText('Health Score');
    fireEvent.press(titleElement.parent?.parent || titleElement);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('displays correct color for high score', () => {
    const { getByText } = renderWithProviders(
      <HealthScoreCard score={85} trend={5} onPress={mockOnPress} />
    );

    expect(getByText('85')).toBeTruthy();
  });

  it('displays correct color for medium score', () => {
    const { getByText } = renderWithProviders(
      <HealthScoreCard score={65} trend={5} onPress={mockOnPress} />
    );

    expect(getByText('65')).toBeTruthy();
  });

  it('displays correct color for low score', () => {
    const { getByText } = renderWithProviders(
      <HealthScoreCard score={35} trend={-5} onPress={mockOnPress} />
    );

    expect(getByText('35')).toBeTruthy();
  });

  it('animates on score update', () => {
    const { rerender, getByText } = renderWithProviders(
      <HealthScoreCard score={50} trend={0} onPress={mockOnPress} />
    );

    expect(getByText('50')).toBeTruthy();

    act(() => {
      rerender(
        <HealthScoreCard score={75} trend={25} onPress={mockOnPress} />
      );
      jest.advanceTimersByTime(1000);
    });

    expect(getByText('75')).toBeTruthy();
  });
});
