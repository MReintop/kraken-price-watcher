import { render, screen } from '@testing-library/react';
import LiveBadge from './LiveBadge';

describe('LiveBadge', () => {
  it('shows "Live" when the stream is connected', () => {
    // Arrange / Act
    render(<LiveBadge live={true} />);

    // Assert
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('shows "Connecting…" when the stream is down', () => {
    // Arrange / Act
    render(<LiveBadge live={false} />);

    // Assert
    expect(screen.getByText('Connecting…')).toBeTruthy();
  });
});
