"""Game mechanics endpoints."""

from typing import List
import json
from datetime import datetime


# Define challenges
CHALLENGES = [
    {
        "id": "1",
        "title": "Plant 5 Crops",
        "description": "Plant your first 5 crops on the farm",
        "target": 5,
        "reward_xp": 50,
        "reward_coins": 100,
        "challenge_type": "plant"
    },
    {
        "id": "2",
        "title": "Water Master",
        "description": "Water crops 10 times",
        "target": 10,
        "reward_xp": 30,
        "reward_coins": 50,
        "challenge_type": "water"
    },
    {
        "id": "3",
        "title": "Harvest Time",
        "description": "Harvest 3 fully grown crops",
        "target": 3,
        "reward_xp": 100,
        "reward_coins": 200,
        "challenge_type": "harvest"
    },
    {
        "id": "4",
        "title": "NASA Explorer",
        "description": "Check NASA weather data",
        "target": 1,
        "reward_xp": 75,
        "reward_coins": 150,
        "challenge_type": "nasa_check"
    },
]

# Define achievements
ACHIEVEMENTS = [
    {"id": "1", "title": "🌱 Beginner Farmer", "description": "Plant your first crop", "icon": "🌱"},
    {"id": "2", "title": "💧 Water Saver", "description": "Water 50 crops", "icon": "💧"},
    {"id": "3", "title": "🚀 NASA Explorer", "description": "Use NASA data for farming", "icon": "🚀"},
    {"id": "4", "title": "🏆 Master Farmer", "description": "Reach level 10", "icon": "🏆"},
    {"id": "5", "title": "💰 Wealthy Farmer", "description": "Earn 1000 coins", "icon": "💰"},
    {"id": "6", "title": "🔥 Streak Champion", "description": "Maintain a 7-day streak", "icon": "🔥"},
]


def calculate_level(xp: int) -> int:
    """Calculate level from XP (100 XP per level)."""
    return (xp // 100) + 1


def get_action_rewards(action: str) -> tuple[int, int]:
    """Get XP and coins for an action."""
    rewards = {
        "plant": (10, -10),  # XP, coins (negative = cost)
        "water": (5, 2),
        "fertilize": (8, -10),
        "harvest": (50, 100),
    }
    return rewards.get(action, (0, 0))


def update_challenge_progress(conn, user_id: int, action: str, amount: int = 1):
    """Update challenge progress for user."""
    cursor = conn.cursor()
    
    # Find challenges matching this action type
    matching_challenges = [c for c in CHALLENGES if c["challenge_type"] == action]
    
    for challenge in matching_challenges:
        # Check if challenge exists for user
        cursor.execute(
            "SELECT progress, completed FROM user_challenges WHERE user_id = ? AND challenge_id = ?",
            (user_id, challenge["id"])
        )
        result = cursor.fetchone()
        
        if result is None:
            # Create challenge entry
            cursor.execute(
                "INSERT INTO user_challenges (user_id, challenge_id, progress) VALUES (?, ?, ?)",
                (user_id, challenge["id"], min(amount, challenge["target"]))
            )
        elif not result[1]:  # Not completed
            new_progress = min(result[0] + amount, challenge["target"])
            completed = new_progress >= challenge["target"]
            
            if completed:
                cursor.execute(
                    "UPDATE user_challenges SET progress = ?, completed = 1, completed_at = ? WHERE user_id = ? AND challenge_id = ?",
                    (new_progress, datetime.now().isoformat(), user_id, challenge["id"])
                )
                # Award challenge rewards
                return challenge["reward_xp"], challenge["reward_coins"]
            else:
                cursor.execute(
                    "UPDATE user_challenges SET progress = ? WHERE user_id = ? AND challenge_id = ?",
                    (new_progress, user_id, challenge["id"])
                )
    
    conn.commit()
    return 0, 0


def check_and_unlock_achievements(conn, user_id: int, stats: dict):
    """Check and unlock achievements based on stats."""
    cursor = conn.cursor()
    
    unlocked = []
    
    # Achievement 1: Plant first crop
    if stats.get("total_plants", 0) >= 1:
        cursor.execute(
            "INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)",
            (user_id, "1", datetime.now().isoformat())
        )
        if cursor.rowcount > 0:
            unlocked.append("1")
    
    # Achievement 2: Water 50 crops
    if stats.get("total_waters", 0) >= 50:
        cursor.execute(
            "INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)",
            (user_id, "2", datetime.now().isoformat())
        )
        if cursor.rowcount > 0:
            unlocked.append("2")
    
    # Achievement 4: Reach level 10
    if stats.get("level", 1) >= 10:
        cursor.execute(
            "INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)",
            (user_id, "4", datetime.now().isoformat())
        )
        if cursor.rowcount > 0:
            unlocked.append("4")
    
    # Achievement 5: Earn 1000 coins
    if stats.get("coins", 0) >= 1000:
        cursor.execute(
            "INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)",
            (user_id, "5", datetime.now().isoformat())
        )
        if cursor.rowcount > 0:
            unlocked.append("5")
    
    conn.commit()
    return unlocked
