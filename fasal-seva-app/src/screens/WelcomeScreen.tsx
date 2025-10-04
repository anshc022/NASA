import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface WelcomeScreenProps {
  navigation: any;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português' },
];

const WELCOME_TEXT = {
  en: {
    title: 'Welcome to Fasal Seva',
    subtitle: 'NASA Farm Navigator',
    description: 'Learn sustainable farming through NASA satellite data and AI-powered recommendations',
    features: [
      '🛰️ Real-time NASA satellite data',
      '🤖 AI-powered farming recommendations',
      '🌱 Sustainable agriculture practices',
      '📊 Data-driven decision making',
      '🎮 Interactive farming simulation',
      '🏆 Track your farming success',
    ],
    selectLanguage: 'Select Your Language',
    getStarted: 'Get Started',
  },
  hi: {
    title: 'फसल सेवा में आपका स्वागत है',
    subtitle: 'नासा फार्म नेविगेटर',
    description: 'NASA उपग्रह डेटा और AI-संचालित सिफारिशों के माध्यम से सतत खेती सीखें',
    features: [
      '🛰️ रियल-टाइम NASA उपग्रह डेटा',
      '🤖 AI-संचालित खेती सिफारिशें',
      '🌱 टिकाऊ कृषि प्रथाएं',
      '📊 डेटा-संचालित निर्णय लेना',
      '🎮 इंटरैक्टिव खेती सिमुलेशन',
      '🏆 अपनी खेती की सफलता ट्रैक करें',
    ],
    selectLanguage: 'अपनी भाषा चुनें',
    getStarted: 'शुरू करें',
  },
  es: {
    title: 'Bienvenido a Fasal Seva',
    subtitle: 'Navegador de Granja NASA',
    description: 'Aprende agricultura sostenible mediante datos satelitales de NASA y recomendaciones impulsadas por IA',
    features: [
      '🛰️ Datos satelitales de NASA en tiempo real',
      '🤖 Recomendaciones agrícolas impulsadas por IA',
      '🌱 Prácticas agrícolas sostenibles',
      '📊 Toma de decisiones basada en datos',
      '🎮 Simulación agrícola interactiva',
      '🏆 Rastrea tu éxito agrícola',
    ],
    selectLanguage: 'Selecciona tu idioma',
    getStarted: 'Empezar',
  },
  pt: {
    title: 'Bem-vindo ao Fasal Seva',
    subtitle: 'Navegador de Fazenda NASA',
    description: 'Aprenda agricultura sustentável através de dados de satélite da NASA e recomendações com IA',
    features: [
      '🛰️ Dados de satélite NASA em tempo real',
      '🤖 Recomendações agrícolas com IA',
      '🌱 Práticas agrícolas sustentáveis',
      '📊 Tomada de decisão baseada em dados',
      '🎮 Simulação agrícola interativa',
      '🏆 Acompanhe seu sucesso agrícola',
    ],
    selectLanguage: 'Selecione seu idioma',
    getStarted: 'Começar',
  },
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { theme, isDark } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleLanguageSelect = async (languageCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguage(languageCode);
    await AsyncStorage.setItem('selectedLanguage', languageCode);
  };

  const handleGetStarted = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
    navigation.navigate('Login');
  };

  const text = WELCOME_TEXT[selectedLanguage as keyof typeof WELCOME_TEXT];

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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={[
              styles.logoContainer,
              { backgroundColor: `${theme.colors.primary}20` }
            ]}>
              <Ionicons name="leaf" size={60} color={theme.colors.primary} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {text.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.primary }]}>
              {text.subtitle}
            </Text>
          </View>

          {/* Description */}
          <Card variant="glass" style={styles.descriptionCard}>
            <Text style={[styles.description, { color: theme.colors.text }]}>
              {text.description}
            </Text>
          </Card>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {text.features.map((feature, index) => (
              <Card key={index} variant="default" style={styles.featureCard}>
                <Text style={[styles.featureText, { color: theme.colors.text }]}>
                  {feature}
                </Text>
              </Card>
            ))}
          </View>

          {/* Language Selection */}
          <Card variant="gradient" style={styles.languageCard}>
            <Text style={[styles.languageTitle, { color: theme.colors.text }]}>
              {text.selectLanguage}
            </Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: selectedLanguage === lang.code 
                        ? theme.colors.primary 
                        : theme.colors.border,
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageNative, 
                    { color: theme.colors.text }
                  ]}>
                    {lang.nativeName}
                  </Text>
                  {selectedLanguage === lang.code && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color={theme.colors.primary} 
                      style={styles.checkmark}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              Powered by NASA POWER API
            </Text>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              NASA Space Apps Challenge 2025
            </Text>
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.stickyBar}>
          <Button
            title={text.getStarted}
            onPress={handleGetStarted}
            variant="primary"
            size="large"
            style={styles.stickyButton}
            icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
          />
        </BlurView>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  descriptionCard: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureCard: {
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
  },
  languageCard: {
    marginBottom: 24,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  languageButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  languageFlag: {
    fontSize: 32,
    marginBottom: 8,
  },
  languageNative: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  startButton: {
    marginBottom: 24,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  stickyButton: {
    // full width minus padding
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
