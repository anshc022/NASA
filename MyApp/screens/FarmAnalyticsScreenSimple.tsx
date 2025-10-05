import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyticsAPI } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import SimpleCard from '../components/SimpleCard';

interface AnalyticsData {
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
  efficiency: {
    overall_score: number;
    health_score: number;
    water_efficiency: number;
    harvest_rate: number;
  };
  crops: {
    active_count: number;
    types: any[];
    health_metrics: {
      avg_health: number;
      avg_water: number;
      avg_fertilizer: number;
    };
  };
  last_updated: string;
}

export default function FarmAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

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
      // Set mock data for demonstration
      setAnalyticsData({
        user_stats: { total_plants: 5, total_waters: 15, total_fertilizes: 8, total_harvests: 3 },
        user_progress: { level: 2, xp: 150, total_scenarios: 4, successful_harvests: 3 },
        efficiency: { overall_score: 78, health_score: 85, water_efficiency: 72, harvest_rate: 80 },
        crops: { active_count: 3, types: [], health_metrics: { avg_health: 85, avg_water: 72, avg_fertilizer: 65 } },
        last_updated: new Date().toISOString()
      });
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

  const stats = analyticsData?.user_stats || {
    total_plants: 0,
    total_waters: 0,
    total_fertilizes: 0,
    total_harvests: 0
  };
  const progress = analyticsData?.user_progress || {
    level: 1,
    xp: 0,
    total_scenarios: 0,
    successful_harvests: 0
  };
  const efficiency = analyticsData?.efficiency || {
    overall_score: 0,
    health_score: 0,
    water_efficiency: 0,
    harvest_rate: 0
  };
  const crops = analyticsData?.crops || {
    active_count: 0,
    types: [],
    health_metrics: { avg_health: 0, avg_water: 0, avg_fertilizer: 0 }
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
        {/* Farm Overview */}
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

        {/* Action Summary */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📊 Farm Actions
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <SimpleCard
              title="Plants"
              value={stats.total_plants}
              icon="add-circle-outline"
            />
            <SimpleCard
              title="Waters"
              value={stats.total_waters}
              icon="water-outline"
            />
          </View>
          
          <View style={styles.statRow}>
            <SimpleCard
              title="Fertilizes"
              value={stats.total_fertilizes}
              icon="nutrition-outline"
            />
            <SimpleCard
              title="Scenarios"
              value={progress.total_scenarios}
              icon="bulb-outline"
            />
          </View>
        </View>

        {error && (
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: '#ff6b6b' }]}>
            <Ionicons name="information-circle" size={24} color="#ff6b6b" />
            <Text style={[styles.errorText, { color: colors.text }]}>
              Note: Using sample data. {error}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  efficiencyCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  errorCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});