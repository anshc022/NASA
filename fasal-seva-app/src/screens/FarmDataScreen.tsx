import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Toast } from '../components/CustomToast';
import { useTheme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { NASADataCharts } from '../components/NASADataCharts';
import DataTooltip from '../components/DataTooltip';
import { fetchFarmData, parseDailyData, getDateRange } from '../services/nasaDataService';
import { EnhancedGameEngine, ENHANCED_GAME_ACTIONS, type EnhancedGameState, type NASAWeatherData, type AIRecommendation } from '../utils/enhancedGameEngine';
import { EducationalSystem } from '../utils/educationalSystem';

interface FarmDataScreenProps {
  navigation: any;
  route?: any;
}

type ActionKey = 'irrigation' | 'fertilizer' | 'pest_control' | 'monitoring';

export default function FarmDataScreen({ navigation, route }: FarmDataScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [engine, setEngine] = useState<EnhancedGameState | null>(null);
  const [weatherData, setWeatherData] = useState<NASAWeatherData[]>([]);
  const [aiRec, setAiRec] = useState<AIRecommendation | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [dataResolution, setDataResolution] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionKey | null>(null);
  const [actionWasDataDriven, setActionWasDataDriven] = useState<boolean>(true); // Assume charts viewed
  const [followedAI, setFollowedAI] = useState<boolean>(false);

  useEffect(() => {
    loadFarmData();
  }, []);

  const loadFarmData = async () => {
    try {
      const params = route?.params?.farmRequest as {
        lat?: number; lon?: number; start?: string; end?: string; crop_type?: string;
      } | undefined;

      // Default to last 30 days Delhi if not provided
      const range = getDateRange(30);
      const request = {
        lat: params?.lat ?? 28.6,
        lon: params?.lon ?? 77.2,
        start: params?.start ?? range.start,
        end: params?.end ?? range.end,
        crop_type: params?.crop_type ?? 'wheat',
      };

  const resp = await fetchFarmData(request);
      const parsed = parseDailyData(resp.daily);
      setWeatherData(parsed);
      setLocationName(resp.location?.region || `${resp.location.lat.toFixed(2)}, ${resp.location.lon.toFixed(2)}`);
      setDataResolution(resp.data_resolution || '~50km regional average');

      const totalDays = Math.min(30, parsed.length);
      const initial = EnhancedGameEngine.initializeGame(
        totalDays,
        { lat: resp.location.lat, lon: resp.location.lon, region: resp.location?.region || 'Unknown' },
        (request.crop_type || 'wheat').toLowerCase(),
        'smallholder'
      );

      // Apply first day weather and get initial AI rec
      const day0 = parsed[0];
      const withWeather = EnhancedGameEngine.applyWeatherEffects(initial, day0);
      const rec = EnhancedGameEngine.generateAIRecommendation(withWeather, day0);
      withWeather.aiRecommendations = [rec];
      setEngine(withWeather);
      setAiRec(rec);

  Toast.show(resp.fromCache ? 'Loaded cached farm data (offline)' : 'Latest farm data retrieved successfully', 'success');
    } catch (error: any) {
      Toast.show(error?.message || 'Unable to fetch farm data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = (actionType: ActionKey, optionIndex: number) => {
    if (!engine) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const updated = EnhancedGameEngine.executeAction(
      engine,
      actionType,
      optionIndex,
      actionWasDataDriven,
      followedAI
    );

    setEngine({ ...updated });
    setActionModalVisible(false);
    setFollowedAI(false);

    const option = ENHANCED_GAME_ACTIONS.find(a => a.type === actionType)?.options[optionIndex];
    Toast.show(`${option?.label || 'Action'} applied`, 'success');
  };

  const showActionModal = (action: ActionKey) => {
    setSelectedAction(action);
    setActionModalVisible(true);
  };

  const currentDay = engine?.day ?? 1;
  const totalDays = engine?.totalDays ?? 30;
  const currentWeather = useMemo(() => {
    const idx = Math.max(0, currentDay - 1);
    return weatherData[idx];
  }, [weatherData, currentDay]);

  const parameterWarnings = useMemo(() => {
    if (!currentWeather) return [] as string[];
    const warns: string[] = [];
    const maybe = (
      param: string,
      value: number | undefined
    ) => {
      if (value == null) return;
      const w = EducationalSystem.getParameterWarning(param, value, engine?.crop || '');
      if (w) warns.push(w);
    };
    maybe('T2M', currentWeather.t2m);
    maybe('RH2M', currentWeather.rh2m);
    maybe('PRECTOT', currentWeather.prectot);
    maybe('WS2M', currentWeather.ws2m);
    return warns;
  }, [currentWeather, engine?.crop]);

  const nextDay = () => {
    if (!engine) return;
    const idx = Math.max(0, engine.day - 1);
    const todayWeather = weatherData[idx];
    if (todayWeather) {
      const withWeather = EnhancedGameEngine.applyWeatherEffects(engine, todayWeather);
      const rec = EnhancedGameEngine.generateAIRecommendation(withWeather, todayWeather);
      withWeather.aiRecommendations = [...withWeather.aiRecommendations, rec];
      setAiRec(rec);
      const advanced = EnhancedGameEngine.advanceDay(withWeather);
      setEngine({ ...advanced });

      if (advanced.day > advanced.totalDays || advanced.day > weatherData.length) {
        const final = EnhancedGameEngine.calculateFinalScore(advanced);
        navigation.navigate('Results', { finalResult: final });
      }
    } else {
      // No weather data, still advance
      const advanced = EnhancedGameEngine.advanceDay(engine);
      setEngine({ ...advanced });
    }
  };

  if (loading || !engine) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading farm data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <LinearGradient
        colors={isDark 
          ? ['#000000', '#1C1C1E', '#2C2C2E'] 
          : ['#F2F2F7', '#FFFFFF', '#F9F9F9']
        }
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 8, 16), paddingBottom: 100 }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Farm Dashboard 🚜
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Day {currentDay} of {totalDays}
            </Text>
          </View>

          {/* Game Progress */}
          <Card variant="glass" style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Ionicons name="trophy" size={24} color={theme.colors.warning} />
              <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
                Location: {locationName}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.colors.primary,
                    width: `${(currentDay / totalDays) * 100}%`
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              Progress: {Math.round((currentDay / totalDays) * 100)}% • {dataResolution}
            </Text>
          </Card>

          {/* Weather Info */}
          <Card variant="gradient" style={styles.weatherCard}>
            <View style={styles.weatherHeader}>
              <Ionicons name="partly-sunny" size={24} color={theme.colors.warning} />
              <Text style={[styles.weatherTitle, { color: theme.colors.text }]}>
                Today's Weather
              </Text>
            </View>
            <View style={styles.weatherGrid}>
              <View style={styles.weatherItem}>
                <Ionicons name="thermometer" size={20} color={theme.colors.error} />
                <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]}>
                  Temperature
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.weatherValue, { color: theme.colors.text }]}>
                    {currentWeather?.t2m?.toFixed(1) ?? '--'}°C
                  </Text>
                  {currentWeather?.t2m != null && (
                    <DataTooltip parameter="T2M" value={currentWeather.t2m} />
                  )}
                </View>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="water" size={20} color={theme.colors.info} />
                <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]}>
                  Humidity
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.weatherValue, { color: theme.colors.text }]}>
                    {currentWeather?.rh2m?.toFixed(0) ?? '--'}%
                  </Text>
                  {currentWeather?.rh2m != null && (
                    <DataTooltip parameter="RH2M" value={currentWeather.rh2m} />
                  )}
                </View>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="rainy" size={20} color={theme.colors.primary} />
                <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]}>
                  Rainfall
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.weatherValue, { color: theme.colors.text }]}>
                    {currentWeather?.prectot?.toFixed(1) ?? '--'} mm
                  </Text>
                  {currentWeather?.prectot != null && (
                    <DataTooltip parameter="PRECTOT" value={currentWeather.prectot} />
                  )}
                </View>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="sunny" size={20} color={theme.colors.warning} />
                <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]}>
                  Solar Rad
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.weatherValue, { color: theme.colors.text }]}>
                    {currentWeather?.allsky_sfc_sw_dwn?.toFixed(1) ?? '--'} MJ/m²
                  </Text>
                  {currentWeather?.allsky_sfc_sw_dwn != null && (
                    <DataTooltip parameter="ALLSKY_SFC_SW_DWN" value={currentWeather.allsky_sfc_sw_dwn!} />
                  )}
                </View>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="cloudy" size={20} color={theme.colors.secondary} />
                <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]}>Dew Point</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.weatherValue, { color: theme.colors.text }]}>
                    {currentWeather?.t2mdew?.toFixed(1) ?? (currentWeather?.t2m ? (currentWeather.t2m - 5).toFixed(1) : '--')}°C
                  </Text>
                  {currentWeather?.t2mdew != null && (
                    <DataTooltip parameter="T2MDEW" value={currentWeather.t2mdew!} />
                  )}
                </View>
              </View>
            </View>
          </Card>

          {/* Weather Alerts */}
          {parameterWarnings.length > 0 && (
            <Card variant="glass" style={{ marginBottom: 20 }}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Alerts ⚠️</Text>
              {parameterWarnings.map((w, i) => (
                <Text key={i} style={[styles.aiText, { color: theme.colors.textSecondary }]}>
                  • {w}
                </Text>
              ))}
            </Card>
          )}

          {/* NASA Charts */}
          {weatherData.length > 0 && (
            <Card variant="default" style={{ marginBottom: 20 }}>
              <NASADataCharts weatherData={weatherData} currentDay={currentDay} />
            </Card>
          )}

          {/* Resources Status */}
          <Card variant="default" style={styles.resourcesCard}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Farm Status 📊
            </Text>
            <View style={styles.resourcesGrid}>
              <View style={styles.resourceItem}>
                <Ionicons name="water" size={24} color={theme.colors.info} />
                <Text style={[styles.resourceLabel, { color: theme.colors.textSecondary }]}>
                  Soil Moisture
                </Text>
                <Text style={[styles.resourceValue, { color: theme.colors.text }]}>
                  {Math.round((engine.farmStats.soilMoisture || 0) * 100)}%
                </Text>
                <View style={[styles.resourceBar, { backgroundColor: theme.colors.border }]}>
                  <View 
                    style={[
                      styles.resourceBarFill, 
                      { 
                        backgroundColor: theme.colors.info,
                        width: `${(engine.farmStats.soilMoisture || 0) * 100}%`
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.resourceItem}>
                <Ionicons name="nutrition" size={24} color={theme.colors.success} />
                <Text style={[styles.resourceLabel, { color: theme.colors.textSecondary }]}>
                  Soil Nutrients
                </Text>
                <Text style={[styles.resourceValue, { color: theme.colors.text }]}>
                  {Math.round((engine.farmStats.nutrientLevel || 0) * 100)}%
                </Text>
                <View style={[styles.resourceBar, { backgroundColor: theme.colors.border }]}>
                  <View 
                    style={[
                      styles.resourceBarFill, 
                      { 
                        backgroundColor: theme.colors.success,
                        width: `${(engine.farmStats.nutrientLevel || 0) * 100}%`
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.resourceItem}>
                <Ionicons name="bug" size={24} color={theme.colors.error} />
                <Text style={[styles.resourceLabel, { color: theme.colors.textSecondary }]}>
                  Pest Level
                </Text>
                <Text style={[styles.resourceValue, { color: theme.colors.text }]}>
                  {Math.round((engine.farmStats.pestPressure || 0) * 100)}%
                </Text>
                <View style={[styles.resourceBar, { backgroundColor: theme.colors.border }]}>
                  <View 
                    style={[
                      styles.resourceBarFill, 
                      { 
                        backgroundColor: theme.colors.error,
                        width: `${(engine.farmStats.pestPressure || 0) * 100}%`
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.resourceItem}>
                <Ionicons name="leaf" size={24} color={theme.colors.primary} />
                <Text style={[styles.resourceLabel, { color: theme.colors.textSecondary }]}>
                  Crop Health
                </Text>
                <Text style={[styles.resourceValue, { color: theme.colors.text }]}>
                  {Math.round((engine.farmStats.cropHealth || 0) * 100)}%
                </Text>
                <View style={[styles.resourceBar, { backgroundColor: theme.colors.border }]}>
                  <View 
                    style={[
                      styles.resourceBarFill, 
                      { 
                        backgroundColor: theme.colors.primary,
                        width: `${(engine.farmStats.cropHealth || 0) * 100}%`
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </Card>

          {/* AI Recommendation */}
          <Card variant="glass" style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.secondary} />
              <Text style={[styles.aiTitle, { color: theme.colors.text }]}>
                AI Recommendation 🤖
              </Text>
            </View>
            {aiRec ? (
              <View>
                <Text style={[styles.aiText, { color: theme.colors.textSecondary, fontStyle: 'normal' }]}>
                  Priority: {aiRec.priority.toUpperCase()} • Action: {aiRec.action.replace('_', ' ')}
                </Text>
                <Text style={[styles.aiText, { color: theme.colors.textSecondary }]}>
                  {aiRec.reasoning}
                </Text>
                <Text style={[styles.aiText, { color: theme.colors.textSecondary }]}>
                  Tip: {aiRec.educationalNote}
                </Text>
                {aiRec.dataLimitation && (
                  <Text style={[styles.aiText, { color: theme.colors.textSecondary }]}>
                    Note: {aiRec.dataLimitation}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[styles.aiText, { color: theme.colors.textSecondary }]}>No recommendation</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' }}>
              <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]}>I followed the AI advice</Text>
              <Switch value={followedAI} onValueChange={setFollowedAI} />
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Irrigate 💧"
              onPress={() => showActionModal('irrigation')}
              variant="primary"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="water" size={20} color="#FFFFFF" />}
            />
            
            <Button
              title="Add Fertilizer 🌱"
              onPress={() => showActionModal('fertilizer')}
              variant="secondary"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="nutrition" size={20} color={theme.colors.primary} />}
            />
            
            <Button
              title="Pest Control 🐛"
              onPress={() => showActionModal('pest_control')}
              variant="glass"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="shield" size={20} color={theme.colors.text} />}
            />
            <Button
              title="Monitoring 📊"
              onPress={() => showActionModal('monitoring')}
              variant="glass"
              size="large"
              style={styles.actionButton}
              icon={<Ionicons name="analytics" size={20} color={theme.colors.text} />}
            />
          </View>

          {/* Next Day Button */}
          <Button
            title={`Next Day (${Math.min(currentDay + 1, totalDays)}/${totalDays}) ⏰`}
            onPress={nextDay}
            variant="outline"
            size="large"
            style={styles.nextDayButton}
            icon={<Ionicons name="time" size={20} color={theme.colors.primary} />}
          />
        </ScrollView>

        {/* Action Modal */}
        <Modal
          visible={actionModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setActionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Card variant="glass" style={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedAction === 'irrigation' && '💧 Irrigation'}
                {selectedAction === 'fertilizer' && '🌱 Fertilizer'}
                {selectedAction === 'pest_control' && '🐛 Pest Control'}
                {selectedAction === 'monitoring' && '📊 Monitoring'}
              </Text>
              <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>Select an option:</Text>

              {selectedAction && (
                <View style={{ marginBottom: 12 }}>
                  {ENHANCED_GAME_ACTIONS.find(a => a.type === selectedAction)?.options.map((opt, idx) => (
                    <Button
                      key={idx}
                      title={`${opt.label} — ${opt.description}`}
                      onPress={() => executeAction(selectedAction, idx)}
                      variant={idx === 1 ? 'primary' : 'glass'}
                      style={{ marginBottom: 8 }}
                    />
                  ))}
                </View>
              )}

              <Button
                title="Cancel"
                onPress={() => setActionModalVisible(false)}
                variant="outline"
                style={styles.modalCancelButton}
              />
            </Card>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressCard: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  weatherCard: {
    marginBottom: 20,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weatherItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  weatherValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resourcesCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  resourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resourceItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  resourceLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  resourceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resourceBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  resourceBarFill: {
    height: '100%',
  },
  aiCard: {
    marginBottom: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  aiText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginBottom: 20,
  },
  actionButton: {
    marginBottom: 12,
  },
  nextDayButton: {
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalCancelButton: {
    marginTop: 8,
  },
});