# NASA Farm Navigators - Project Setup Script
# Run this script to initialize the complete project structure

Write-Host "🚀 Initializing NASA Farm Navigators Project Structure..." -ForegroundColor Green

# Create main project directories
Write-Host "📁 Creating directory structure..." -ForegroundColor Yellow

$directories = @(
    "client\src\components\common",
    "client\src\components\game",
    "client\src\components\ui",
    "client\src\pages\auth",
    "client\src\pages\game",
    "client\src\pages\dashboard",
    "client\src\hooks",
    "client\src\utils\nasa-data",
    "client\src\utils\game-logic",
    "client\src\services\api",
    "client\src\services\nasa",
    "client\src\store\slices",
    "client\src\assets\images",
    "client\src\assets\icons",
    "client\src\styles",
    "client\public\data",
    "server\src\controllers",
    "server\src\models",
    "server\src\services\nasa",
    "server\src\services\game",
    "server\src\middleware",
    "server\src\utils",
    "server\src\routes",
    "server\config",
    "server\prisma",
    "data\scripts\nasa-fetch",
    "data\scripts\processing",
    "data\schemas",
    "data\cache\satellite",
    "data\cache\weather",
    "data\cache\climate",
    "docs\api",
    "docs\game-design",
    "docs\data-sources",
    "docs\deployment",
    "tests\client\components",
    "tests\client\utils",
    "tests\server\controllers",
    "tests\server\services",
    "tests\integration",
    "tests\e2e",
    "docker",
    ".github\workflows",
    ".github\ISSUE_TEMPLATE",
    ".vscode"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $PWD $dir
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "✅ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Already exists: $dir" -ForegroundColor Yellow
    }
}

# Create initial configuration files
Write-Host "📄 Creating configuration files..." -ForegroundColor Yellow

$configFiles = @{
    ".gitignore" = @"
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# NASA data cache
data/cache/*
!data/cache/.gitkeep

# Prisma generated files
prisma/generated/

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log
"@

    ".env.example" = @"
# NASA API Configuration
NASA_EARTHDATA_USERNAME=your_username
NASA_EARTHDATA_PASSWORD=your_password
NASA_API_KEY=your_api_key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/nasa_farm_navigators
DATABASE_TEST_URL=postgresql://username:password@localhost:5432/nasa_farm_navigators_test

# Application Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379

# External APIs
WEATHER_API_KEY=your_weather_api_key
USGS_API_KEY=your_usgs_api_key
"@

    "package.json" = @"
{
  "name": "nasa-farm-navigators",
  "version": "1.0.0",
  "description": "Educational agricultural game using NASA data",
  "main": "index.js",
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "client": "cd client && npm start",
    "server": "cd server && npm run dev",
    "client:dev": "cd client && npm start",
    "server:dev": "cd server && npm run dev",
    "build": "cd client && npm run build",
    "test": "npm run test:client && npm run test:server",
    "test:client": "cd client && npm test",
    "test:server": "cd server && npm test",
    "test:coverage": "cd server && npm run test:coverage",
    "lint": "npm run lint:client && npm run lint:server",
    "lint:client": "cd client && npm run lint",
    "lint:server": "cd server && npm run lint",
    "setup": "npm install && cd client && npm install && cd ../server && npm install",
    "db:migrate": "cd server && npx prisma migrate dev",
    "db:seed": "cd server && npx prisma db seed",
    "db:studio": "cd server && npx prisma studio"
  },
  "keywords": [
    "nasa",
    "agriculture",
    "educational-game",
    "sustainability",
    "space-apps-challenge"
  ],
  "author": "Your Team Name",
  "license": "MIT",
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
"@

    "docker-compose.yml" = @"
version: '3.8'

services:
  postgres:
    image: postgis/postgis:14-3.2
    environment:
      POSTGRES_DB: nasa_farm_navigators
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/nasa_farm_navigators
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./server:/app
      - /app/node_modules

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - server
    volumes:
      - ./client:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
"@

    ".vscode\settings.json" = @"
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["client", "server"],
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "css",
    "*.scss": "scss"
  }
}
"@

    ".vscode\extensions.json" = @"
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "prisma.prisma",
    "ms-vscode.vscode-docker",
    "ms-python.python",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-github-issue-notebooks"
  ]
}
"@

    ".github\workflows\ci.yml" = @"
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgis/postgis:14-3.2
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: nasa_farm_navigators_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd client && npm ci
          cd ../server && npm ci
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/nasa_farm_navigators_test
      
      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      # Add deployment steps here
"@
}

foreach ($file in $configFiles.Keys) {
    $fullPath = Join-Path $PWD $file
    if (!(Test-Path $fullPath)) {
        $configFiles[$file] | Out-File -FilePath $fullPath -Encoding UTF8
        Write-Host "✅ Created: $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Already exists: $file" -ForegroundColor Yellow
    }
}

# Create placeholder files
Write-Host "📝 Creating placeholder files..." -ForegroundColor Yellow

$placeholderFiles = @(
    "data\cache\.gitkeep",
    "docs\api\README.md",
    "docs\game-design\README.md", 
    "docs\data-sources\README.md",
    "tests\.gitkeep"
)

foreach ($file in $placeholderFiles) {
    $fullPath = Join-Path $PWD $file
    if (!(Test-Path $fullPath)) {
        "# Placeholder file" | Out-File -FilePath $fullPath -Encoding UTF8
        Write-Host "✅ Created: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🎉 Project structure initialization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm run setup' to install all dependencies" -ForegroundColor White
Write-Host "2. Copy .env.example to .env and configure your settings" -ForegroundColor White
Write-Host "3. Setup PostgreSQL database" -ForegroundColor White
Write-Host "4. Create your NASA Earthdata account" -ForegroundColor White
Write-Host "5. Start development with 'npm run dev'" -ForegroundColor White
Write-Host ""
Write-Host "📚 Check QUICK_START.md for detailed setup instructions" -ForegroundColor Yellow