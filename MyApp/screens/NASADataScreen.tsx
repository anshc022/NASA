import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { farmAPI, nasaAPI } from '../services/api';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function NASADataScreen() {
  const [loading, setLoading] = useState(false);
  const [farmData, setFarmData] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState('temperature');

  const fetchNASAData = async () => {
    setLoading(true);
    try {
      // Get date ranges
      const ranges = await nasaAPI.getDateRanges();
      
      // Sample location (user can customize later)
      const lat = 28.6139; // New Delhi
      const lon = 77.2090;

      // Fetch farm data
      const data = await farmAPI.getFarmData({
        lat,
        lon,
        start: ranges.last_week.start,
        end: ranges.last_week.end,
        crop_type: 'wheat',
      });

      setFarmData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch NASA data');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!farmData || !farmData.daily) return null;

    const daily = farmData.daily.slice(-7); // Last 7 days

    let dataValues: number[] = [];
    let label = '';

    switch (selectedMetric) {
      case 'temperature':
        dataValues = daily.map((d: any) => d.t2m || 0);
        label = 'Temperature (°C)';
        break;
      case 'rainfall':
        dataValues = daily.map((d: any) => d.prectot || 0);
        label = 'Rainfall (mm)';
        break;
      case 'humidity':
        dataValues = daily.map((d: any) => d.rh2m || 0);
        label = 'Humidity (%)';
        break;
      case 'wind':
        dataValues = daily.map((d: any) => d.ws2m || 0);
        label = 'Wind Speed (m/s)';
        break;
    }

    return {
      labels: daily.map((d: any) => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: dataValues,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: [label],
    };
  };

  const renderMetricCard = (metric: string, icon: string, color: string) => {
    if (!farmData || !farmData.daily || farmData.daily.length === 0) return null;

    const latestData = farmData.daily[farmData.daily.length - 1];
    let value = '';
    let unit = '';

    switch (metric) {
      case 'temperature':
        value = latestData.t2m?.toFixed(1) || 'N/A';
        unit = '°C';
        break;
      case 'rainfall':
        value = latestData.prectot?.toFixed(2) || 'N/A';
        unit = 'mm';
        break;
      case 'humidity':
        value = latestData.rh2m?.toFixed(1) || 'N/A';
        unit = '%';
        break;
      case 'wind':
        value = latestData.ws2m?.toFixed(1) || 'N/A';
        unit = 'm/s';
        break;
    }

    return (
      <TouchableOpacity
        key={metric}
        style={[
          styles.metricCard,
          selectedMetric === metric && { borderColor: color, borderWidth: 2 },
        ]}
        onPress={() => setSelectedMetric(metric)}
      >
        <Ionicons name={icon as any} size={32} color={color} />
        <Text style={styles.metricValue}>
          {value} {unit}
        </Text>
        <Text style={styles.metricLabel}>{metric.charAt(0).toUpperCase() + metric.slice(1)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NASA Data 🛰️</Text>
        <Text style={styles.subtitle}>Real-time agricultural insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!farmData && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeEmoji}>🚀</Text>
            <Text style={styles.welcomeTitle}>Explore NASA Data</Text>
            <Text style={styles.welcomeText}>
              Get real-time weather and environmental data powered by NASA POWER API
            </Text>
            <TouchableOpacity
              style={styles.fetchButton}
              onPress={fetchNASAData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#fff" />
                  <Text style={styles.fetchButtonText}>Fetch Data</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {farmData && (
          <>
            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
              {renderMetricCard('temperature', 'thermometer', '#ef4444')}
              {renderMetricCard('rainfall', 'water', '#3b82f6')}
              {renderMetricCard('humidity', 'cloud', '#8b5cf6')}
              {renderMetricCard('wind', 'leaf', '#10b981')}
            </View>

            {/* Chart */}
            {getChartData() && (
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>
                  {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trends
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={getChartData()!}
                    width={width - 40}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: '4',
                        strokeWidth: '2',
                        stroke: '#3b82f6',
                      },
                    }}
                    bezier
                    style={styles.chart}
                  />
                </ScrollView>
              </View>
            )}

            {/* Recommendation */}
            {farmData.recommendation && (
              <View style={styles.recommendationSection}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name="bulb" size={24} color="#f59e0b" />
                  <Text style={styles.recommendationTitle}>AI Recommendation</Text>
                </View>
                <Text style={styles.recommendationText}>{farmData.recommendation.summary}</Text>
                {farmData.recommendation.irrigation_advice && (
                  <View style={styles.adviceCard}>
                    <Text style={styles.adviceLabel}>💧 Irrigation</Text>
                    <Text style={styles.adviceText}>{farmData.recommendation.irrigation_advice}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Educational Facts */}
            <View style={styles.factsSection}>
              <Text style={styles.sectionTitle}>Did You Know? 🌍</Text>
              <View style={styles.factCard}>
                <Text style={styles.factText}>
                  NASA's POWER project provides over 30 years of solar and meteorological data to
                  support agriculture, renewable energy, and climate research worldwide.
                </Text>
              </View>
              <View style={styles.factCard}>
                <Text style={styles.factText}>
                  Satellite data helps farmers optimize irrigation, reduce water waste, and
                  increase crop yields by up to 30%!
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchNASAData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#3b82f6" />
              ) : (
                <Text style={styles.refreshButtonText}>Refresh Data</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  scrollContent: {
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  fetchButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  metricCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  chartSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  recommendationSection: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginLeft: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 22,
    marginBottom: 15,
  },
  adviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  adviceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  adviceText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  factsSection: {
    marginBottom: 25,
  },
  factCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  factText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
  },
  refreshButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
