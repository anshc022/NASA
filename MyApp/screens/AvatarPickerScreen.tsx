import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { useAuth } from '../contexts/AuthContext';
import { avatarAPI } from '../services/api';
import Avatar from '../components/Avatar';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3; // 3 columns with padding

interface AvatarOption {
  id: string;
  url: string;
  style: string;
  category: string;
  name: string;
}

interface AvatarData {
  options: Record<string, AvatarOption>;
  page: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
}

const AvatarPickerScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const isDark = colorScheme === 'dark';
  const { user, refreshUser } = useAuth();
  
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadAvatarOptions(0, true);
  }, []);

  const loadAvatarOptions = async (page: number = 0, reset: boolean = false) => {
    try {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);
      
      const response: AvatarData = await avatarAPI.getAvatarOptions(page, 12);
      const newOptions = Object.entries(response.options).map(([key, option]) => ({
        ...option,
        id: key,
      }));

      if (reset) {
        setAvatarOptions(newOptions);
        setSelectedAvatar(user?.avatar_url || null);
      } else {
        setAvatarOptions(prev => [...prev, ...newOptions]);
      }
      
      setCurrentPage(page);
      setHasMore(response.has_more);
    } catch (error) {
      console.error('Failed to load avatar options:', error);
      Alert.alert('Error', 'Failed to load avatar options');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const updateAvatar = async (avatarUrl: string) => {
    try {
      setUpdating(true);
      await avatarAPI.updateAvatar(avatarUrl);
      setSelectedAvatar(avatarUrl);
      
      // Refresh user data to get updated avatar
      await refreshUser();
      
      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (error) {
      console.error('Failed to update avatar:', error);
      Alert.alert('Error', 'Failed to update avatar');
    } finally {
      setUpdating(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAvatarOptions(0, true);
  }, []);

  const loadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      loadAvatarOptions(currentPage + 1, false);
    }
  };

  const renderAvatarItem = ({ item }: { item: AvatarOption }) => (
    <TouchableOpacity
      style={[
        styles.avatarOption,
        { 
          backgroundColor: colors.surface,
          borderColor: selectedAvatar === item.url ? colors.primary : colors.border,
          borderWidth: selectedAvatar === item.url ? 3 : 1,
          ...colors.shadows.sm
        }
      ]}
      onPress={() => updateAvatar(item.url)}
      disabled={updating}
    >
      <Avatar
        avatarUrl={item.url}
        fallbackText="?"
        size={ITEM_SIZE - 40}
        backgroundColor={colors.primary + '10'}
        textColor={colors.primary}
      />
      <Text style={[styles.avatarTypeName, { color: colors.text }]} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[styles.avatarCategory, { color: colors.textSecondary }]}>
        {item.category}
      </Text>
      {updating && selectedAvatar === item.url && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Loading more avatars...
        </Text>
      </View>
    );
  };

  if (loading && avatarOptions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Generating avatars...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Choose Avatar ({avatarOptions.length} options)
        </Text>
        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons 
            name={viewMode === 'grid' ? 'list' : 'grid'} 
            size={24} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Current Avatar */}
      <View style={[styles.currentAvatarSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Current Avatar
        </Text>
        <Avatar
          avatarUrl={selectedAvatar}
          fallbackText={user?.full_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || '🚀'}
          size={80}
          backgroundColor={colors.primary + '20'}
          textColor={colors.primary}
        />
      </View>

      {/* Avatar Grid with Infinite Scroll */}
      <FlatList<AvatarOption>
        data={avatarOptions}
        renderItem={renderAvatarItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.flatListContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

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
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  viewModeButton: {
    padding: 8,
  },
  currentAvatarSection: {
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  flatListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-around',
  },
  avatarOption: {
    width: ITEM_SIZE,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
  },
  avatarTypeName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  avatarCategory: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AvatarPickerScreen;