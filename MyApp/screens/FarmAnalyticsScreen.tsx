import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { analyticsAPI } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import SimpleCard from '../components/SimpleCard';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

interface CropType {
  name: string;
  count: number;
  avg_health: number;
  avg_growth: number;
  color: string;
}

interface WeeklyActivity {
  date: string;
  day: string;
  activity: number;
}

interface Scenario {
  type: string;
  severity: string;
  date: string;
  active: boolean;
}

interface NASAInsights {
  temperature?: number;
  humidity?: number;
  precipitation?: number;
  solar_radiation?: number;
  recommendation?: string;
}

interface FarmAnalytics {
  user_stats: {
    total_plants: number;
    total_waters: number;
    total_fertilizes: number;
    total_harvests: number;
  };
  user_progress: {
    level: number;
    xp: number;
    total_scenarios: number;
    successful_harvests: number;
  };
  crops: {
    active_count: number;
    types: CropType[];
    health_metrics: {
      avg_health: number;
      avg_water: number;
      avg_fertilizer: number;
    };
  };
  weekly_activity: WeeklyActivity[];
  scenarios: Scenario[];
  efficiency: {
    overall_score: number;
    health_score: number;
    water_efficiency: number;
    fertilizer_efficiency: number;
    harvest_rate: number;
  };
  nasa_insights: NASAInsights | null;
  last_updated: string;
}

export default function FarmAnalyticsScreen() {
  const [selectedTab, setSelectedTab] = useState('Overview');
  const [analyticsData, setAnalyticsData] = useState<FarmAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

  const tabs = ['Overview', 'Activity', 'Crops', 'Efficiency', 'NASA'];

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setError(null);
      const data = await analyticsAPI.getFarmAnalytics();
      setAnalyticsData(data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load analytics data');
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  // Chart configurations
  const chartConfig = {
    backgroundGradientFrom: 'rgba(255, 255, 255, 0.1)',
    backgroundGradientTo: 'rgba(255, 255, 255, 0.1)',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !analyticsData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff6b6b" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load Analytics</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || 'No data available'}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]} 
            onPress={loadAnalytics}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderOverviewTab = () => {
    const stats = analyticsData!.user_stats;
    const progress = analyticsData!.user_progress;
    const efficiency = analyticsData!.efficiency;
    const crops = analyticsData!.crops;

    return (
      <View>
        {/* Welcome Header */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🏡 Farm Overview
        </Text>
        
        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <SimpleCard
              title="Farm Level"
              value={progress.level}
              icon="trophy-outline"
              gradient={['#10B981', '#059669']}
            />
            <SimpleCard
              title="Total XP"
              value={progress.xp.toLocaleString()}
              icon="trending-up"
              gradient={['#3B82F6', '#2563EB']}
            />
          </View>
          
          <View style={styles.statRow}>
            <SimpleCard
              title="Active Crops"
              value={crops.active_count}
              icon="leaf"
              gradient={['#F59E0B', '#D97706']}
            />
            <SimpleCard
              title="Harvests"
              value={stats.total_harvests}
              icon="checkmark-circle"
              gradient={['#A855F7', '#9333EA']}
            />
          </View>
        </View>

        {/* Efficiency Score Card */}
        <View style={[styles.efficiencyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.efficiencyHeader}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={[styles.efficiencyTitle, { color: colors.text }]}>Farm Efficiency</Text>
          </View>
          
          <View style={styles.efficiencyScoreContainer}>
            <Text style={[styles.efficiencyScore, { color: colors.primary }]}>
              {efficiency.overall_score}%
            </Text>
            <Text style={[styles.efficiencyLabel, { color: colors.textSecondary }]}>
              Overall Score
            </Text>
          </View>
          
          <View style={styles.miniStatsGrid}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: colors.text }]}>{efficiency.health_score}%</Text>
              <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Health</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: colors.text }]}>{efficiency.water_efficiency}%</Text>
              <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Water</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: colors.text }]}>{efficiency.harvest_rate}%</Text>
              <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Harvest</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderActivityTab = () => {
    const stats = analyticsData!.user_stats;
    const weeklyData = analyticsData!.weekly_activity;

    const activityChartData = {
      labels: weeklyData.map(day => day.day.substring(0, 3)),
      datasets: [
        {
          data: weeklyData.map(day => day.activity),
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    const barData = {
      labels: ['Plants', 'Waters', 'Fertilizes', 'Harvests'],
      datasets: [
        {
          data: [
            stats.total_plants,
            stats.total_waters,
            stats.total_fertilizes,
            stats.total_harvests,
          ],
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📊 Weekly Activity</Text>
        
        <LineChart
          data={activityChartData}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
        
        <Text style={styles.chartTitle}>🎯 Total Farm Actions</Text>
        
        <BarChart
          data={barData}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
          yAxisLabel=""
          yAxisSuffix=""
        />
        
        <View style={styles.actionsList}>
          <View style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="add-circle" size={20} color="#fff" />
            </View>
            <Text style={styles.actionText}>Plants: {stats.total_plants}</Text>
            <Text style={styles.actionSubtext}>Total planted</Text>
          </View>
          
          <View style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="water" size={20} color="#fff" />
            </View>
            <Text style={styles.actionText}>Waters: {stats.total_waters}</Text>
            <Text style={styles.actionSubtext}>Total watering sessions</Text>
          </View>
          
          <View style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="nutrition" size={20} color="#fff" />
            </View>
            <Text style={styles.actionText}>Fertilizes: {stats.total_fertilizes}</Text>
            <Text style={styles.actionSubtext}>Total fertilizer uses</Text>
          </View>
          
          <View style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="basket" size={20} color="#fff" />
            </View>
            <Text style={styles.actionText}>Harvests: {stats.total_harvests}</Text>
            <Text style={styles.actionSubtext}>Successful harvests</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCropsTab = () => {
    const crops = analyticsData!.crops;
    
    if (crops.types.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>🌾 Crop Distribution</Text>
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No crops planted yet</Text>
            <Text style={styles.emptySubtext}>Start planting to see crop analytics!</Text>
          </View>
        </View>
      );
    }

    const pieData = crops.types.map(crop => ({
      name: crop.name,
      population: crop.count,
      color: crop.color,
      legendFontColor: '#FFFFFF',
      legendFontSize: 14,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>🌾 Crop Distribution</Text>
        
        <PieChart
          data={pieData}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
        
        <View style={styles.cropsLegend}>
          {crops.types.map((crop, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: crop.color }]} />
              <View style={styles.legendContent}>
                <Text style={styles.legendText}>{crop.name}</Text>
                <Text style={styles.legendCount}>{crop.count} plants</Text>
                <Text style={styles.legendHealth}>Health: {crop.avg_health}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.healthMetrics}>
          <Text style={styles.metricsTitle}>📊 Health Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{crops.health_metrics.avg_health}%</Text>
              <Text style={styles.metricLabel}>Avg Health</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{crops.health_metrics.avg_water}%</Text>
              <Text style={styles.metricLabel}>Avg Water</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{crops.health_metrics.avg_fertilizer}%</Text>
              <Text style={styles.metricLabel}>Avg Fertilizer</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEfficiencyTab = () => {
    const efficiency = analyticsData!.efficiency;
    const scenarios = analyticsData!.scenarios;
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>🎯 Farm Efficiency Analysis</Text>
        
        <View style={styles.efficiencyCircle}>
          <Text style={styles.efficiencyScore}>{efficiency.overall_score}%</Text>
          <Text style={styles.efficiencyLabel}>Overall Score</Text>
        </View>
        
        <View style={styles.efficiencyBreakdown}>
          <View style={styles.efficiencyItem}>
            <Text style={styles.efficiencyMetric}>Water Efficiency</Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: `${efficiency.water_efficiency}%`, 
                  backgroundColor: '#2196F3' 
                }
              ]} />
            </View>
            <Text style={styles.efficiencyValue}>{efficiency.water_efficiency}%</Text>
          </View>
          
          <View style={styles.efficiencyItem}>
            <Text style={styles.efficiencyMetric}>Fertilizer Efficiency</Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: `${efficiency.fertilizer_efficiency}%`, 
                  backgroundColor: '#FF9800' 
                }
              ]} />
            </View>
            <Text style={styles.efficiencyValue}>{efficiency.fertilizer_efficiency}%</Text>
          </View>
          
          <View style={styles.efficiencyItem}>
            <Text style={styles.efficiencyMetric}>Harvest Success Rate</Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: `${efficiency.harvest_rate}%`, 
                  backgroundColor: '#4CAF50' 
                }
              ]} />
            </View>
            <Text style={styles.efficiencyValue}>{efficiency.harvest_rate}%</Text>
          </View>
          
          <View style={styles.efficiencyItem}>
            <Text style={styles.efficiencyMetric}>Crop Health Score</Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: `${efficiency.health_score}%`, 
                  backgroundColor: '#8BC34A' 
                }
              ]} />
            </View>
            <Text style={styles.efficiencyValue}>{efficiency.health_score}%</Text>
          </View>
        </View>

        {scenarios.length > 0 && (
          <View style={styles.scenariosContainer}>
            <Text style={styles.scenariosTitle}>⚠️ Recent Scenarios</Text>
            {scenarios.slice(0, 3).map((scenario, index) => (
              <View key={index} style={styles.scenarioItem}>
                <Ionicons 
                  name={scenario.active ? "warning" : "checkmark-circle"} 
                  size={20} 
                  color={scenario.active ? "#FF9800" : "#4CAF50"} 
                />
                <Text style={styles.scenarioText}>
                  {scenario.type} ({scenario.severity})
                </Text>
                <Text style={styles.scenarioStatus}>
                  {scenario.active ? "Active" : "Resolved"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Improvement Tips:</Text>
          <Text style={styles.tipText}>• Monitor NASA weather data for optimal timing</Text>
          <Text style={styles.tipText}>• Address plant scenarios quickly for better health</Text>
          <Text style={styles.tipText}>• Regular care maintains higher efficiency scores</Text>
          <Text style={styles.tipText}>• Use premium supplies for better results</Text>
        </View>
      </View>
    );
  };

  const renderNASATab = () => {
    const insights = analyticsData!.nasa_insights;
    
    if (!insights) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>🛰️ NASA Insights</Text>
          <View style={styles.emptyState}>
            <Ionicons name="planet-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>NASA data unavailable</Text>
            <Text style={styles.emptySubtext}>Add a farm location to get weather insights</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>🛰️ NASA Environmental Data</Text>
        
        <View style={styles.nasaGrid}>
          {insights.temperature && (
            <View style={styles.nasaCard}>
              <Ionicons name="thermometer-outline" size={24} color="#FF5722" />
              <Text style={styles.nasaValue}>{insights.temperature.toFixed(1)}°C</Text>
              <Text style={styles.nasaLabel}>Temperature</Text>
            </View>
          )}
          
          {insights.humidity && (
            <View style={styles.nasaCard}>
              <Ionicons name="water-outline" size={24} color="#2196F3" />
              <Text style={styles.nasaValue}>{insights.humidity.toFixed(1)}%</Text>
              <Text style={styles.nasaLabel}>Humidity</Text>
            </View>
          )}
          
          {insights.precipitation && (
            <View style={styles.nasaCard}>
              <Ionicons name="rainy-outline" size={24} color="#607D8B" />
              <Text style={styles.nasaValue}>{insights.precipitation.toFixed(2)}mm</Text>
              <Text style={styles.nasaLabel}>Precipitation</Text>
            </View>
          )}
          
          {insights.solar_radiation && (
            <View style={styles.nasaCard}>
              <Ionicons name="sunny-outline" size={24} color="#FFC107" />
              <Text style={styles.nasaValue}>{insights.solar_radiation.toFixed(1)}</Text>
              <Text style={styles.nasaLabel}>Solar Radiation</Text>
            </View>
          )}
        </View>

        {insights.recommendation && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>🤖 AI Recommendation</Text>
            <Text style={styles.recommendationText}>{insights.recommendation}</Text>
          </View>
        )}

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>📡 About NASA Data:</Text>
          <Text style={styles.tipText}>• Real-time environmental monitoring</Text>
          <Text style={styles.tipText}>• Satellite-based weather observations</Text>
          <Text style={styles.tipText}>• Helps optimize farming decisions</Text>
          <Text style={styles.tipText}>• Updated daily for accuracy</Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'Overview': return renderOverviewTab();
      case 'Activity': return renderActivityTab();
      case 'Crops': return renderCropsTab();
      case 'Efficiency': return renderEfficiencyTab();
      case 'NASA': return renderNASATab();
      default: return renderOverviewTab();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Ionicons name="analytics" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Farm Analytics</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Updated: {analyticsData?.last_updated ? 
            new Date(analyticsData.last_updated).toLocaleDateString() : 'Never'}
        </Text>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              { 
                backgroundColor: selectedTab === tab ? colors.primary : colors.card, 
                borderColor: colors.border 
              },
              selectedTab === tab && styles.tabActive
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              { color: selectedTab === tab ? '#ffffff' : colors.text },
              selectedTab === tab && styles.tabTextActive
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={[styles.content, { backgroundColor: colors.background }]} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Content based on selected tab */}
        {selectedTab === 'Overview' && renderOverviewTab()}
        {selectedTab === 'Activity' && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Activity Charts</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Coming soon...</Text>
          </View>
        )}
        {selectedTab === 'Crops' && (
          <View style={styles.emptyState}>
            <Ionicons name="leaf" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Crop Analytics</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Coming soon...</Text>
          </View>
        )}
        {selectedTab === 'Efficiency' && (
          <View style={styles.emptyState}>
            <Ionicons name="speedometer" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Efficiency Reports</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Coming soon...</Text>
          </View>
        )}
        {selectedTab === 'NASA' && (
          <View style={styles.emptyState}>
            <Ionicons name="rocket" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>NASA Insights</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Coming soon...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base styles
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },

  // Header styles
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  // Tab styles
  tabsContainer: {
    maxHeight: 50,
    marginVertical: 16,
  },
  tabsContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    minWidth: 80,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  tabTextActive: {
    fontWeight: 'bold',
  },

  // Content styles
  content: {
    flex: 1,
  },
  chartContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  chart: {
    borderRadius: 16,
    marginBottom: 20,
  },

  // Overview tab styles
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#e8f5e8',
    marginTop: 4,
  },
  efficiencyCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
  },
  efficiencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  efficiencyDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  efficiencyScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  efficiencyBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  efficiencyFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  efficiencyBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  miniEfficiency: {
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 12,
    color: '#e8f5e8',
  },
  miniValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },

  // Activity tab styles
  actionsList: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionSubtext: {
    fontSize: 12,
    color: '#e8f5e8',
  },

  // Crops tab styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#ccc',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  cropsLegend: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendContent: {
    flex: 1,
  },
  legendText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  legendCount: {
    fontSize: 12,
    color: '#e8f5e8',
  },
  legendHealth: {
    fontSize: 12,
    color: '#4CAF50',
  },
  healthMetrics: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 12,
    color: '#e8f5e8',
    marginTop: 4,
  },

  // Efficiency tab styles
  efficiencyCircle: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 6,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  efficiencyLabel: {
    fontSize: 14,
    color: '#e8f5e8',
    marginTop: 4,
  },
  efficiencyItem: {
    marginBottom: 16,
  },
  efficiencyMetric: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  efficiencyValue: {
    fontSize: 14,
    color: '#e8f5e8',
    textAlign: 'right',
  },
  scenariosContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  scenariosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  scenarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  scenarioStatus: {
    fontSize: 12,
    color: '#e8f5e8',
  },

  // NASA tab styles
  nasaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nasaCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  nasaValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  nasaLabel: {
    fontSize: 12,
    color: '#e8f5e8',
    marginTop: 4,
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#e8f5e8',
    lineHeight: 20,
  },

  // Content styles
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Section styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
  },

  // Stats Grid for Overview Tab
  statsGrid: {
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },

  // Efficiency Card
  efficiencyCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  efficiencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  efficiencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  efficiencyScoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  efficiencyScore: {
    fontSize: 48,
    fontWeight: '700',
  },
  efficiencyLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  miniStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  miniStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Common styles for charts
  chartContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    marginBottom: 16,
  },

  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Legend styles for crops tab
  legendContent: {
    flex: 1,
    marginLeft: 12,
  },
  legendHealth: {
    fontSize: 12,
    marginTop: 2,
  },

  // Health metrics styles
  healthMetrics: {
    marginTop: 20,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Common styles
  tipsContainer: {
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    marginBottom: 8,
  },
});