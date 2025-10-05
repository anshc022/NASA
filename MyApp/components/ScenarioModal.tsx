import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useGame } from '@/contexts/GameContext';

// Helper function to get default action IDs based on scenario type
const getDefaultActionId = (scenarioType: string): string => {
  const defaultActions: { [key: string]: string } = {
    'drought': 'water_now',
    'flood': 'improve_drainage',
    'heat_stress': 'shade_cloth',
    'cold_stress': 'greenhouse_protection',
    'pest': 'organic_pesticide',
    'low_light': 'grow_lights',
    'wind_damage': 'wind_barriers'
  };
  return defaultActions[scenarioType] || 'water_now';
};

interface Scenario {
  id: number;
  crop_id: string;
  scenario_type: string;
  title: string;
  description: string;
  suggested_action: string;
  severity: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  available_actions?: Array<{
    id: string;
    name: string;
    description: string;
    cost_coins: number;
    success_rate: number;
    rewards: { xp: number; coins: number };
  }>;
  rewards?: {
    xp: number;
    coins: number;
  };
}

interface ScenarioModalProps {
  visible: boolean;
  onClose: () => void;
  cropId: string;
  cropName: string;
}

const ScenarioModal: React.FC<ScenarioModalProps> = ({
  visible,
  onClose,
  cropId,
  cropName,
}) => {
  const { getCropScenarios, completeScenario, isLoading } = useGame();
  const [completingScenarioId, setCompletingScenarioId] = useState<number | null>(null);
  
  const scenarios = getCropScenarios(cropId);
  
  const handleCompleteScenario = async (scenario: Scenario, actionTaken: string) => {
    try {
      setCompletingScenarioId(scenario.id);
      const response = await completeScenario(scenario.id, actionTaken);
      
      // Use actual rewards from the backend response
      const actualRewards = response?.rewards || { xp: 0, coins: 0 };
      
      console.log('🎯 Scenario completion response:', JSON.stringify(response, null, 2));
      
      if (response?.success) {
        Alert.alert(
          'Scenario Completed! 🎉',
          `You earned ${actualRewards.xp} XP and ${actualRewards.coins} coins!`,
          [{ text: 'Great!', onPress: () => {} }]
        );
      } else {
        Alert.alert(
          'Scenario Result',
          response?.message || 'Unknown result',
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete scenario. Please try again.');
    } finally {
      setCompletingScenarioId(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'drought': return '🌵';
      case 'flood': return '🌊';
      case 'pest_infestation': return '🐛';
      case 'heat_stress': return '🌡️';
      case 'cold_stress': return '❄️';
      case 'low_light': return '☁️';
      case 'wind_damage': return '💨';
      default: return '⚠️';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {getScenarioIcon('plant')} {cropName} Scenarios
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {scenarios.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🌟</Text>
              <Text style={styles.emptyStateTitle}>All Good!</Text>
              <Text style={styles.emptyStateDescription}>
                Your {cropName} is healthy and doesn't need any immediate attention.
              </Text>
            </View>
          ) : (
            scenarios.map((scenario) => (
              <View key={scenario.id} style={styles.scenarioCard}>
                <View style={styles.scenarioHeader}>
                  <View style={styles.scenarioTitleRow}>
                    <Text style={styles.scenarioIcon}>
                      {getScenarioIcon(scenario.scenario_type)}
                    </Text>
                    <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(scenario.severity) }]}>
                      <Text style={styles.severityText}>
                        {getSeverityIcon(scenario.severity)} {scenario.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.scenarioDescription}>
                  {scenario.description}
                </Text>

                <View style={styles.actionSection}>
                  <Text style={styles.actionTitle}>💡 Suggested Action:</Text>
                  <Text style={styles.actionText}>{scenario.suggested_action}</Text>
                </View>

                <View style={styles.rewardsSection}>
                  <Text style={styles.rewardsTitle}>🎁 Completion Rewards:</Text>
                  <View style={styles.rewardsRow}>
                    {(() => {
                      // Get rewards from the first available action (default action)
                      const firstAction = (scenario as any).available_actions?.[0];
                      const expectedRewards = firstAction?.rewards || { xp: 0, coins: 0 };
                      return (
                        <>
                          <Text style={styles.rewardItem}>⭐ {expectedRewards.xp} XP</Text>
                          <Text style={styles.rewardItem}>🪙 {expectedRewards.coins} Coins</Text>
                        </>
                      );
                    })()}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    completingScenarioId === scenario.id && styles.completingButton
                  ]}
                  onPress={() => {
                    // Use the first available action ID, or derive from scenario type
                    const actionId = (scenario as any).available_actions?.[0]?.id || 
                                   getDefaultActionId(scenario.scenario_type);
                    handleCompleteScenario(scenario, actionId);
                  }}
                  disabled={completingScenarioId === scenario.id || isLoading}
                >
                  {completingScenarioId === scenario.id ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.completeButtonText}>
                      ✅ Complete Action
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f3f4',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center' as const,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  scenarioCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scenarioHeader: {
    marginBottom: 15,
  },
  scenarioTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  scenarioIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: 'white',
  },
  scenarioDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  actionSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  rewardsSection: {
    marginBottom: 20,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  rewardsRow: {
    flexDirection: 'row' as const,
    gap: 20,
  },
  rewardItem: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600' as const,
  },
  completeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  completingButton: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
};

export default ScenarioModal;