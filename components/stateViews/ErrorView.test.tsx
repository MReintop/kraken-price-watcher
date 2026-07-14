import { render, screen, fireEvent } from '@testing-library/react';
import ErrorView from './ErrorView';

describe('ErrorView', () => {
  it('renders the provided message', () => {
    // Arrange / Act
    render(<ErrorView message="HTTP 503" onRetry={jest.fn()} />);

    // Assert
    expect(screen.getByText('HTTP 503')).toBeTruthy();
  });

  it('falls back to a generic message when none is given', () => {
    // Arrange / Act
    render(<ErrorView onRetry={jest.fn()} />);

    // Assert
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('calls onRetry when the retry affordance is pressed', () => {
    // Arrange
    const onRetry = jest.fn();
    render(<ErrorView onRetry={onRetry} />);

    // Act
    fireEvent.click(screen.getByText('Tap to retry'));

    // Assert
    expect(onRetry).toHaveBeenCalled();
  });
});
