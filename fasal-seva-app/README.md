# Fasal Seva – NASA Farm Navigator Mobile App

React Native (Expo) frontend for the Fasal Seva educational farming game that uses NASA POWER API data and AI-powered recommendations.

## Features

### 🏠 Home Screen
- Welcome message with AI-powered daily farming tips
- Text-to-speech functionality for accessibility
- Connection status to FastAPI backend
- Quick start button for farm simulation

### 📍 Farm Selection Screen  
- Interactive location picker with preset locations (Delhi, Iowa, São Paulo)
- Custom latitude/longitude input with validation
- Date range selection for data analysis
- Optional crop type selection for personalized AI recommendations
- Form validation and error handling

### 📊 Farm Data Screen
- Real-time NASA POWER data visualization with interactive charts
- AI-powered recommendations with confidence scoring
- Multiple data metrics: Temperature, Humidity, Rainfall, Wind Speed
- Game scoring system based on optimal farming conditions
- Text-to-speech for AI recommendations
- Detailed farm information display

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **React Navigation** for screen routing
- **react-native-chart-kit** for data visualization
- **Axios** for API calls
- **Expo Speech** for text-to-speech functionality
- **Expo Vector Icons** for UI icons

## Installation & Setup

```bash
# Navigate to the mobile app directory
cd fasal-seva-app

# Install dependencies
npm install

# Start the development server
npm start

# Run on specific platforms
npm run android    # Android
npm run ios        # iOS (macOS required)
npm run web        # Web browser
```

## Backend Integration

The app connects to your FastAPI backend at `http://localhost:8000`. Make sure your backend is running before using the app.

### API Endpoints Used:
- `GET /` - Welcome message and system status
- `GET /farm-data` - NASA POWER data with AI recommendations

### Configuration
Update the API base URL in `src/services/api.ts` if your backend runs on a different port or host.

## Screenshots Flow

1. **Home Screen**: Welcome with daily tips and connection status
2. **Farm Selection**: Location picker with preset options and crop selection  
3. **Farm Data**: Interactive charts, AI recommendations, and game scoring

## Educational Features

- **Real NASA Data**: Live integration with NASA POWER API
- **AI Recommendations**: Context-aware farming advice using your Ollama Gemma model
- **Gamification**: Scoring system based on optimal farming conditions
- **Accessibility**: Text-to-speech for AI recommendations
- **Interactive Learning**: Visual charts and explanations of climate data

## Development Notes

- Uses modern React Native patterns with TypeScript
- Responsive design optimized for mobile devices
- Error handling and loading states throughout
- Form validation for user inputs
- Offline-ready with graceful API error handling

## Next Steps

To extend the app further:
- Add offline data caching with AsyncStorage
- Implement user accounts and farm history
- Add more interactive game elements
- Include crop growth simulation
- Add social features and leaderboards