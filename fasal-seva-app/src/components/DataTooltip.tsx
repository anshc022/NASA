import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EducationalSystem } from '../utils/educationalSystem';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Button } from './Button';

interface Props {
  parameter: string;
  value: number;
}

export const DataTooltip: React.FC<Props> = ({ parameter, value }) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);

  const tooltip = EducationalSystem.getTooltip(parameter);
  if (!tooltip) return null;

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.icon}>
        <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <Card variant="glass" style={styles.tooltipCard}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {tooltip.fullName}
              </Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.value, { color: theme.colors.primary }]}>
              {EducationalSystem.formatNASAParameter(parameter, value)}
            </Text>

            <Text style={[styles.explanation, { color: theme.colors.textSecondary }]}>
              {showDetailed ? tooltip.detailedExplanation : tooltip.simpleExplanation}
            </Text>

            <Text style={[styles.relevance, { color: theme.colors.text }]}>
              🌾 {tooltip.farmingRelevance}
            </Text>

            <Text style={[styles.example, { color: theme.colors.textSecondary }]}>
              Example: {tooltip.realWorldExample}
            </Text>

            {tooltip.dataLimitation && (
              <Text style={[styles.limitation, { color: theme.colors.warning }]}>
                ⚠️ {tooltip.dataLimitation}
              </Text>
            )}

            <Button
              title={showDetailed ? 'Show Simple' : 'Learn More'}
              onPress={() => setShowDetailed(!showDetailed)}
              variant="outline"
              size="small"
            />
          </Card>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  icon: { marginLeft: 6 },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  tooltipCard: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  value: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  explanation: { fontSize: 14, marginBottom: 8 },
  relevance: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  example: { fontSize: 13, marginBottom: 8 },
  limitation: { fontSize: 12 },
});

export default DataTooltip;
