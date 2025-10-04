# 🚀 NASA Farm Navigators
## Educational Agricultural Game Using NASA Data

![NASA Space Apps Challenge](https://img.shields.io/badge/NASA-Space%20Apps%20Challenge%202025-blue)
![Difficulty](https://img.shields.io/badge/Difficulty-Intermediate%20%7C%20Advanced-orange)
![License](https://img.shields.io/badge/License-MIT-green)

### 📋 Project Overview

NASA Farm Navigators is an engaging educational game that utilizes NASA's open datasets to simulate realistic farming scenarios. The game helps players learn sustainable agricultural practices through data-driven decision making, bridging the gap between complex scientific data and practical farming applications.

### 🎯 Challenge Goals

**Primary Objective**: Create an educational game that effectively uses NASA's open datasets to illustrate modern agricultural practices while entertaining and educating players on conservation farming techniques.

**Key Focus Areas**:
- **Agriculture & Sustainability**: Implement conservation methods and sustainable farming practices
- **Data Integration**: Utilize real NASA satellite imagery and climate data
- **Educational Impact**: Make complex data accessible to farmers and agricultural communities
- **User Engagement**: Create an intuitive, entertaining gaming experience

### 🌱 Core Features

#### Game Mechanics
- **Crop Management**: Plant, grow, and harvest various crops based on real environmental conditions
- **Resource Management**: Manage water, fertilizers, and other agricultural inputs
- **Weather Simulation**: Real-time weather patterns using NASA climate data
- **Livestock Management**: Raise and care for farm animals with data-driven insights
- **Economic System**: Manage farm finances and optimize profitability
- **Seasonal Cycles**: Experience realistic farming seasons and their challenges

#### NASA Data Integration
- **Satellite Imagery**: Real-world farm visualization using NASA Earth observation data
- **Climate Data**: Temperature, precipitation, and weather pattern analysis
- **Soil Moisture**: Ground-level moisture content for irrigation decisions
- **Vegetation Health**: NDVI and other vegetation indices for crop monitoring
- **Environmental Monitoring**: Air quality, pollution levels, and climate change impacts

#### Educational Components
- **Interactive Tutorials**: Step-by-step guidance on using NASA data for farming
- **Data Visualization**: Charts, graphs, and maps to explain complex datasets
- **Real-world Scenarios**: Based on actual agricultural challenges and solutions
- **Decision Impact Tracking**: See how choices affect long-term farm sustainability

### 🛠️ Technology Stack

#### Frontend
- **Framework**: React.js with TypeScript
- **3D Graphics**: Three.js for farm visualization
- **Mapping**: Leaflet.js for satellite imagery integration
- **UI Framework**: Material-UI or Ant Design
- **State Management**: Redux Toolkit

#### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with PostGIS for spatial data
- **API**: RESTful API with GraphQL endpoints
- **Authentication**: JWT-based user authentication

#### Data Sources
- **NASA Earthdata**: Primary data source for all environmental data
- **NASA Giovanni**: Atmospheric data and climate information
- **USGS**: Geological and water resource data
- **NOAA**: Weather forecasting and historical climate data

#### Deployment
- **Frontend**: Vercel or Netlify
- **Backend**: AWS EC2 or Heroku
- **Database**: AWS RDS or Heroku Postgres
- **CDN**: AWS CloudFront for asset delivery

### 📊 NASA Datasets to Utilize

#### Satellite Imagery
- **Landsat 8/9**: 30m resolution for detailed farm monitoring
- **MODIS**: 250m-500m resolution for regional climate patterns
- **Sentinel-2**: 10m resolution for high-detail crop analysis

#### Climate & Weather
- **GLDAS**: Global Land Data Assimilation System
- **GPM**: Global Precipitation Measurement
- **MERRA-2**: Modern-Era Retrospective analysis

#### Vegetation & Agriculture
- **NDVI**: Normalized Difference Vegetation Index
- **EVI**: Enhanced Vegetation Index
- **LAI**: Leaf Area Index
- **FPAR**: Fraction of Photosynthetically Active Radiation

### 🎮 Game Flow & User Experience

#### 1. Onboarding
- Character creation and farm selection
- Tutorial on basic farming concepts
- Introduction to NASA data interpretation

#### 2. Farm Management
- Daily/seasonal decision making
- Resource allocation based on data insights
- Crop rotation and planning

#### 3. Data Analysis
- Interactive data dashboards
- Trend analysis and forecasting
- Impact assessment of farming decisions

#### 4. Challenges & Scenarios
- Weather events and crisis management
- Market fluctuations and economic challenges
- Environmental conservation goals

#### 5. Community Features
- Leaderboards and achievements
- Knowledge sharing between players
- Collaborative farming projects

### 🏗️ Project Structure

```
nasa-farm-navigators/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main game pages/screens
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   ├── services/      # API service calls
│   │   └── store/         # Redux store configuration
│   ├── public/            # Static assets
│   └── package.json
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Server utilities
│   ├── config/            # Configuration files
│   └── package.json
├── data/                  # NASA data processing scripts
│   ├── scripts/           # Data fetching and processing
│   ├── schemas/           # Data validation schemas
│   └── cache/             # Cached NASA data
├── docs/                  # Project documentation
│   ├── api/               # API documentation
│   ├── game-design/       # Game design documents
│   └── data-sources/      # NASA data documentation
├── tests/                 # Test suites
├── docker/                # Docker configuration
├── .github/               # GitHub workflows
├── README.md
├── TODO.md
└── package.json
```

### 🚀 Getting Started

#### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (v13+)
- Git
- NASA Earthdata Login Account

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nasa-farm-navigators.git
   cd nasa-farm-navigators
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client && npm install
   
   # Install server dependencies
   cd ../server && npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb nasa_farm_navigators
   
   # Run migrations
   cd server && npm run migrate
   ```

5. **Start Development Servers**
   ```bash
   # Start both client and server
   npm run dev
   
   # Or start individually
   npm run client  # Frontend on http://localhost:3000
   npm run server  # Backend on http://localhost:5000
   ```

### 🧪 Testing

```bash
# Run all tests
npm test

# Run client tests
npm run test:client

# Run server tests
npm run test:server

# Run with coverage
npm run test:coverage
```

### 📦 Deployment

#### Production Build
```bash
# Build client for production
npm run build

# Start production server
npm start
```

#### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- **NASA** for providing open access to Earth observation data
- **NASA Space Apps Challenge** for inspiring innovative solutions
- **Agricultural Community** for continuous feedback and support
- **Open Source Contributors** for making this project possible

### 📞 Contact

- **Project Team**: [Your Team Name]
- **Email**: [your-email@example.com]
- **Website**: [https://your-website.com]
- **NASA Space Apps**: [Challenge Page Link]

### 🔗 Useful Links

- [NASA Earthdata](https://earthdata.nasa.gov/)
- [NASA Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/)
- [USGS EarthExplorer](https://earthexplorer.usgs.gov/)
- [NASA Space Apps Challenge](https://spaceappschallenge.org/)

---

**Made with 💚 for sustainable agriculture and space technology**