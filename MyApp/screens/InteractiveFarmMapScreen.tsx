import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface MapOverlay {
  id: string;
  name: string;
  type: 'soil_moisture' | 'rainfall' | 'temperature' | 'pest_risk';
  color: string;
  icon: string;
  active: boolean;
  data: number[][];
}

interface FarmScenario {
  id: string;
  name: string;
  description: string;
  type: 'drought' | 'flood' | 'pest' | 'fertilizer_shortage';
  severity: 'low' | 'medium' | 'high';
  probability: number;
  impact: {
    yield: number;
    cost: number;
    sustainability: number;
  };
  solutions: {
    name: string;
    cost: number;
    effectiveness: number;
    sustainability: number;
  }[];
}

export default function InteractiveFarmMapScreen() {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const isDark = colorScheme === 'dark';

  const [activeOverlays, setActiveOverlays] = useState<string[]>(['soil_moisture']);
  const [selectedScenario, setSelectedScenario] = useState<FarmScenario | null>(null);
  const [farmData, setFarmData] = useState<any>(null);

  const mapOverlays: MapOverlay[] = [
    {
      id: 'soil_moisture',
      name: 'Soil Moisture',
      type: 'soil_moisture',
      color: '#3B82F6',
      icon: 'water',
      active: true,
      data: generateMockData(),
    },
    {
      id: 'rainfall',
      name: 'Rainfall Trends',
      type: 'rainfall',
      color: '#06B6D4',
      icon: 'rainy',
      active: false,
      data: generateMockData(),
    },
    {
      id: 'temperature',
      name: 'Temperature',
      type: 'temperature',
      color: '#F59E0B',
      icon: 'thermometer',
      active: false,
      data: generateMockData(),
    },
    {
      id: 'pest_risk',
      name: 'Pest Risk',
      type: 'pest_risk',
      color: '#EF4444',
      icon: 'bug',
      active: false,
      data: generateMockData(),
    },
  ];

  const scenarios: FarmScenario[] = [
    {
      id: 'drought_2025',
      name: 'Severe Drought Event',
      description: 'Extended dry period with 40% below normal rainfall expected over next 3 months.',
      type: 'drought',
      severity: 'high',
      probability: 75,
      impact: {
        yield: -30,
        cost: +40,
        sustainability: -20,
      },
      solutions: [
        {
          name: 'Install Drip Irrigation',
          cost: 2000,
          effectiveness: 85,
          sustainability: 90,
        },
        {
          name: 'Drought-Resistant Varieties',
          cost: 500,
          effectiveness: 70,
          sustainability: 95,
        },
        {
          name: 'Soil Moisture Sensors',
          cost: 800,
          effectiveness: 75,
          sustainability: 80,
        },
      ],
    },
    {
      id: 'flood_risk',
      name: 'Flooding Risk',
      description: 'Heavy rainfall patterns increasing flood probability by 60% this season.',
      type: 'flood',
      severity: 'medium',
      probability: 45,
      impact: {
        yield: -20,
        cost: +25,
        sustainability: -15,
      },
      solutions: [
        {
          name: 'Improved Drainage System',
          cost: 1500,
          effectiveness: 90,
          sustainability: 85,
        },
        {
          name: 'Raised Bed Cultivation',
          cost: 800,
          effectiveness: 75,
          sustainability: 80,
        },
        {
          name: 'Water-Resistant Crops',
          cost: 300,
          effectiveness: 60,
          sustainability: 90,
        },
      ],
    },
    {
      id: 'pest_outbreak',
      name: 'Pest Outbreak Alert',
      description: 'Regional pest activity 150% above normal levels. Immediate action required.',
      type: 'pest',
      severity: 'high',
      probability: 80,
      impact: {
        yield: -35,
        cost: +30,
        sustainability: -25,
      },
      solutions: [
        {
          name: 'Integrated Pest Management',
          cost: 600,
          effectiveness: 85,
          sustainability: 95,
        },
        {
          name: 'Biological Control Agents',
          cost: 400,
          effectiveness: 70,
          sustainability: 100,
        },
        {
          name: 'Organic Pesticides',
          cost: 300,
          effectiveness: 65,
          sustainability: 80,
        },
      ],
    },
  ];

  function generateMockData(): number[][] {
    const data: number[][] = [];
    for (let i = 0; i < 12; i++) {
      const row: number[] = [];
      for (let j = 0; j < 16; j++) {
        row.push(Math.random() * 100);
      }
      data.push(row);
    }
    return data;
  }

  const toggleOverlay = (overlayId: string) => {
    setActiveOverlays(prev => 
      prev.includes(overlayId) 
        ? prev.filter(id => id !== overlayId)
        : [...prev, overlayId]
    );
  };

  const selectScenario = (scenario: FarmScenario) => {
    setSelectedScenario(scenario);
  };

  const implementSolution = (scenario: FarmScenario, solution: any) => {
    Alert.alert(
      '🚀 Solution Implementation',
      `Implementing: ${solution.name}\n\nCost: $${solution.cost}\nEffectiveness: ${solution.effectiveness}%\nSustainability: ${solution.sustainability}%\n\nThis will improve your farm's resilience to ${scenario.name.toLowerCase()}.`,
      [
        {
          text: 'Implement Now',
          onPress: () => {
            Alert.alert(
              '✅ Solution Deployed!',
              `${solution.name} has been successfully implemented. Your farm is now better prepared for ${scenario.type} scenarios.`
            );
            setSelectedScenario(null);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.textSecondary;
    }
  };

  const renderFarmGrid = () => {
    const gridData = activeOverlays.length > 0 ? 
      mapOverlays.find(overlay => activeOverlays.includes(overlay.id))?.data || [] :
      [];

    return (
      <View style={styles.farmGrid}>
        {Array.from({ length: 12 }, (_, row) => (
          <View key={row} style={styles.gridRow}>
            {Array.from({ length: 16 }, (_, col) => {
              const value = gridData[row]?.[col] || 0;
              const intensity = value / 100;
              const overlayColor = activeOverlays.length > 0 ?
                mapOverlays.find(overlay => activeOverlays.includes(overlay.id))?.color || colors.primary :
                colors.primary;
              
              return (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.gridCell,
                    { 
                      backgroundColor: `${overlayColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
                      borderColor: colors.border,
                    }
                  ]}
                  onPress={() => {
                    Alert.alert(
                      `Grid Position (${row}, ${col})`,
                      `Value: ${value.toFixed(1)}%\nOverlay: ${activeOverlays[0] || 'None'}`
                    );
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: colors.text }]}>
            🗺️ Interactive Farm Map
          </Text>
          <Text style={[styles.headerSubtext, { color: colors.textSecondary }]}>
            Future Farmer Command Center
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Future Farmer Mission Brief */}
        <LinearGradient
          colors={isDark ? ['#1F2937', '#374151'] : ['#F3F4F6', '#E5E7EB']}
          style={styles.missionCard}
        >
          <View style={styles.missionHeader}>
            <Ionicons name="telescope" size={32} color={colors.primary} />
            <View style={styles.missionInfo}>
              <Text style={[styles.missionTitle, { color: colors.text }]}>
                🚀 Future Farmer Mission
              </Text>
              <Text style={[styles.missionDescription, { color: colors.textSecondary }]}>
                You're pioneering sustainable agriculture in 2025. Use NASA satellite data, 
                AI-powered insights, and advanced farming technology to balance yield, 
                cost-efficiency, and environmental sustainability.
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Map Overlays Control */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📊 Data Overlays
            </Text>
          </View>
          
          <View style={styles.overlayGrid}>
            {mapOverlays.map((overlay) => (
              <TouchableOpacity
                key={overlay.id}
                style={[
                  styles.overlayButton,
                  { 
                    backgroundColor: activeOverlays.includes(overlay.id) ? overlay.color : colors.surface,
                    borderColor: overlay.color,
                  }
                ]}
                onPress={() => toggleOverlay(overlay.id)}
              >
                <Ionicons 
                  name={overlay.icon as any} 
                  size={20} 
                  color={activeOverlays.includes(overlay.id) ? 'white' : overlay.color} 
                />
                <Text style={[
                  styles.overlayText,
                  { 
                    color: activeOverlays.includes(overlay.id) ? 'white' : overlay.color,
                    fontSize: 12,
                    fontWeight: '600',
                  }
                ]}>
                  {overlay.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Interactive Farm Map */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🗺️ Farm Visualization
            </Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.mapContainer}
          >
            {renderFarmGrid()}
          </ScrollView>
          
          <View style={styles.mapLegend}>
            <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>
              Legend: Tap cells for details
            </Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.primary + '40' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Low</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.primary + '80' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Medium</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>High</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Scenarios Dashboard */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🚨 Active Scenarios
            </Text>
          </View>
          
          {scenarios.map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              style={[
                styles.scenarioCard,
                { 
                  borderLeftColor: getSeverityColor(scenario.severity),
                  backgroundColor: 'rgba(255,255,255,0.05)',
                }
              ]}
              onPress={() => selectScenario(scenario)}
            >
              <View style={styles.scenarioHeader}>
                <View style={styles.scenarioInfo}>
                  <View style={styles.scenarioTitleRow}>
                    <Text style={[styles.scenarioTitle, { color: colors.text }]}>
                      {scenario.name}
                    </Text>
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(scenario.severity) }
                    ]}>
                      <Text style={styles.severityText}>
                        {scenario.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.scenarioDescription, { color: colors.textSecondary }]}>
                    {scenario.description}
                  </Text>
                  
                  <View style={styles.impactRow}>
                    <View style={styles.impactItem}>
                      <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>
                        Yield Impact
                      </Text>
                      <Text style={[
                        styles.impactValue,
                        { color: scenario.impact.yield < 0 ? '#EF4444' : colors.success }
                      ]}>
                        {scenario.impact.yield > 0 ? '+' : ''}{scenario.impact.yield}%
                      </Text>
                    </View>
                    
                    <View style={styles.impactItem}>
                      <Text style={[styles.impactLabel, { color: colors.textSecondary }]}>
                        Probability
                      </Text>
                      <Text style={[styles.impactValue, { color: colors.warning }]}>
                        {scenario.probability}%
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scenario Detail Modal */}
        {selectedScenario && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.solutionsHeader}>
              <Ionicons name="construct" size={24} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🛠️ Recommended Solutions
              </Text>
            </View>
            
            <Text style={[styles.solutionsSubtitle, { color: colors.textSecondary }]}>
              For: {selectedScenario.name}
            </Text>
            
            {selectedScenario.solutions.map((solution, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.solutionCard, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                onPress={() => implementSolution(selectedScenario, solution)}
              >
                <View style={styles.solutionHeader}>
                  <Text style={[styles.solutionTitle, { color: colors.text }]}>
                    {solution.name}
                  </Text>
                  <Text style={[styles.solutionCost, { color: colors.warning }]}>
                    ${solution.cost}
                  </Text>
                </View>
                
                <View style={styles.solutionMetrics}>
                  <View style={styles.solutionMetric}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      Effectiveness
                    </Text>
                    <Text style={[styles.metricValue, { color: colors.success }]}>
                      {solution.effectiveness}%
                    </Text>
                  </View>
                  
                  <View style={styles.solutionMetric}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      Sustainability
                    </Text>
                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                      {solution.sustainability}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => setSelectedScenario(null)}
            >
              <Text style={styles.closeButtonText}>Close Solutions</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  missionCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  missionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  overlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overlayButton: {
    flex: 1,
    minWidth: (width - 80) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  overlayText: {
    fontWeight: '600',
  },
  mapContainer: {
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  farmGrid: {
    padding: 8,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: 20,
    height: 20,
    borderWidth: 0.5,
    margin: 0.5,
  },
  mapLegend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  legendTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
  },
  scenarioCard: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  scenarioDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  impactRow: {
    flexDirection: 'row',
    gap: 24,
  },
  impactItem: {
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  solutionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  solutionsSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  solutionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  solutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  solutionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  solutionCost: {
    fontSize: 16,
    fontWeight: '700',
  },
  solutionMetrics: {
    flexDirection: 'row',
    gap: 24,
  },
  solutionMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});