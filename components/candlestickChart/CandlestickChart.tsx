import { View } from 'react-native';
import { Svg, Line, Rect, G, Text as SvgText } from 'react-native-svg';
import { Candle, Timeframe } from '../../types';
import {
  computeCandleLayout,
  priceDomain,
  niceTicks,
  priceToY,
  formatAxisPrice,
  formatAxisTime,
  evenlySpacedIndices,
  describeCandles,
} from '../../lib/candleChart';
import { theme } from '../../theme';

const RIGHT_AXIS = 48; // room for price labels
const BOTTOM_AXIS = 22; // room for time labels
const X_LABEL_COUNT = 5;
const AXIS_FONT = 10;

interface CandlestickChartProps {
  candles: Candle[];
  width: number;
  height: number;
  timeframe: Timeframe;
  priceDecimals: number;
}

export default function CandlestickChart({
  candles,
  width,
  height,
  timeframe,
  priceDecimals,
}: CandlestickChartProps) {
  const plotWidth = Math.max(width - RIGHT_AXIS, 0);
  const plotHeight = Math.max(height - BOTTOM_AXIS, 0);

  // Nice round tick bounds → candles + gridlines share the same scale.
  const { min, max } = priceDomain(candles);
  const ticks = niceTicks(min, max, 5);
  const domain = { min: ticks[0], max: ticks[ticks.length - 1] };

  const layout = computeCandleLayout(
    candles,
    { width: plotWidth, height: plotHeight },
    domain,
  );

  // Evenly-spaced x-label indices.
  const labelIdx = evenlySpacedIndices(candles.length, X_LABEL_COUNT);

  return (
    // One node, not hundreds: `accessible` collapses the whole plot into a
    // single element, so a screen reader reads the summary instead of walking a
    // few hundred unlabelled rectangles and lines.
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={describeCandles(candles, timeframe, priceDecimals)}
    >
      <Svg width={width} height={height}>
        {/* Y gridlines + price labels */}
        {ticks.map((t, i) => {
          const y = priceToY(t, domain, plotHeight);
          return (
            <G key={`y${i}`}>
              <Line
                x1={0}
                y1={y}
                x2={plotWidth}
                y2={y}
                stroke={theme.color.border}
                strokeWidth={1}
              />
              <SvgText
                x={plotWidth + 4}
                y={y + AXIS_FONT / 3}
                fontSize={AXIS_FONT}
                fill={theme.color.muted}
              >
                {formatAxisPrice(t)}
              </SvgText>
            </G>
          );
        })}

        {/* Candles */}
        {layout.map((c, i) => {
          const color = c.up ? theme.color.up : theme.color.down;
          return (
            <G key={`c${i}`}>
              <Line
                x1={c.wickX}
                y1={c.wickTop}
                x2={c.wickX}
                y2={c.wickBottom}
                stroke={color}
                strokeWidth={1}
              />
              <Rect
                x={c.x}
                y={c.bodyY}
                width={c.bodyWidth}
                height={c.bodyHeight}
                fill={color}
              />
            </G>
          );
        })}

        {/* X time labels */}
        {labelIdx.map((idx) => {
          const c = layout[idx];
          if (!c) return null;
          return (
            <SvgText
              key={`x${idx}`}
              x={c.wickX}
              y={height - 6}
              fontSize={AXIS_FONT}
              fill={theme.color.muted}
              textAnchor="middle"
            >
              {formatAxisTime(candles[idx].t, timeframe)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
