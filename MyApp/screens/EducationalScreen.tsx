import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { educationalAPI } from '../services/api';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import SimpleCard from '../components/SimpleCard';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { progressAPI } from '../services/api';

interface Quiz {
  id: number | string;
  question: string;
  options: string[];
  correct: number;
  xp: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  is_personalized?: boolean;
}

interface Fact {
  id: number | string;
  title: string;
  content: string;
  category: string;
  xp: number;
  is_personalized?: boolean;
}

interface Mission {
  id: number | string;
  title: string;
  content: string;
  xp: number;
  category: string;
  completed?: boolean;
}

const { width } = Dimensions.get('window');

const NASA_FACTS = [
  {
    id: 1,
    title: "🛰️ NASA POWER Data",
    content: "NASA's POWER project provides solar and meteorological data from satellites and models, helping farmers optimize crop yields with real-time weather insights.",
    category: "Satellites",
    xp: 10,
  },
  {
    id: 2,
    title: "🌧️ Precipitation Patterns",
    content: "NASA satellites track global rainfall patterns, helping farmers plan irrigation schedules and predict drought conditions up to 7 days in advance.",
    category: "Weather",
    xp: 15,
  },
  {
    id: 3,
    title: "🌡️ Temperature Monitoring",
    content: "Surface temperature data from NASA helps determine optimal planting times and predict crop stress conditions before they become visible.",
    category: "Climate",
    xp: 12,
  },
  {
    id: 4,
    title: "💧 Soil Moisture Insights",
    content: "NASA's SMAP mission measures soil moisture globally, helping farmers optimize irrigation and prevent water waste.",
    category: "Soil",
    xp: 18,
  },
  {
    id: 5,
    title: "🌞 Solar Radiation Data",
    content: "Understanding solar radiation helps farmers select crop varieties and plan harvest timing for maximum nutrition and yield.",
    category: "Energy",
    xp: 14,
  },
  {
    id: 6,
    title: "🌿 Carbon Cycle",
    content: "NASA tracks how plants absorb CO2, helping farmers understand their role in climate change mitigation and carbon sequestration.",
    category: "Environment",
    xp: 20,
  },
];

// Dynamic quiz questions that can be generated based on user data
const DYNAMIC_QUIZ_TEMPLATES = [
  {
    id: 'soil_moisture',
    question: "Which NASA mission specifically measures soil moisture?",
    options: ["MODIS", "SMAP", "POWER", "Landsat"],
    correct: 1,
    xp: 25,
    difficulty: 'medium' as const,
    category: 'Satellites',
  },
  {
    id: 'power_data',
    question: "What does NASA POWER data help farmers with?",
    options: ["Soil analysis", "Weather forecasting", "Crop genetics", "Market prices"],
    correct: 1,
    xp: 20,
    difficulty: 'easy' as const,
    category: 'Weather',
  },
  {
    id: 'drought_prediction',
    question: "How many days in advance can NASA data help predict drought?",
    options: ["3 days", "5 days", "7 days", "10 days"],
    correct: 2,
    xp: 30,
    difficulty: 'hard' as const,
    category: 'Climate',
  },
  {
    id: 'temperature_optimal',
    question: "What's the optimal temperature range for most crops?",
    options: ["10-15°C", "20-30°C", "35-45°C", "50-60°C"],
    correct: 1,
    xp: 15,
    difficulty: 'easy' as const,
    category: 'Climate',
  },
  {
    id: 'solar_radiation',
    question: "How does solar radiation affect plant growth?",
    options: ["No effect", "Only affects water needs", "Drives photosynthesis", "Only affects temperature"],
    correct: 2,
    xp: 20,
    difficulty: 'medium' as const,
    category: 'Energy',
  },
];

export default function EducationalScreen() {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const { user } = useAuth();
  const { loadUserProgress } = useGame();
  
  // Simple XP update function
  const updateXP = async (xpGained: number) => {
    try {
      // Update via progress API (this should update user context)
      await loadUserProgress();
    } catch (error) {
      console.log('Failed to update XP:', error);
    }
  };
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [readFacts, setReadFacts] = useState(new Set<string | number>());
  
  // Use main XP system
  const currentXP = user?.xp || 0;
  const currentLevel = Math.floor(currentXP / 100) + 1;
  
  // AI-powered content states
  const [aiContent, setAiContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usePersonalizedContent, setUsePersonalizedContent] = useState(false);
  
  // Quiz states
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState(new Set<string | number>());

  // Load personalized AI content on component mount
  useEffect(() => {
    loadPersonalizedContent();
  }, []);

  const loadPersonalizedContent = async (forceRegenerate: boolean = false) => {
    try {
      setIsLoading(true);
      const response = await educationalAPI.generateContent(forceRegenerate);
      
      if (response.success && response.content) {
        setAiContent(response.content);
        setUsePersonalizedContent(true);
        
        const cacheStatus = response.is_cached ? "📚 Loaded from cache" : "🤖 Fresh AI content generated";
        const plantMessage = response.plant_count === 1 ? "plant" : "plants";
        
        if (!forceRegenerate) {
          Alert.alert(
            '🎓 Personalized Learning Ready!', 
            `${cacheStatus}\nBased on your ${response.plant_count} ${plantMessage} and location!`,
            [{ text: 'Start Learning!' }]
          );
        }
      } else {
        // Fall back to static content
        setUsePersonalizedContent(false);
      }
    } catch (error) {
      console.log('Using static educational content');
      setUsePersonalizedContent(false);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['All', 'Satellites', 'Weather', 'Climate', 'Soil', 'Energy', 'Environment'];

  // Use AI facts when available, otherwise fallback to static facts
  const getDisplayFacts = () => {
    if (usePersonalizedContent && aiContent?.facts) {
      return selectedCategory === 'All' 
        ? aiContent.facts 
        : aiContent.facts.filter((fact: any) => fact.category === selectedCategory);
    }
    return selectedCategory === 'All' 
      ? NASA_FACTS 
      : NASA_FACTS.filter(fact => fact.category === selectedCategory);
  };

  const filteredFacts = getDisplayFacts();

  const handleFactRead = async (factId: string | number, xp: number) => {
    if (!readFacts.has(factId)) {
      setReadFacts(prev => new Set([...prev, factId]));
      
      // Update main XP system
      await updateXP(xp);
      
      // Mark content as completed in backend
      try {
        await educationalAPI.markCompleted('fact', factId.toString(), xp);
      } catch (error) {
        console.log('Failed to mark content as completed:', error);
      }
      
      Alert.alert('Knowledge Gained!', `+${xp} XP earned! 📚`, [{ text: 'Continue Learning' }]);
    }
  };

  const handleQuizAnswer = async (quiz: Quiz, selectedOption: number) => {
    const isCorrect = selectedOption === quiz.correct;
    if (isCorrect) {
      setCompletedQuizzes(prev => new Set([...prev, quiz.id]));
      
      // Update main XP system
      await updateXP(quiz.xp);
      
      // Mark quiz as completed in backend
      try {
        await educationalAPI.markCompleted('quiz', quiz.id.toString(), quiz.xp);
      } catch (error) {
        console.log('Failed to mark quiz as completed:', error);
      }
      
      Alert.alert(
        'Correct! 🎉', 
        `You earned ${quiz.xp} XP!\n${quiz.difficulty === 'hard' ? 'That was a challenging question!' : 'Great job!'}`, 
        [{ text: 'Continue Learning' }]
      );
    } else {
      Alert.alert(
        'Not quite right 🤔', 
        `The correct answer was: ${quiz.options[quiz.correct]}\nTry again to earn XP!`, 
        [{ text: 'Try Again' }]
      );
    }
    setCurrentQuiz(null);
  };

  // Generate dynamic quizzes based on AI content and user progress
  const generateDynamicQuizzes = () => {
    let quizzes = [...DYNAMIC_QUIZ_TEMPLATES];
    
    // Add AI-generated quizzes if available
    if (usePersonalizedContent && aiContent?.quizzes) {
      quizzes = [...quizzes, ...aiContent.quizzes];
    }
    
    // Filter out completed quizzes for variety
    const availableQuizzes = quizzes.filter(quiz => !completedQuizzes.has(quiz.id));
    
    return availableQuizzes.length > 0 ? availableQuizzes : quizzes; // Reset if all completed
  };

  const startQuiz = () => {
    const availableQuizzes = generateDynamicQuizzes();
    const randomQuiz = availableQuizzes[Math.floor(Math.random() * availableQuizzes.length)];
    setCurrentQuiz(randomQuiz);
  };

  // Show loading screen while generating personalized content
  if (isLoading) {
    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>🤖 Creating personalized learning content...</Text>
          <Text style={styles.loadingSubtext}>Analyzing your plants and NASA data</Text>
        </View>
      </LinearGradient>
    );
  }

  if (currentQuiz) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => setCurrentQuiz(null)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>NASA Quiz 🧠</Text>
            <View style={[styles.personalizedBadge, { backgroundColor: `${currentQuiz.difficulty === 'hard' ? '#FF6B35' : currentQuiz.difficulty === 'medium' ? '#FFA500' : '#4CAF50'}20` }]}>
              <Text style={[styles.personalizedText, { color: currentQuiz.difficulty === 'hard' ? '#FF6B35' : currentQuiz.difficulty === 'medium' ? '#FFA500' : '#4CAF50' }]}>
                {currentQuiz.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.quizContainer}>
          <View style={[styles.quizCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.quizQuestion, { color: colors.text }]}>{currentQuiz.question}</Text>
            
            {currentQuiz.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quizOption,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => handleQuizAnswer(currentQuiz, index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.quizOptionText, { color: colors.text }]}>{option}</Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.quizReward}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.quizRewardText}>+{currentQuiz.xp} XP</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>NASA Education</Text>
          {usePersonalizedContent && (
            <View style={styles.personalizedBadge}>
              <Ionicons name="sparkles" size={14} color="#4CAF50" />
              <Text style={styles.personalizedText}>AI Powered</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.card }]}
          onPress={() => loadPersonalizedContent(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimalistic Stats Overview */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <TouchableOpacity 
                style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={styles.miniStatHeader}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Level {currentLevel}</Text>
                </View>
                <Text style={[styles.miniStatValue, { color: colors.text }]}>{currentXP.toLocaleString()}</Text>
                <Text style={[styles.miniStatSubtitle, { color: colors.textSecondary }]}>XP</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statCard}>
              <TouchableOpacity 
                style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={styles.miniStatHeader}>
                  <Ionicons name="book" size={16} color="#4CAF50" />
                  <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Facts</Text>
                </View>
                <Text style={[styles.miniStatValue, { color: colors.text }]}>{readFacts.size}</Text>
                <Text style={[styles.miniStatSubtitle, { color: colors.textSecondary }]}>completed</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statCard}>
              <TouchableOpacity 
                style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={styles.miniStatHeader}>
                  <Ionicons name="school" size={16} color="#3B82F6" />
                  <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Quizzes</Text>
                </View>
                <Text style={[styles.miniStatValue, { color: colors.text }]}>{completedQuizzes.size}</Text>
                <Text style={[styles.miniStatSubtitle, { color: colors.textSecondary }]}>passed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Learning Actions
          </Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={[styles.miniActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={startQuiz}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="school" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>NASA Quiz</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{completedQuizzes.size} completed</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.miniActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => loadPersonalizedContent(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="sparkles" size={20} color={usePersonalizedContent ? "#4CAF50" : "#8B5CF6"} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>AI Content</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                {usePersonalizedContent ? "Personalized" : "Generate"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Filter */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Categories
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedCategory === category && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  { color: selectedCategory === category ? '#FFFFFF' : colors.text }
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Learning Content */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Learning Facts
            </Text>
            {usePersonalizedContent && aiContent?.is_cached && (
              <View style={styles.cacheIndicator}>
                <Ionicons name="archive" size={14} color="#FFA500" />
                <Text style={styles.cacheText}>Cached</Text>
              </View>
            )}
          </View>

          {filteredFacts.map((fact: Fact) => {
            const isRead = readFacts.has(fact.id);
            return (
              <TouchableOpacity
                key={fact.id}
                style={[
                  styles.factCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isRead && { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }
                ]}
                onPress={() => handleFactRead(fact.id, fact.xp)}
                activeOpacity={0.7}
              >
                <View style={styles.factHeader}>
                  <View style={styles.factTitleContainer}>
                    <Text style={[styles.factTitle, { color: colors.text }]} numberOfLines={2}>{fact.title}</Text>
                    {fact.is_personalized && (
                      <Ionicons name="sparkles" size={12} color="#4CAF50" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  {!isRead ? (
                    <View style={styles.xpBadge}>
                      <Text style={styles.factXp}>+{fact.xp}</Text>
                    </View>
                  ) : (
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  )}
                </View>
                
                <Text style={[styles.factContent, { color: colors.textSecondary }]} numberOfLines={2}>
                  {fact.content}
                </Text>
                
                <View style={styles.factFooter}>
                  <Text style={[styles.factCategory, { color: colors.textSecondary }]}>{fact.category}</Text>
                  {!isRead && <Text style={styles.factPrompt}>Tap to read</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Missions Section */}
        {usePersonalizedContent && aiContent?.interactive_missions?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Interactive Missions
            </Text>
            {aiContent.interactive_missions.slice(0, 2).map((mission: Mission) => (
              <TouchableOpacity
                key={mission.id}
                style={[styles.missionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => Alert.alert('Mission', mission.content)}
                activeOpacity={0.7}
              >
                <View style={styles.missionHeader}>
                  <Ionicons name="telescope" size={24} color={colors.primary} />
                  <Text style={[styles.missionTitle, { color: colors.text }]}>{mission.title}</Text>
                  <View style={styles.missionXp}>
                    <Text style={styles.missionXpText}>+{mission.xp} XP</Text>
                  </View>
                </View>
                <Text style={[styles.missionContent, { color: colors.textSecondary }]} numberOfLines={2}>
                  {mission.content}
                </Text>
              </TouchableOpacity>
            ))}
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
  // Modern Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  personalizedText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Content Styles
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },

  // Stats Section
  statsSection: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
  },

  // Minimalistic Stat Cards
  miniStatCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  miniStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  miniStatSubtitle: {
    fontSize: 10,
    opacity: 0.7,
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  // Minimalistic Action Cards
  miniActionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },

  // Categories
  categoriesContainer: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Minimalistic Fact Cards
  factCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  factHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  factTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  factTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  factXp: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  factContent: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    opacity: 0.8,
  },
  factFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factCategory: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.6,
  },
  factPrompt: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
    opacity: 0.8,
  },

  // Mission Cards
  missionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  missionXp: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  missionXpText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  missionContent: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Quiz Styles
  quizContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  quizCard: {
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  quizOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  quizOptionText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  quizReward: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
  },
  quizRewardText: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },

  // Cache Indicator
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cacheText: {
    color: '#FFA500',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});