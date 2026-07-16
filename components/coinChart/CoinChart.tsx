import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { FetchStatus, Timeframe } from '../../types';
import CandlestickChart from '../candlestickChart/CandlestickChart';
import TimeframeSelector from '../candlestickChart/TimeframeSelector';
import { useCandles } from '../../hooks/useCandles';
import {
  applyLivePrice,
  periodChangePct,
  formatSignedPct,
} from '../../lib/candleChart';
import { theme, changeColors } from '../../theme';

const CHART_HEIGHT = 200;

interface CoinChartProps {
  coinId: string;
  livePrice: number;
  priceDecimals: number;
}

export default function CoinChart({
  coinId,
  livePrice,
  priceDecimals,
}: CoinChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.Month);
  const { candles, status } = useCandles(coinId, timeframe);

  const liveCandles = useMemo(
    () => applyLivePrice(candles ?? [], livePrice),
    [candles, livePrice],
  );
  const change = useMemo(
    () => periodChangePct(liveCandles), // change over the selected period
    [liveCandles],
  );

  const { width } = useWindowDimensions();
  const chartWidth = width - theme.space.xl * 2; // screen has xl padding each side

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {change != null && (
          <View
            style={[
              styles.changePill,
              { backgroundColor: changeColors(change >= 0).tint },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                { color: changeColors(change >= 0).fg },
              ]}
            >
              {formatSignedPct(change)}
            </Text>
          </View>
        )}
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </View>

      <View style={styles.chartBox}>
        {status === FetchStatus.Loading && (
          <ActivityIndicator color={theme.color.accent} />
        )}
        {status === FetchStatus.Failed && (
          <Text style={styles.error}>Couldn’t load chart</Text>
        )}
        {status === FetchStatus.Succeeded && liveCandles.length > 0 && (
          <CandlestickChart
            candles={liveCandles}
            width={chartWidth}
            height={CHART_HEIGHT}
            timeframe={timeframe}
            priceDecimals={priceDecimals}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', gap: theme.space.md, marginTop: theme.space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  changePill: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  changeText: { fontSize: theme.font.caption, fontWeight: '600' },
  chartBox: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: theme.color.muted, fontSize: theme.font.small },
});
