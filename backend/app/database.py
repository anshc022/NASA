"""Database setup and models for user authentication."""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

DATABASE_PATH = Path(__file__).parent.parent / "fasal_seva.db"


class DatabaseSession:
    """Simple database session wrapper for SQLite."""
    def __init__(self):
        self.conn = sqlite3.connect(DATABASE_PATH)
        self.conn.row_factory = sqlite3.Row  # Enable row access by column name
    
    def execute(self, query, params=None):
        """Execute a query with parameters."""
        cursor = self.conn.cursor()
        if params:
            return cursor.execute(query, params)
        return cursor.execute(query)
    
    def fetchone(self):
        """Fetch one result."""
        return self.conn.cursor().fetchone()
    
    def fetchall(self):
        """Fetch all results."""
        return self.conn.cursor().fetchall()
    
    def commit(self):
        """Commit changes."""
        self.conn.commit()
    
    def rollback(self):
        """Rollback changes."""
        self.conn.rollback()
    
    def close(self):
        """Close connection."""
        self.conn.close()


def get_db_session():
    """Get a database session."""
    return DatabaseSession()


def init_db():
    """Initialize the SQLite database with users table."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            language TEXT DEFAULT 'en',
            coins INTEGER DEFAULT 0,
            welcome_bonus_claimed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    """)
    
    # Create user_farms table for storing farm data
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_farms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            farm_name TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            crop_type TEXT,
            farm_size TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Create farm_state table for game state
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farm_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            crops_json TEXT DEFAULT '[]',
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            coins INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES user_farms (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(farm_id)
        )
    """)

    # Ensure new user columns exist for legacy databases
    cursor.execute("PRAGMA table_info(users)")
    user_columns = {row[1] for row in cursor.fetchall()}
    if "coins" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0")
    if "welcome_bonus_claimed" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN welcome_bonus_claimed INTEGER DEFAULT 0")
    if "level" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1")
    if "total_xp" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0")
    
    # Create user_challenges table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            challenge_id TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT 0,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, challenge_id)
        )
    """)
    
    # Create user_achievements table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_id TEXT NOT NULL,
            unlocked_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, achievement_id)
        )
    """)
    
    # Create user_stats table for leaderboard
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_stats (
            user_id INTEGER PRIMARY KEY,
            plants_count INTEGER DEFAULT 0,
            waters_count INTEGER DEFAULT 0,
            fertilizes_count INTEGER DEFAULT 0,
            harvests_count INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            last_activity TIMESTAMP,
            total_plants INTEGER DEFAULT 0,
            total_waters INTEGER DEFAULT 0,
            total_fertilizes INTEGER DEFAULT 0,
            total_harvests INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Create crop_care_log table for activity tracking (needed for challenges)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crop_care_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            crop_id INTEGER,
            action_type TEXT NOT NULL,  -- 'plant', 'water', 'fertilize', 'harvest'
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            details TEXT,  -- JSON string for additional action details
            xp_earned INTEGER DEFAULT 0,
            coins_earned INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (crop_id) REFERENCES crops (id)
        )
    """)
    
    # Create crops table for interactive farm management
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            position_row INTEGER NOT NULL,
            position_col INTEGER NOT NULL,
            planted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            growth_stage REAL DEFAULT 0,
            water_level REAL DEFAULT 100,
            health REAL DEFAULT 100,
            fertilizer_level REAL DEFAULT 100,
            latitude REAL DEFAULT NULL,
            longitude REAL DEFAULT NULL,
            climate_bonus REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, position_row, position_col)
        )
    """)
    
    # Add location columns to existing crops table if they don't exist
    try:
        cursor.execute("ALTER TABLE crops ADD COLUMN latitude REAL DEFAULT NULL")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute("ALTER TABLE crops ADD COLUMN longitude REAL DEFAULT NULL")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute("ALTER TABLE crops ADD COLUMN climate_bonus REAL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Add missing columns to user_stats for achievements system
    try:
        cursor.execute("ALTER TABLE user_stats ADD COLUMN current_streak INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute("ALTER TABLE user_stats ADD COLUMN last_activity TIMESTAMP")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute("ALTER TABLE user_stats ADD COLUMN plants_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute("ALTER TABLE user_stats ADD COLUMN waters_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute("ALTER TABLE user_stats ADD COLUMN fertilizes_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute("ALTER TABLE user_stats ADD COLUMN harvests_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Create plant_scenarios table for active scenarios
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS plant_scenarios (
            id TEXT PRIMARY KEY,
            crop_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            scenario_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT NOT NULL,
            impact_description TEXT NOT NULL,
            nasa_data_trigger TEXT,  -- JSON string
            available_actions TEXT NOT NULL,  -- JSON string
            auto_resolve_time INTEGER,  -- hours until auto-resolve
            active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            resolution_action TEXT,
            FOREIGN KEY (crop_id) REFERENCES crops (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Create user_progress table for level system
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_progress (
            user_id INTEGER PRIMARY KEY,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            coins INTEGER DEFAULT 100,  -- Start with some coins
            total_scenarios_completed INTEGER DEFAULT 0,
            successful_harvests INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Create shop_items table for purchasable items
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shop_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            cost_coins INTEGER NOT NULL,
            category TEXT NOT NULL,
            effects TEXT,  -- JSON string
            available BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create user_purchases table for purchased items
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (item_id) REFERENCES shop_items (id)
        )
    """)
    
    # Insert default shop items
    cursor.execute("SELECT COUNT(*) FROM shop_items")
    if cursor.fetchone()[0] == 0:
        default_items = [
            ("water_efficient_sprinkler", "Water-Efficient Sprinkler", "Reduces water consumption by 25%", 150, "tools", '{"water_efficiency": 0.25}'),
            ("organic_fertilizer", "Organic Fertilizer", "Boosts growth rate by 20%", 100, "tools", '{"growth_bonus": 0.2}'),
            ("pest_resistant_seeds", "Pest-Resistant Seeds", "Reduces pest scenario probability by 30%", 200, "seeds", '{"pest_resistance": 0.3}'),
            ("weather_station", "Weather Station", "Early warning for weather scenarios", 300, "upgrades", '{"scenario_prediction": 1}'),
            ("solar_panels", "Solar Farm Panels", "Generate passive income", 500, "upgrades", '{"passive_income": 20}'),
            ("greenhouse", "Mini Greenhouse", "Protects crops from severe weather", 800, "upgrades", '{"weather_protection": 0.5}'),
        ]
        
        for item in default_items:
            cursor.execute("""
                INSERT OR IGNORE INTO shop_items (id, name, description, cost_coins, category, effects)
                VALUES (?, ?, ?, ?, ?, ?)
            """, item)

    # Create nasa_data table for caching NASA API responses
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS nasa_data (
            crop_id INTEGER PRIMARY KEY,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            temperature TEXT,  -- JSON string of temperature data
            precipitation TEXT,  -- JSON string of precipitation data
            solar_radiation TEXT,  -- JSON string of solar radiation data
            humidity TEXT,  -- JSON string of humidity data
            wind_speed TEXT,  -- JSON string of wind speed data
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (crop_id) REFERENCES crops (id)
        )
    """)

    # Create educational_content table for caching AI-generated content
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS educational_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content_hash TEXT NOT NULL,  -- Hash of user's plants/location for change detection
            facts_json TEXT NOT NULL,    -- JSON string of facts
            missions_json TEXT NOT NULL, -- JSON string of interactive missions
            insights_json TEXT NOT NULL, -- JSON string of climate insights
            tips_json TEXT NOT NULL,     -- JSON string of sustainability tips
            location_lat REAL NOT NULL,
            location_lon REAL NOT NULL,
            plant_count INTEGER NOT NULL,
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id)  -- One educational content record per user
        )
    """)

    # Create educational_progress table to track completed content
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS educational_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content_type TEXT NOT NULL,  -- 'fact', 'mission', 'tip'
            content_id TEXT NOT NULL,    -- ID from the educational content
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            xp_earned INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, content_type, content_id)
        )
    """)
    
    conn.commit()
    conn.close()
    try:
        print(f"Database initialized at: {DATABASE_PATH}")
    except Exception:
        # Fallback plain print without f-string to avoid any codec issues
        print("Database initialized.")


def get_db_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn


class UserDB:
    """Database operations for users."""
    
    @staticmethod
    def create_user(email: str, username: str, password_hash: str, 
                   full_name: Optional[str] = None, language: str = "en") -> Optional[int]:
        """Create a new user and return user_id."""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO users (email, username, password_hash, full_name, language) 
                   VALUES (?, ?, ?, ?, ?)""",
                (email.lower(), username.lower(), password_hash, full_name, language)
            )
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return user_id
        except sqlite3.IntegrityError:
            return None  # User already exists
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[dict]:
        """Get user by email."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email.lower(),))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[dict]:
        """Get user by username."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE LOWER(username) = ?", (username.lower(),))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None
    
    @staticmethod
    def update_last_login(user_id: int):
        """Update user's last login timestamp."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (datetime.now(), user_id)
        )
        conn.commit()
        conn.close()
    
    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[dict]:
        """Get user by ID."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        return dict(user) if user else None


# Initialize database on module import
init_db()
