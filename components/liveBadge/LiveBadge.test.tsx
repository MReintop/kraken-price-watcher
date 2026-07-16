import { render, screen } from '@testing-library/react';
import LiveBadge from './LiveBadge';

describe('LiveBadge', () => {
  it('shows "Live" once the feed is acknowledged and flowing', () => {
    // Arrange / Act
    render(<LiveBadge status="live" tracked={8} unavailable={0} />);

    // Assert
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('shows "Connecting…" before the feed is established', () => {
    // Arrange / Act
    render(<LiveBadge status="connecting" tracked={8} unavailable={0} />);

    // Assert
    expect(screen.getByText('Connecting…')).toBeTruthy();
  });

  it('distinguishes a silent feed from a connecting one', () => {
    // Arrange / Act
    render(<LiveBadge status="stale" tracked={8} unavailable={0} />);

    // Assert — the prices are still on screen and still look current, so
    // "Connecting…" here would imply they are about to be right
    expect(screen.getByText('Not updating')).toBeTruthy();
  });

  it('distinguishes a dropped feed from a silent one', () => {
    // Arrange / Act
    render(<LiveBadge status="offline" tracked={8} unavailable={0} />);

    // Assert
    expect(screen.getByText('Offline')).toBeTruthy();
  });

  it('announces the feed state to a screen reader', () => {
    // Arrange / Act
    render(<LiveBadge status="stale" tracked={8} unavailable={0} />);

    // Assert — a colour change is not an announcement
    expect(screen.getByLabelText('Price feed: Not updating')).toBeTruthy();
  });
});
