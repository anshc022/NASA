import React from 'react';
import { View, Text, Dimensions, StyleSheet, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../theme/theme';
import { NASAWeatherData } from '../utils/enhancedGameEngine';

interface Props {
  weatherData: NASAWeatherData[];
  currentDay: number; // 1-indexed day number
}

export const NASADataCharts: React.FC<Props> = ({ weatherData, currentDay }) => {
  const { theme, isDark } = useTheme();
  const width = Dimensions.get('window').width - 40; // padding accounted by parent

  const slice = weatherData.slice(0, Math.max(1, currentDay));
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
  } as const;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>NASA Weather Data</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Temperature */}
          <Text style={[styles.chartTitle, { color: theme.colors.textSecondary }]}>Temperature (°C)</Text>
          <LineChart
            data={{
              labels,
              datasets: [
                { data: slice.map(d => d.t2m), color: () => theme.colors.error, strokeWidth: 2 },
                { data: slice.map(d => d.t2m_max), color: () => theme.colors.warning, strokeWidth: 1.5 },
                { data: slice.map(d => d.t2m_min), color: () => theme.colors.info, strokeWidth: 1.5 },
              ],
              legend: ['Avg', 'Max', 'Min'],
            }}
            width={width}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />

          {/* Rainfall */}
          <Text style={[styles.chartTitle, { color: theme.colors.textSecondary }]}>Rainfall (mm/day)</Text>
          <BarChart
            data={{ labels, datasets: [{ data: slice.map(d => d.prectot) }] }}
            width={width}
            height={220}
            chartConfig={chartConfig}
            fromZero
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix="mm"
          />

          {/* Humidity vs Dew Point */}
          <Text style={[styles.chartTitle, { color: theme.colors.textSecondary }]}>Humidity (%) and Dew Point (°C)</Text>
          <LineChart
            data={{
              labels,
              datasets: [
                { data: slice.map(d => d.rh2m), color: () => theme.colors.primary, strokeWidth: 2 },
                { data: slice.map(d => (d.t2mdew ?? d.t2m - 5)), color: () => theme.colors.secondary, strokeWidth: 2 },
              ],
              legend: ['RH2M %', 'Dew Point °C'],
            }}
            width={width}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />

          {/* Solar Radiation */}
          <Text style={[styles.chartTitle, { color: theme.colors.textSecondary }]}>Solar Radiation (MJ/m²/day)</Text>
          <LineChart
            data={{
              labels,
              datasets: [
                { data: slice.map(d => d.allsky_sfc_sw_dwn ?? 0), color: () => theme.colors.warning, strokeWidth: 2 },
              ],
              legend: ['ALLSKY_SFC_SW_DWN'],
            }}
            width={width}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      </ScrollView>

      <Text style={[styles.resolutionNote, { color: theme.colors.textSecondary }]}>
        Data Resolution: ~50km regional average (NASA POWER)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  chartTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  chart: { borderRadius: 16 },
  resolutionNote: { fontSize: 12, marginTop: 8, textAlign: 'center' },
});

export default NASADataCharts;
