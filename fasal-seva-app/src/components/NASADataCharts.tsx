import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../theme/theme';
import { NASAWeatherData } from '../utils/enhancedGameEngine';

interface Props {
  weatherData: NASAWeatherData[];
  currentDay: number; // 1-indexed day number
  fromCache?: boolean;
  dataResolution?: string;
}

export const NASADataCharts: React.FC<Props> = ({ weatherData, currentDay, fromCache, dataResolution }) => {
  const { theme, isDark } = useTheme();
  const windowWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(280, windowWidth - 48); // nice padding on sides

  const toNum = (v: number | undefined | null, fallback = 0) =>
    typeof v === 'number' && isFinite(v) ? v : fallback;
  const slice = weatherData.slice(0, Math.max(1, Math.min(currentDay, weatherData.length)));
  const labels = slice.map((_, i) => `D${i + 1}`);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surfaceVariant,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(${isDark ? '255,255,255' : '0,0,0'}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${isDark ? '255,255,255' : '0,0,0'}, ${opacity})`,
    style: { borderRadius: 16 },
    propsForBackgroundLines: { stroke: 'rgba(127,127,127,0.15)' },
    propsForDots: { r: '2.5' },
  } as const;

  const pages = useMemo(() => [
    {
      key: 'temp',
      title: 'Temperature (°C)',
      render: () => (
        <LineChart
          data={{
            labels,
            datasets: [
              { data: slice.map(d => toNum(d.t2m)), color: () => theme.colors.error, strokeWidth: 2 },
              { data: slice.map(d => toNum(d.t2m_max, toNum(d.t2m))), color: () => theme.colors.warning, strokeWidth: 1.5 },
              { data: slice.map(d => toNum(d.t2m_min, toNum(d.t2m))), color: () => theme.colors.info, strokeWidth: 1.5 },
            ],
            legend: ['Avg', 'Max', 'Min'],
          }}
          width={chartWidth}
          height={230}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      ),
    },
    {
      key: 'rain',
      title: 'Rainfall (mm/day)',
      render: () => (
        <BarChart
          data={{ labels, datasets: [{ data: slice.map(d => toNum(d.prectot)) }] }}
          width={chartWidth}
          height={230}
          chartConfig={chartConfig}
          fromZero
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix="mm"
        />
      ),
    },
    {
      key: 'humid',
      title: 'Humidity (%) and Dew Point (°C)',
      render: () => (
        <LineChart
          data={{
            labels,
            datasets: [
              { data: slice.map(d => toNum(d.rh2m)), color: () => theme.colors.primary, strokeWidth: 2 },
              { data: slice.map(d => toNum(d.t2mdew, toNum(d.t2m) - 5)), color: () => theme.colors.secondary, strokeWidth: 2 },
            ],
            legend: ['RH2M %', 'Dew Point °C'],
          }}
          width={chartWidth}
          height={230}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      ),
    },
    {
      key: 'solar',
      title: 'Solar Radiation (MJ/m²/day)',
      render: () => (
        <LineChart
          data={{
            labels,
            datasets: [
              { data: slice.map(d => toNum(d.allsky_sfc_sw_dwn, 0)), color: () => theme.colors.warning, strokeWidth: 2 },
            ],
            legend: ['ALLSKY_SFC_SW_DWN'],
          }}
          width={chartWidth}
          height={230}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      ),
    },
  ], [labels, slice, chartWidth, chartConfig, theme.colors]);

  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / chartWidth);
    if (i !== index) setIndex(i);
  };

  useEffect(() => {
    if (pages.length <= 1) return;
    const id = setInterval(() => {
      const next = (index + 1) % pages.length;
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ x: next * chartWidth, y: 0, animated: true });
      }
      setIndex(next);
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pages.length, chartWidth]);

  const hasSomeData = slice.length > 0 && (
    slice.some(d => toNum(d.t2m) !== 0) ||
    slice.some(d => toNum(d.rh2m) !== 0) ||
    slice.some(d => toNum(d.prectot) !== 0) ||
    slice.some(d => toNum(d.allsky_sfc_sw_dwn, 0) !== 0)
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>NASA Weather Data</Text>

      {!hasSomeData ? (
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>No chartable data for this period.</Text>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {pages.map((p) => (
              <View key={p.key} style={{ width: chartWidth, paddingRight: 8 }}>
                <Text style={[styles.chartTitle, { color: theme.colors.textSecondary }]}>{p.title}</Text>
                {p.render()}
              </View>
            ))}
          </ScrollView>

          <View style={styles.dotsRow}>
            {pages.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginHorizontal: 4,
                  backgroundColor: i === index ? theme.colors.primary : theme.colors.border,
                }}
              />
            ))}
          </View>
        </>
      )}

      <View style={styles.footerContainer}>
        <Text style={[styles.resolutionNote, { color: theme.colors.textSecondary }]}>
          {dataResolution || 'Data Resolution: ~50km regional average (NASA POWER)'}
        </Text>
        {fromCache && (
          <Text style={[styles.cacheNote, { color: theme.colors.warning }]}>
            📦 Cached Data (Offline Mode)
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  chartTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  chart: { borderRadius: 16 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  footerContainer: { marginTop: 8, alignItems: 'center' },
  resolutionNote: { fontSize: 12, textAlign: 'center' },
  cacheNote: { fontSize: 11, textAlign: 'center', marginTop: 4 },
});

export default NASADataCharts;
