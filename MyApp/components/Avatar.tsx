import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

interface AvatarProps {
  avatarUrl?: string | null;
  fallbackText?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  avatarUrl,
  fallbackText = '🚀',
  size = 80,
  backgroundColor = 'rgba(255, 255, 255, 0.2)',
  textColor = '#FFFFFF'
}) => {
  const [imageError, setImageError] = useState(false);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  const textStyle = {
    fontSize: size * 0.4,
    fontWeight: 'bold' as const,
    color: textColor,
  };

  // Show fallback if no URL or image failed to load
  if (!avatarUrl || imageError) {
    return (
      <View style={containerStyle}>
        <Text style={textStyle}>
          {fallbackText}
        </Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        onError={(error) => {
          console.log('Avatar image failed to load:', avatarUrl);
          console.log('Error details:', error.nativeEvent);
          setImageError(true);
        }}
        onLoad={() => {
          // Reset error state if image loads successfully
          setImageError(false);
        }}
      />
    </View>
  );
};

export default Avatar;