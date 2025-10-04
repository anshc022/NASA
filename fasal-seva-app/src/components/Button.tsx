import React, { useState } from 'react';
import {
	TouchableOpacity,
	Text,
	ViewStyle,
	TextStyle,
	ActivityIndicator,
	Animated,
	Platform,
	Dimensions,
	StyleProp,
	Insets,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/theme';

const { width: screenWidth } = Dimensions.get('window');

interface ButtonProps {
	title: string;
	onPress: () => void;
	variant?: 'primary' | 'secondary' | 'glass' | 'outline';
	size?: 'small' | 'medium' | 'large';
	disabled?: boolean;
	loading?: boolean;
		style?: StyleProp<ViewStyle>;
		textStyle?: StyleProp<TextStyle>;
	icon?: React.ReactNode;
		hitSlop?: Insets | number;
}

export const Button: React.FC<ButtonProps> = ({
	title,
	onPress,
	variant = 'primary',
	size = 'medium',
	disabled = false,
	loading = false,
	style,
	textStyle,
		icon,
		hitSlop,
}) => {
	const { theme, isDark } = useTheme();
	const [scaleValue] = useState(new Animated.Value(1));

	const handlePressIn = () => {
		if (!disabled && !loading) {
			Animated.spring(scaleValue, {
				toValue: 0.96,
				useNativeDriver: true,
				tension: 300,
				friction: 12,
			}).start();
			if (Platform.OS === 'ios') {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			}
		}
	};

	const handlePressOut = () => {
		Animated.spring(scaleValue, {
			toValue: 1,
			useNativeDriver: true,
			tension: 300,
			friction: 12,
		}).start();
	};

	const handlePress = () => {
		if (!disabled && !loading) {
			if (Platform.OS === 'ios') {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			}
			onPress();
		}
	};

	const getButtonStyle = (): ViewStyle => {
		const scale = screenWidth / 375; // Base on iPhone 8
		const baseStyle: ViewStyle = {
			borderRadius: theme.borderRadius.lg,
			alignItems: 'center',
			justifyContent: 'center',
			flexDirection: 'row',
			...theme.shadows.medium,
		};
		const sizeStyles = {
			small: {
				paddingHorizontal: Math.max(12, 16 * scale),
				paddingVertical: Math.max(6, 8 * scale),
				minHeight: Math.max(32, 36 * scale),
			},
			medium: {
				paddingHorizontal: Math.max(16, 24 * scale),
				paddingVertical: Math.max(8, 12 * scale),
				minHeight: Math.max(40, 48 * scale),
			},
			large: {
				paddingHorizontal: Math.max(20, 32 * scale),
				paddingVertical: Math.max(12, 16 * scale),
				minHeight: Math.max(48, 56 * scale),
			},
		};
		return { ...baseStyle, ...sizeStyles[size], opacity: disabled ? 0.6 : 1 };
	};

	const textSize = size === 'small' ? 14 : size === 'large' ? 18 : 16;
	const textColor =
		variant === 'primary'
			? '#FFFFFF'
			: variant === 'secondary'
			? theme.colors.primary
			: variant === 'outline'
			? theme.colors.primary
			: theme.colors.text;

		const Content = (
			<>
				{icon && <>{icon}</>}
				<Text
					style={[
						{
							color: textColor,
							fontSize: textSize,
							fontWeight: '600',
							marginLeft: icon ? 8 : 0,
						},
						textStyle,
					]}
				>
					{title}
				</Text>
			</>
		);

		const AnimatedWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
		<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
			<TouchableOpacity
				activeOpacity={0.85}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={handlePress}
				disabled={disabled || loading}
					hitSlop={hitSlop}
			>
				{children}
			</TouchableOpacity>
		</Animated.View>
	);

	if (variant === 'glass') {
		return (
			<AnimatedWrap>
				<BlurView
					intensity={80}
					tint={isDark ? 'dark' : 'light'}
						style={[{ overflow: 'hidden' }, getButtonStyle(), style]}
				>
					{loading ? <ActivityIndicator color={theme.colors.text} /> : Content}
				</BlurView>
			</AnimatedWrap>
		);
	}

	if (variant === 'primary') {
		return (
			<AnimatedWrap>
				<LinearGradient
					colors={[theme.colors.primary, theme.colors.secondary]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={[getButtonStyle(), style]}
				>
					{loading ? <ActivityIndicator color="#FFFFFF" /> : Content}
				</LinearGradient>
			</AnimatedWrap>
		);
	}

		const variantStyles: ViewStyle =
			variant === 'outline'
				? { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.colors.primary }
				: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary };

	return (
		<AnimatedWrap>
			<TouchableOpacity
				style={[getButtonStyle(), variantStyles, style]}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={handlePress}
				disabled={disabled || loading}
				activeOpacity={0.85}
			>
				{loading ? <ActivityIndicator color={theme.colors.primary} /> : Content}
			</TouchableOpacity>
		</AnimatedWrap>
	);
};

export default Button;
