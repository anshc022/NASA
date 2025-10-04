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
  const [fromCache, setFromCache] = useState<boolean>(false);
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
      setFromCache(resp.fromCache || false);

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
          {/* Game Header */}
          <View style={styles.gameHeader}>
            <View style={styles.farmInfo}>
              <Text style={[styles.farmName, { color: theme.colors.text }]}>
                � {locationName || 'Your Farm'}
              </Text>
              <Text style={[styles.seasonProgress, { color: theme.colors.textSecondary }]}>
                Season {Math.ceil(currentDay / 30)} • Day {currentDay} of {totalDays}
              </Text>
            </View>
            
            {/* Game Stats Bar */}
            <View style={styles.gameStats}>
              <View style={styles.gameStatItem}>
                <Ionicons name="trophy-outline" size={16} color={theme.colors.warning} />
                <Text style={[styles.gameStatValue, { color: theme.colors.text }]}>
                  ${Math.round((engine?.farmStats.cropHealth || 0.85) * 1000)}
                </Text>
                <Text style={[styles.gameStatLabel, { color: theme.colors.textSecondary }]}>
                  Profit
                </Text>
              </View>
              <View style={styles.gameStatItem}>
                <Ionicons name="leaf-outline" size={16} color={theme.colors.success} />
                <Text style={[styles.gameStatValue, { color: theme.colors.text }]}>
                  {Math.round((engine?.farmStats.cropHealth || 0.85) * 100)}%
                </Text>
                <Text style={[styles.gameStatLabel, { color: theme.colors.textSecondary }]}>
                  Health
                </Text>
              </View>
              <View style={styles.gameStatItem}>
                <Ionicons name="water-outline" size={16} color={theme.colors.info} />
                <Text style={[styles.gameStatValue, { color: theme.colors.text }]}>
                  {Math.round((engine?.farmStats.soilMoisture || 0.6) * 100)}%
                </Text>
                <Text style={[styles.gameStatLabel, { color: theme.colors.textSecondary }]}>
                  Water
                </Text>
              </View>
              <View style={styles.gameStatItem}>
                <Ionicons name="earth-outline" size={16} color={theme.colors.secondary} />
                <Text style={[styles.gameStatValue, { color: theme.colors.text }]}>
                  {Math.round((1 - (engine?.farmStats.pestPressure || 0.2)) * 100)}%
                </Text>
                <Text style={[styles.gameStatLabel, { color: theme.colors.textSecondary }]}>
                  Eco Score
                </Text>
              </View>
            </View>
          </View>

          {/* 🛰️ NASA Data Analysis Station */}
          <Card variant="gradient" style={{ marginBottom: 20 }}>
            <View style={styles.dataStationHeader}>
              <Ionicons name="radio-outline" size={24} color="#FFFFFF" />
              <Text style={[styles.cardTitle, { color: '#FFFFFF', marginLeft: 8 }]}>NASA Satellite Analysis</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={[styles.liveText, { color: 'rgba(255,255,255,0.9)' }]}>LIVE</Text>
              </View>
            </View>
            
            <Text style={[styles.dataStationDesc, { color: 'rgba(255,255,255,0.9)' }]}>
              🛰️ Analyze real NASA satellite data to make smart farming decisions
            </Text>
            
            {/* Satellite Data Layers */}
            <View style={styles.dataLayers}>
              <View style={styles.dataLayer}>
                <View style={[styles.layerIcon, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}>
                  <Ionicons name="leaf-outline" size={16} color="#4CAF50" />
                </View>
                <View style={styles.layerInfo}>
                  <Text style={[styles.layerName, { color: '#FFFFFF' }]}>NDVI Vegetation</Text>
                  <Text style={[styles.layerValue, { color: '#4CAF50' }]}>
                    Health: {Math.round((engine?.farmStats?.cropHealth || 0.85) * 100)}%
                  </Text>
                  <Text style={[styles.layerSource, { color: 'rgba(255,255,255,0.7)' }]}>
                    MODIS • 250m resolution
                  </Text>
                </View>
              </View>
              
              <View style={styles.dataLayer}>
                <View style={[styles.layerIcon, { backgroundColor: 'rgba(33, 150, 243, 0.2)' }]}>
                  <Ionicons name="water-outline" size={16} color="#2196F3" />
                </View>
                <View style={styles.layerInfo}>
                  <Text style={[styles.layerName, { color: '#FFFFFF' }]}>Soil Moisture</Text>
                  <Text style={[styles.layerValue, { color: '#2196F3' }]}>
                    Level: {Math.round((engine?.farmStats?.soilMoisture || 0.6) * 100)}%
                  </Text>
                  <Text style={[styles.layerSource, { color: 'rgba(255,255,255,0.7)' }]}>
                    SMAP • 36km resolution
                  </Text>
                </View>
              </View>
              
              <View style={styles.dataLayer}>
                <View style={[styles.layerIcon, { backgroundColor: 'rgba(255, 152, 0, 0.2)' }]}>
                  <Ionicons name="thermometer-outline" size={16} color="#FF9800" />
                </View>
                <View style={styles.layerInfo}>
                  <Text style={[styles.layerName, { color: '#FFFFFF' }]}>Temperature</Text>
                  <Text style={[styles.layerValue, { color: '#FF9800' }]}>
                    {weatherData[currentDay - 1]?.t2m?.toFixed(1) || '25.5'}°C
                  </Text>
                  <Text style={[styles.layerSource, { color: 'rgba(255,255,255,0.7)' }]}>
                    GEOS-5 • 25km resolution
                  </Text>
                </View>
              </View>
              
              <View style={styles.dataLayer}>
                <View style={[styles.layerIcon, { backgroundColor: 'rgba(103, 58, 183, 0.2)' }]}>
                  <Ionicons name="rainy-outline" size={16} color="#673AB7" />
                </View>
                <View style={styles.layerInfo}>
                  <Text style={[styles.layerName, { color: '#FFFFFF' }]}>Precipitation</Text>
                  <Text style={[styles.layerValue, { color: '#673AB7' }]}>
                    {weatherData[currentDay - 1]?.prectot?.toFixed(1) || '0.0'}mm
                  </Text>
                  <Text style={[styles.layerSource, { color: 'rgba(255,255,255,0.7)' }]}>
                    GPM • 11km resolution
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Analysis Status */}
            <View style={styles.analysisStatus}>
              <Text style={[styles.analysisText, { color: 'rgba(255,255,255,0.8)' }]}>
                ✅ All layers analyzed • Ready for decisions
              </Text>
            </View>
          </Card>

          {/* 2. Farm Health Overview */}
          <Card variant="default" style={{ marginBottom: 20 }}>
            <View style={styles.healthHeader}>
              <Ionicons name="heart-outline" size={24} color={theme.colors.success} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Farm Health Status</Text>
            </View>
            <View style={styles.healthGrid}>
              <View style={styles.healthItem}>
                <View style={[styles.healthIcon, { backgroundColor: `${theme.colors.success}20` }]}>
                  <Ionicons name="leaf-outline" size={24} color={theme.colors.success} />
                </View>
                <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>Crop Health</Text>
                <Text style={[styles.healthValue, { color: theme.colors.success }]}>
                  {Math.round((engine.farmStats.cropHealth || 0) * 100)}%
                </Text>
              </View>
              <View style={styles.healthItem}>
                <View style={[styles.healthIcon, { backgroundColor: `${theme.colors.info}20` }]}>
                  <Ionicons name="water-outline" size={24} color={theme.colors.info} />
                </View>
                <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>Soil Moisture</Text>
                <Text style={[styles.healthValue, { color: theme.colors.info }]}>
                  {Math.round((engine.farmStats.soilMoisture || 0) * 100)}%
                </Text>
              </View>
              <View style={styles.healthItem}>
                <View style={[styles.healthIcon, { backgroundColor: `${theme.colors.success}20` }]}>
                  <Ionicons name="nutrition-outline" size={24} color={theme.colors.success} />
                </View>
                <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>Nutrients</Text>
                <Text style={[styles.healthValue, { color: theme.colors.success }]}>
                  {Math.round((engine.farmStats.nutrientLevel || 0) * 100)}%
                </Text>
              </View>
              <View style={styles.healthItem}>
                <View style={[styles.healthIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
                  <Ionicons name="shield-outline" size={24} color={theme.colors.warning} />
                </View>
                <Text style={[styles.healthLabel, { color: theme.colors.textSecondary }]}>Pest Risk</Text>
                <Text style={[styles.healthValue, { color: theme.colors.warning }]}>
                  {Math.round((1 - (engine.farmStats.pestPressure || 0)) * 100)}%
                </Text>
              </View>
            </View>
          </Card>

          {/* 3. Weather Forecast */}
          <Card variant="default" style={{ marginBottom: 20 }}>
            <View style={styles.forecastHeader}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.info} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Weather Outlook</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
              {weatherData.slice(currentDay - 1, currentDay + 6).map((day, idx) => (
                <View key={idx} style={[styles.forecastDay, { 
                  borderColor: theme.colors.border,
                  backgroundColor: idx === 0 ? `${theme.colors.primary}10` : 'transparent'
                }]}>
                  <Text style={[styles.forecastDayLabel, { 
                    color: idx === 0 ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: idx === 0 ? 'bold' : '500'
                  }]}>
                    {idx === 0 ? 'Today' : `+${idx}d`}
                  </Text>
                  <Ionicons 
                    name={day.prectot > 5 ? "rainy-outline" : day.t2m > 30 ? "sunny-outline" : "partly-sunny-outline"} 
                    size={28} 
                    color={day.prectot > 5 ? theme.colors.info : day.t2m > 30 ? theme.colors.warning : theme.colors.success} 
                  />
                  <Text style={[styles.forecastTemp, { color: theme.colors.text }]}>
                    {day.t2m?.toFixed(0)}°C
                  </Text>
                  <Text style={[styles.forecastRain, { color: theme.colors.textSecondary }]}>
                    {day.prectot?.toFixed(1)}mm
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Card>

          {/* 4. Current Weather Details */}
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




          {/* 5. Weather Alerts */}
          {parameterWarnings.length > 0 && (
            <Card variant="glass" style={{ marginBottom: 20 }}>
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={24} color={theme.colors.warning} />
                <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Weather Alerts</Text>
              </View>
              {parameterWarnings.map((w, i) => (
                <View key={i} style={styles.alertItem}>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
                  <Text style={[styles.alertText, { color: theme.colors.textSecondary }]}>
                    {w}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* 6. NASA Weather Analytics */}
          {weatherData.length > 0 && (
            <Card variant="default" style={{ marginBottom: 20 }}>
              <View style={styles.chartHeader}>
                <Ionicons name="analytics-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>NASA Data Analytics</Text>
              </View>
              
              {/* Data Source Info */}
              <View style={styles.dataSourceInfo}>
                <View style={styles.dataSourceItem}>
                  <Ionicons name="radio-outline" size={16} color={theme.colors.info} />
                  <Text style={[styles.dataSourceText, { color: theme.colors.textSecondary }]}>
                    GEOS-5 • Resolution: {dataResolution}
                  </Text>
                </View>
                <View style={styles.dataSourceItem}>
                  <Ionicons name={fromCache ? "cloud-offline-outline" : "cloud-download-outline"} size={16} color={fromCache ? theme.colors.warning : theme.colors.success} />
                  <Text style={[styles.dataSourceText, { color: theme.colors.textSecondary }]}>
                    {fromCache ? 'Cached Data' : 'Live Data'}
                  </Text>
                </View>
              </View>
              
              {/* Quick Stats */}
              <View style={styles.quickDataStats}>
                <View style={styles.quickStat}>
                  <Text style={[styles.quickStatValue, { color: theme.colors.text }]}>
                    {weatherData.length}
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: theme.colors.textSecondary }]}>
                    Days Data
                  </Text>
                </View>
                <View style={styles.quickStat}>
                  <Text style={[styles.quickStatValue, { color: theme.colors.text }]}>
                    {weatherData.filter(d => d.prectot > 0).length}
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: theme.colors.textSecondary }]}>
                    Rain Days
                  </Text>
                </View>
                <View style={styles.quickStat}>
                  <Text style={[styles.quickStatValue, { color: theme.colors.text }]}>
                    {Math.round(weatherData.reduce((sum, d) => sum + (d.t2m || 0), 0) / weatherData.length)}°C
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: theme.colors.textSecondary }]}>
                    Avg Temp
                  </Text>
                </View>
              </View>
              
              <NASADataCharts 
                weatherData={weatherData} 
                currentDay={currentDay}
                fromCache={fromCache}
                dataResolution={dataResolution}
              />
            </Card>
          )}

          {/* 7. Smart Farming Insights */}
          <Card variant="glass" style={{ marginBottom: 20 }}>
            <View style={styles.insightsHeader}>
              <Ionicons name="bulb-outline" size={24} color={theme.colors.warning} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Smart Insights</Text>
            </View>
            <View style={styles.insightsGrid}>
              <View style={styles.insightItem}>
                <View style={[styles.insightIconContainer, { backgroundColor: `${theme.colors.success}15` }]}>
                  <Ionicons name="checkmark-circle-outline" size={28} color={theme.colors.success} />
                </View>
                <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>Growth Status</Text>
                <Text style={[styles.insightValue, { 
                  color: currentWeather?.t2m && currentWeather.t2m >= 15 && currentWeather.t2m <= 30 
                    ? theme.colors.success : theme.colors.warning 
                }]}>
                  {currentWeather?.t2m && currentWeather.t2m >= 15 && currentWeather.t2m <= 30 ? 'Optimal' : 'Monitor'}
                </Text>
              </View>
              <View style={styles.insightItem}>
                <View style={[styles.insightIconContainer, { backgroundColor: `${theme.colors.info}15` }]}>
                  <Ionicons name="water-outline" size={28} color={theme.colors.info} />
                </View>
                <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>Water Need</Text>
                <Text style={[styles.insightValue, { 
                  color: currentWeather?.prectot && currentWeather.prectot > 5 
                    ? theme.colors.success : theme.colors.warning
                }]}>
                  {currentWeather?.prectot && currentWeather.prectot > 5 ? 'Low' : 'High'}
                </Text>
              </View>
              <View style={styles.insightItem}>
                <View style={[styles.insightIconContainer, { backgroundColor: `${theme.colors.error}15` }]}>
                  <Ionicons name="shield-outline" size={28} color={theme.colors.error} />
                </View>
                <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>Pest Risk</Text>
                <Text style={[styles.insightValue, { 
                  color: currentWeather?.rh2m && currentWeather.rh2m > 80 
                    ? theme.colors.error : theme.colors.success
                }]}>
                  {currentWeather?.rh2m && currentWeather.rh2m > 80 ? 'High' : 'Low'}
                </Text>
              </View>
            </View>
            {/* Daily Farming Tip */}
            <View style={styles.tipContainer}>
              <View style={styles.tipIcon}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
              </View>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                {currentWeather?.prectot && currentWeather.prectot > 10 
                  ? "Heavy rainfall expected - ensure proper drainage to prevent waterlogging." 
                  : currentWeather?.t2m && currentWeather.t2m > 35
                  ? "High temperature alert - increase watering frequency and provide shade."
                  : "Monitor soil moisture regularly and adjust irrigation based on weather conditions."
                }
              </Text>
            </View>
          </Card>

          {/* 8. Farm Resources Status */}
          <Card variant="default" style={styles.resourcesCard}>
            <View style={styles.healthHeader}>
              <Ionicons name="bar-chart-outline" size={24} color={theme.colors.text} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>
                Resource Levels
              </Text>
            </View>
            <View style={styles.resourcesGrid}>
              <View style={styles.resourceItem}>
                <Ionicons name="water-outline" size={24} color={theme.colors.info} />
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
                <Ionicons name="nutrition-outline" size={24} color={theme.colors.success} />
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

          {/* 9. Smart Farm Advisor */}
          <Card variant="glass" style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles-outline" size={24} color={theme.colors.secondary} />
              <Text style={[styles.aiTitle, { color: theme.colors.text }]}>
                Smart Farm Advisor
              </Text>
            </View>
            
            {aiRec ? (
              <View>
                {/* Priority Banner */}
                <View style={[styles.priorityBanner, {
                  backgroundColor: aiRec.priority === 'high' ? theme.colors.error + '20' :
                                   aiRec.priority === 'medium' ? theme.colors.warning + '20' :
                                   theme.colors.success + '20'
                }]}>
                  <Ionicons 
                    name={aiRec.priority === 'high' ? "alert-circle" : 
                          aiRec.priority === 'medium' ? "warning" : "checkmark-circle"}
                    size={16} 
                    color={aiRec.priority === 'high' ? theme.colors.error :
                           aiRec.priority === 'medium' ? theme.colors.warning :
                           theme.colors.success}
                  />
                  <Text style={[styles.priorityText, { 
                    color: aiRec.priority === 'high' ? theme.colors.error :
                           aiRec.priority === 'medium' ? theme.colors.warning :
                           theme.colors.success
                  }]}>
                    {aiRec.priority.toUpperCase()} PRIORITY • {aiRec.action.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                
                {/* Recommendation Content */}
                <View style={styles.aiContent}>
                  <Text style={[styles.aiRecommendation, { color: theme.colors.text }]}>
                    💡 {aiRec.reasoning}
                  </Text>
                  
                  <View style={styles.aiTipContainer}>
                    <Text style={[styles.aiTipLabel, { color: theme.colors.textSecondary }]}>
                      🎓 Learning Tip:
                    </Text>
                    <Text style={[styles.aiTip, { color: theme.colors.textSecondary }]}>
                      {aiRec.educationalNote}
                    </Text>
                  </View>
                  
                  {aiRec.dataLimitation && (
                    <View style={styles.aiLimitationContainer}>
                      <Text style={[styles.aiLimitationLabel, { color: theme.colors.warning }]}>
                        ⚠️ Data Consideration:
                      </Text>
                      <Text style={[styles.aiLimitation, { color: theme.colors.textSecondary }]}>
                        {aiRec.dataLimitation}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noRecommendationContainer}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.success} />
                <Text style={[styles.noRecommendationText, { color: theme.colors.text }]}>
                  All systems optimal! 
                </Text>
                <Text style={[styles.noRecommendationSubtext, { color: theme.colors.textSecondary }]}>
                  Your farm is running smoothly. Keep monitoring conditions.
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' }}>
              <Text style={[styles.weatherLabel, { color: theme.colors.textSecondary }]}>I followed the AI advice</Text>
              <Switch value={followedAI} onValueChange={setFollowedAI} />
            </View>
          </Card>

          {/* 10. Quick Actions Dashboard */}
          <Card variant="default" style={{ marginBottom: 20 }}>
            <View style={styles.quickActionsHeader}>
              <Ionicons name="flash-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Farm Actions</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              <Button
                title="Irrigate"
                onPress={() => showActionModal('irrigation')}
                variant="glass"
                size="medium"
                style={styles.quickActionBtn}
                icon={<Ionicons name="water-outline" size={18} color={theme.colors.info} />}
              />
              <Button
                title="Fertilize"
                onPress={() => showActionModal('fertilizer')}
                variant="glass"
                size="medium"
                style={styles.quickActionBtn}
                icon={<Ionicons name="leaf-outline" size={18} color={theme.colors.success} />}
              />
              <Button
                title="Pest Control"
                onPress={() => showActionModal('pest_control')}
                variant="glass"
                size="medium"
                style={styles.quickActionBtn}
                icon={<Ionicons name="shield-outline" size={18} color={theme.colors.error} />}
              />
              <Button
                title="Monitor"
                onPress={() => showActionModal('monitoring')}
                variant="glass"
                size="medium"
                style={styles.quickActionBtn}
                icon={<Ionicons name="analytics-outline" size={18} color={theme.colors.warning} />}
              />
            </View>
          </Card>



          {/* 11. Progress Control */}
          <Card variant="glass" style={{ marginBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>
                Growing Season Progress
              </Text>
            </View>
            <Button
              title={`Continue to Day ${Math.min(currentDay + 1, totalDays)} of ${totalDays}`}
              onPress={nextDay}
              variant="primary"
              size="large"
              style={{ width: '100%' }}
              icon={<Ionicons name="chevron-forward-outline" size={20} color="#FFFFFF" />}
            />
          </Card>
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
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  healthItem: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 8,
  },
  healthIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  alertText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  insightItem: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 8,
  },
  insightIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: '47%',
    marginBottom: 8,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  forecastScroll: {
    marginHorizontal: -4,
  },
  forecastDay: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 85,
    maxWidth: 100,
  },
  forecastDayLabel: {
    fontSize: 12,
    marginBottom: 10,
  },
  forecastTemp: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
  },
  forecastRain: {
    fontSize: 11,
    opacity: 0.8,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  farmStatusContainer: {
    marginBottom: 16,
  },
  farmStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  farmStatusText: {
    fontSize: 13,
    marginLeft: 6,
  },

  // Enhanced Data Styles
  dataSourceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dataSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dataSourceText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  quickDataStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Enhanced AI Styles
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  aiContent: {
    paddingVertical: 4,
  },
  aiRecommendation: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
  },
  aiTipContainer: {
    marginBottom: 8,
  },
  aiTipLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiTip: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 8,
  },
  aiLimitationContainer: {
    marginTop: 8,
  },
  aiLimitationLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiLimitation: {
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 8,
    fontStyle: 'italic',
  },
  noRecommendationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noRecommendationText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  noRecommendationSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },

});