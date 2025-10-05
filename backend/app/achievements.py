"""
Achievements System for FasalSeva
Tracks and manages user achievements based on farming activities
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import sqlite3
from .database import get_db_connection

class Achievement:
    def __init__(self, id: str, title: str, description: str, icon: str, 
                 unlock_condition: Dict[str, Any], reward_xp: int = 0, reward_coins: int = 0):
        self.id = id
        self.title = title
        self.description = description
        self.icon = icon
        self.unlock_condition = unlock_condition
        self.reward_xp = reward_xp
        self.reward_coins = reward_coins

class AchievementsService:
    def __init__(self):
        self.achievements_definitions = self._initialize_achievements()
        self._ensure_achievements_table()
    
    def _ensure_achievements_table(self):
        """Create achievements table if it doesn't exist"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_achievements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    achievement_id TEXT NOT NULL,
                    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, achievement_id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            conn.commit()
    
    def _initialize_achievements(self) -> List[Achievement]:
        """Define all available achievements"""
        return [
            # Beginner Achievements
            Achievement(
                id="first_plant",
                title="Green Thumb",
                description="Plant your first crop",
                icon="🌱",
                unlock_condition={"action": "plant", "count": 1},
                reward_xp=50,
                reward_coins=25
            ),
            Achievement(
                id="first_water",
                title="Hydration Hero",
                description="Water a plant for the first time",
                icon="💧",
                unlock_condition={"action": "water", "count": 1},
                reward_xp=25,
                reward_coins=10
            ),
            Achievement(
                id="first_fertilize",
                title="Nutrition Expert",
                description="Fertilize a plant for the first time",
                icon="🌿",
                unlock_condition={"action": "fertilize", "count": 1},
                reward_xp=35,
                reward_coins=15
            ),
            Achievement(
                id="first_harvest",
                title="Harvest Master",
                description="Complete your first harvest",
                icon="🌾",
                unlock_condition={"action": "harvest", "count": 1},
                reward_xp=100,
                reward_coins=50
            ),
            
            # Quantity Achievements
            Achievement(
                id="plant_collector",
                title="Plant Collector",
                description="Plant 10 different crops",
                icon="🌻",
                unlock_condition={"action": "plant", "count": 10},
                reward_xp=200,
                reward_coins=100
            ),
            Achievement(
                id="water_master",
                title="Water Master",
                description="Water plants 50 times",
                icon="🚿",
                unlock_condition={"action": "water", "count": 50},
                reward_xp=300,
                reward_coins=150
            ),
            Achievement(
                id="fertilizer_expert",
                title="Fertilizer Expert",
                description="Use fertilizer 25 times",
                icon="🧪",
                unlock_condition={"action": "fertilize", "count": 25},
                reward_xp=250,
                reward_coins=125
            ),
            Achievement(
                id="harvest_champion",
                title="Harvest Champion",
                description="Complete 20 successful harvests",
                icon="🏆",
                unlock_condition={"action": "harvest", "count": 20},
                reward_xp=500,
                reward_coins=250
            ),
            
            # Consistency Achievements
            Achievement(
                id="daily_farmer",
                title="Daily Farmer",
                description="Farm for 7 consecutive days",
                icon="📅",
                unlock_condition={"type": "streak", "days": 7},
                reward_xp=300,
                reward_coins=150
            ),
            Achievement(
                id="dedicated_grower",
                title="Dedicated Grower",
                description="Farm for 30 consecutive days",
                icon="🗓️",
                unlock_condition={"type": "streak", "days": 30},
                reward_xp=1000,
                reward_coins=500
            ),
            
            # Special Achievements
            Achievement(
                id="efficient_farmer",
                title="Efficient Farmer",
                description="Complete 5 perfect care sessions (95%+ efficiency)",
                icon="⭐",
                unlock_condition={"type": "efficiency", "perfect_sessions": 5},
                reward_xp=400,
                reward_coins=200
            ),
            Achievement(
                id="sustainability_advocate",
                title="Sustainability Advocate",
                description="Use organic fertilizer 15 times",
                icon="♻️",
                unlock_condition={"action": "fertilize", "quality": "organic", "count": 15},
                reward_xp=350,
                reward_coins=175
            ),
            Achievement(
                id="premium_grower",
                title="Premium Grower",
                description="Use premium care products 10 times",
                icon="💎",
                unlock_condition={"type": "premium_usage", "count": 10},
                reward_xp=600,
                reward_coins=300
            ),
            
            # Milestone Achievements
            Achievement(
                id="coin_collector",
                title="Coin Collector",
                description="Earn 1000 coins total",
                icon="🪙",
                unlock_condition={"type": "total_coins", "amount": 1000},
                reward_xp=200,
                reward_coins=100
            ),
            Achievement(
                id="experience_master",
                title="Experience Master",
                description="Earn 2000 XP total",
                icon="📈",
                unlock_condition={"type": "total_xp", "amount": 2000},
                reward_xp=300,
                reward_coins=150
            ),
            Achievement(
                id="level_five",
                title="Seasoned Farmer",
                description="Reach level 5",
                icon="🌟",
                unlock_condition={"type": "level", "level": 5},
                reward_xp=500,
                reward_coins=250
            ),
            Achievement(
                id="level_ten",
                title="Expert Cultivator",
                description="Reach level 10",
                icon="🏅",
                unlock_condition={"type": "level", "level": 10},
                reward_xp=1000,
                reward_coins=500
            ),
        ]
    
    def get_user_achievements(self, user_id: int) -> Dict[str, Any]:
        """Get all achievements for a user with unlock status"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get unlocked achievements
            cursor.execute("""
                SELECT achievement_id, unlocked_at 
                FROM user_achievements 
                WHERE user_id = ?
            """, (user_id,))
            
            unlocked = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Build achievements list
            achievements = []
            for achievement_def in self.achievements_definitions:
                is_unlocked = achievement_def.id in unlocked
                unlocked_at = unlocked.get(achievement_def.id) if is_unlocked else None
                
                achievements.append({
                    "id": achievement_def.id,
                    "title": achievement_def.title,
                    "description": achievement_def.description,
                    "icon": achievement_def.icon,
                    "unlocked": is_unlocked,
                    "unlocked_at": unlocked_at,
                    "reward_xp": achievement_def.reward_xp,
                    "reward_coins": achievement_def.reward_coins,
                    "progress": self._get_achievement_progress(user_id, achievement_def) if not is_unlocked else 100
                })
            
            unlocked_count = len(unlocked)
            total_count = len(self.achievements_definitions)
            
            return {
                "achievements": achievements,
                "summary": {
                    "unlocked_count": unlocked_count,
                    "total_count": total_count,
                    "completion_percentage": (unlocked_count / total_count * 100) if total_count > 0 else 0
                }
            }
    
    def _get_achievement_progress(self, user_id: int, achievement: Achievement) -> int:
        """Calculate progress percentage for an achievement"""
        condition = achievement.unlock_condition
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            if condition.get("action"):
                # Count specific actions
                action_type = condition["action"]
                target_count = condition["count"]
                
                # Check for quality-specific conditions
                if condition.get("quality"):
                    cursor.execute("""
                        SELECT COUNT(*) FROM crop_care_log 
                        WHERE user_id = ? AND action_type = ? AND quality_level = ?
                    """, (user_id, action_type, condition["quality"]))
                else:
                    cursor.execute("""
                        SELECT COUNT(*) FROM crop_care_log 
                        WHERE user_id = ? AND action_type = ?
                    """, (user_id, action_type))
                
                current_count = cursor.fetchone()[0]
                return min(int((current_count / target_count) * 100), 100)
            
            elif condition.get("type") == "streak":
                # Check streak achievements
                target_days = condition["days"]
                # Get current streak from user_stats with fallback
                try:
                    cursor.execute("SELECT current_streak FROM user_stats WHERE user_id = ?", (user_id,))
                    result = cursor.fetchone()
                    current_streak = result[0] if result else 0
                except Exception as e:
                    # Handle missing column gracefully
                    print(f"Warning: current_streak column not found, defaulting to 0: {e}")
                    current_streak = 0
                return min(int((current_streak / target_days) * 100), 100)
            
            elif condition.get("type") == "total_coins":
                # Check total coins earned
                target_amount = condition["amount"]
                cursor.execute("SELECT coins FROM users WHERE id = ?", (user_id,))
                result = cursor.fetchone()
                current_coins = result[0] if result else 0
                return min(int((current_coins / target_amount) * 100), 100)
            
            elif condition.get("type") == "total_xp":
                # Check total XP earned
                target_amount = condition["amount"]
                cursor.execute("SELECT xp FROM users WHERE id = ?", (user_id,))
                result = cursor.fetchone()
                current_xp = result[0] if result else 0
                return min(int((current_xp / target_amount) * 100), 100)
            
            elif condition.get("type") == "level":
                # Check user level
                target_level = condition["level"]
                cursor.execute("SELECT level FROM users WHERE id = ?", (user_id,))
                result = cursor.fetchone()
                current_level = result[0] if result else 1
                return 100 if current_level >= target_level else int((current_level / target_level) * 100)
            
            elif condition.get("type") == "premium_usage":
                # Count premium product usage
                target_count = condition["count"]
                cursor.execute("""
                    SELECT COUNT(*) FROM crop_care_log 
                    WHERE user_id = ? AND (quality_level LIKE '%premium%' OR quality_level LIKE '%expert%')
                """, (user_id,))
                current_count = cursor.fetchone()[0]
                return min(int((current_count / target_count) * 100), 100)
            
            elif condition.get("type") == "efficiency":
                # Count perfect efficiency sessions
                target_count = condition["perfect_sessions"]
                cursor.execute("""
                    SELECT COUNT(*) FROM crop_care_log 
                    WHERE user_id = ? AND efficiency_score >= 95
                """, (user_id,))
                current_count = cursor.fetchone()[0]
                return min(int((current_count / target_count) * 100), 100)
        
        return 0
    
    def check_achievements(self, user_id: int) -> List[Dict[str, Any]]:
        """Check for newly unlocked achievements and return them"""
        newly_unlocked = []
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get already unlocked achievements
            cursor.execute("""
                SELECT achievement_id FROM user_achievements WHERE user_id = ?
            """, (user_id,))
            unlocked_ids = {row[0] for row in cursor.fetchall()}
            
            # Check each achievement
            for achievement in self.achievements_definitions:
                if achievement.id in unlocked_ids:
                    continue  # Already unlocked
                
                progress = self._get_achievement_progress(user_id, achievement)
                
                if progress >= 100:  # Achievement unlocked!
                    # Record the unlock
                    cursor.execute("""
                        INSERT OR IGNORE INTO user_achievements (user_id, achievement_id)
                        VALUES (?, ?)
                    """, (user_id, achievement.id))
                    
                    # Award rewards
                    if achievement.reward_xp > 0 or achievement.reward_coins > 0:
                        cursor.execute("""
                            UPDATE users 
                            SET xp = COALESCE(xp, 0) + ?, 
                                coins = COALESCE(coins, 0) + ?
                            WHERE id = ?
                        """, (achievement.reward_xp, achievement.reward_coins, user_id))
                    
                    newly_unlocked.append({
                        "id": achievement.id,
                        "title": achievement.title,
                        "description": achievement.description,
                        "icon": achievement.icon,
                        "reward_xp": achievement.reward_xp,
                        "reward_coins": achievement.reward_coins
                    })
            
            conn.commit()
        
        return newly_unlocked
    
    def get_achievement_stats(self, user_id: int) -> Dict[str, Any]:
        """Get achievement statistics for a user"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Count unlocked achievements
            cursor.execute("""
                SELECT COUNT(*) FROM user_achievements WHERE user_id = ?
            """, (user_id,))
            unlocked_count = cursor.fetchone()[0]
            
            # Get recent unlocks
            cursor.execute("""
                SELECT achievement_id, unlocked_at 
                FROM user_achievements 
                WHERE user_id = ? 
                ORDER BY unlocked_at DESC 
                LIMIT 3
            """, (user_id,))
            recent_unlocks = cursor.fetchall()
            
            total_count = len(self.achievements_definitions)
            completion_percentage = (unlocked_count / total_count * 100) if total_count > 0 else 0
            
            # Calculate total rewards earned from achievements
            total_achievement_xp = 0
            total_achievement_coins = 0
            
            cursor.execute("""
                SELECT achievement_id FROM user_achievements WHERE user_id = ?
            """, (user_id,))
            unlocked_ids = {row[0] for row in cursor.fetchall()}
            
            for achievement in self.achievements_definitions:
                if achievement.id in unlocked_ids:
                    total_achievement_xp += achievement.reward_xp
                    total_achievement_coins += achievement.reward_coins
            
            return {
                "unlocked_count": unlocked_count,
                "total_count": total_count,
                "completion_percentage": round(completion_percentage, 1),
                "recent_unlocks": recent_unlocks,
                "total_achievement_xp": total_achievement_xp,
                "total_achievement_coins": total_achievement_coins
            }