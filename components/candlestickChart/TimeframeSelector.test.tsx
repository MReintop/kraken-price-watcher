import { render, screen, fireEvent } from '@testing-library/react';
import { Timeframe } from '../../types';
import TimeframeSelector from './TimeframeSelector';

describe('TimeframeSelector', () => {
  it('renders a chip for every timeframe', () => {
    // Arrange / Act — value=Month exercises both selected + unselected styling
    render(<TimeframeSelector value={Timeframe.Month} onChange={jest.fn()} />);

    // Assert
    expect(screen.getByText('24H')).toBeTruthy();
    expect(screen.getByText('1M')).toBeTruthy();
    expect(screen.getByText('1Y')).toBeTruthy();
  });

  it('calls onChange with the pressed timeframe', () => {
    // Arrange
    const onChange = jest.fn();
    render(<TimeframeSelector value={Timeframe.Month} onChange={onChange} />);

    // Act
    fireEvent.click(screen.getByText('1Y'));

    // Assert
    expect(onChange).toHaveBeenCalledWith(Timeframe.Year);
  });
});
