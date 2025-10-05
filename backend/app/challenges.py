from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json

class ChallengesService:
    def __init__(self, db):
        self.db = db

    def get_user_challenges(self, user_id: int) -> Dict[str, Any]:
        """Get all challenges for a specific user with progress tracking"""
        try:
            # Get user's current stats for challenge progress calculation
            user_stats = self._get_user_stats(user_id)
            
            # Get active challenges
            active_challenges = self._get_active_challenges(user_id, user_stats)
            
            # Get completed challenges
            completed_challenges = self._get_completed_challenges(user_id)
            
            # Get weekly/daily challenges
            weekly_challenges = self._get_weekly_challenges(user_id, user_stats)
            daily_challenges = self._get_daily_challenges(user_id, user_stats)
            
            return {
                "active_challenges": active_challenges,
                "completed_challenges": completed_challenges,
                "weekly_challenges": weekly_challenges,
                "daily_challenges": daily_challenges,
                "user_stats": user_stats,
                "total_active": len(active_challenges),
                "total_completed": len(completed_challenges),
                "success": True
            }
        except Exception as e:
            print(f"Error getting user challenges: {e}")
            return {
                "active_challenges": [],
                "completed_challenges": [],
                "weekly_challenges": [],
                "daily_challenges": [],
                "user_stats": {},
                "total_active": 0,
                "total_completed": 0,
                "success": False,
                "error": str(e)
            }

    def _get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive user statistics for challenge calculations"""
        try:
            # Get activity counts from crop_care_log - handle missing table gracefully
            try:
                activity_query = """
                    SELECT 
                        COUNT(CASE WHEN action_type = 'plant' THEN 1 END) as total_plants,
                        COUNT(CASE WHEN action_type = 'water' THEN 1 END) as total_waters,
                        COUNT(CASE WHEN action_type = 'fertilize' THEN 1 END) as total_fertilizes,
                        COUNT(CASE WHEN action_type = 'harvest' THEN 1 END) as total_harvests,
                        COUNT(*) as total_activities
                    FROM crop_care_log 
                    WHERE user_id = ?
                """
                cursor = self.db.execute(activity_query, (user_id,))
                result = cursor.fetchone()
            except Exception as e:
                print(f"crop_care_log table not found, using fallback stats: {e}")
                # Fallback to user_stats table or default values
                try:
                    fallback_query = """
                        SELECT total_plants, total_waters, total_fertilizes, total_harvests, 
                               (total_plants + total_waters + total_fertilizes + total_harvests) as total_activities
                        FROM user_stats 
                        WHERE user_id = ?
                    """
                    cursor = self.db.execute(fallback_query, (user_id,))
                    result = cursor.fetchone()
                    if not result:
                        result = (0, 0, 0, 0, 0)  # Default values
                except Exception:
                    result = (0, 0, 0, 0, 0)  # Default values
            
            # Get streak information
            streak_data = self._calculate_user_streaks(user_id)
            
            # Get user level and XP - handle missing columns gracefully
            try:
                user_progress_query = """
                    SELECT level, total_xp, coins 
                    FROM users 
                    WHERE id = ?
                """
                cursor = self.db.execute(user_progress_query, (user_id,))
                user_progress = cursor.fetchone()
            except Exception:
                # Fallback for databases without level/total_xp columns
                user_progress_query = """
                    SELECT coins 
                    FROM users 
                    WHERE id = ?
                """
                cursor = self.db.execute(user_progress_query, (user_id,))
                result = cursor.fetchone()
                user_progress = (1, 0, result[0] if result else 0)  # level, total_xp, coins
            
            return {
                "total_plants": result[0] if result else 0,
                "total_waters": result[1] if result else 0,
                "total_fertilizes": result[2] if result else 0,
                "total_harvests": result[3] if result else 0,
                "total_activities": result[4] if result else 0,
                "current_streak": streak_data.get("current_streak", 0),
                "longest_streak": streak_data.get("longest_streak", 0),
                "level": user_progress[0] if user_progress else 1,
                "total_xp": user_progress[1] if user_progress else 0,
                "coins": user_progress[2] if user_progress else 0,
            }
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {}

    def _calculate_user_streaks(self, user_id: int) -> Dict[str, int]:
        """Calculate user's activity streaks"""
        try:
            # Get daily activity for streak calculation - handle missing table gracefully
            try:
                streak_query = """
                    SELECT DATE(created_at) as activity_date
                    FROM crop_care_log 
                    WHERE user_id = ? 
                    ORDER BY activity_date DESC
                """
                cursor = self.db.execute(streak_query, (user_id,))
                results = cursor.fetchall()
            except Exception as e:
                print(f"Error accessing crop_care_log for streaks: {e}")
                # Fallback - no streak data available
                results = []
            
            if not results:
                return {"current_streak": 0, "longest_streak": 0}
            
            dates = [row[0] for row in results]
            unique_dates = sorted(set(dates), reverse=True)
            
            # Calculate current streak
            current_streak = 0
            today = datetime.now().date()
            
            for i, date in enumerate(unique_dates):
                if isinstance(date, str):
                    date = datetime.strptime(date, '%Y-%m-%d').date()
                
                expected_date = today - timedelta(days=i)
                if date == expected_date:
                    current_streak += 1
                else:
                    break
            
            # Calculate longest streak
            longest_streak = 0
            temp_streak = 1
            
            for i in range(1, len(unique_dates)):
                prev_date = unique_dates[i-1]
                curr_date = unique_dates[i]
                
                if isinstance(prev_date, str):
                    prev_date = datetime.strptime(prev_date, '%Y-%m-%d').date()
                if isinstance(curr_date, str):
                    curr_date = datetime.strptime(curr_date, '%Y-%m-%d').date()
                
                if (prev_date - curr_date).days == 1:
                    temp_streak += 1
                else:
                    longest_streak = max(longest_streak, temp_streak)
                    temp_streak = 1
            
            longest_streak = max(longest_streak, temp_streak)
            
            return {
                "current_streak": current_streak,
                "longest_streak": longest_streak
            }
        except Exception as e:
            print(f"Error calculating streaks: {e}")
            return {"current_streak": 0, "longest_streak": 0}

    def _get_active_challenges(self, user_id: int, user_stats: Dict) -> List[Dict[str, Any]]:
        """Get active challenges based on user progress"""
        challenges = []
        
        # Plant Growth Challenge - make it easier to test  
        plant_target = 2  # Reduced target for easier testing
        plant_progress = min(user_stats.get("total_plants", 0), plant_target)
        challenges.append({
            "id": "plant_growth",
            "title": "Plant Growth Master", 
            "description": f"Plant {plant_target} crops to unlock farming expertise",
            "category": "farming",
            "type": "progress",
            "target": plant_target,
            "current": plant_progress,
            "progress": (plant_progress / plant_target) * 100,
            "reward_xp": 100,  # Reduced for testing
            "reward_coins": 50,  # Reduced for testing
            "icon": "leaf",
            "difficulty": "easy",  # Changed to easy
            "is_completed": plant_progress >= plant_target,
            "estimated_time": "Few minutes"
        })
        
        # Water Conservation Challenge
        water_target = 3  # Reduced for testing
        water_progress = min(user_stats.get("total_waters", 0), water_target)
        challenges.append({
            "id": "water_conservation",
            "title": "Water Conservation Expert",
            "description": f"Water plants {water_target} times efficiently",
            "category": "sustainability", 
            "type": "progress",
            "target": water_target,
            "current": water_progress,
            "progress": (water_progress / water_target) * 100,
            "reward_xp": 75,  # Reduced for testing
            "reward_coins": 25,  # Reduced for testing
            "icon": "water",
            "difficulty": "easy",
            "is_completed": water_progress >= water_target,
            "estimated_time": "Few activities"
        })
        
        # Harvest Success Challenge
        harvest_target = 5
        harvest_progress = min(user_stats.get("total_harvests", 0), harvest_target)
        challenges.append({
            "id": "harvest_success",
            "title": "Harvest Master",
            "description": f"Successfully harvest {harvest_target} crops",
            "category": "achievement",
            "type": "progress",
            "target": harvest_target,
            "current": harvest_progress,
            "progress": (harvest_progress / harvest_target) * 100,
            "reward_xp": 1000,
            "reward_coins": 200,
            "icon": "checkmark-circle",
            "difficulty": "hard",
            "is_completed": harvest_progress >= harvest_target,
            "estimated_time": "3-4 weeks"
        })
        
        # Activity Streak Challenge
        streak_target = 7
        streak_progress = min(user_stats.get("current_streak", 0), streak_target)
        challenges.append({
            "id": "activity_streak",
            "title": "Consistency Champion",
            "description": f"Maintain {streak_target} day activity streak",
            "category": "consistency",
            "type": "streak",
            "target": streak_target,
            "current": streak_progress,
            "progress": (streak_progress / streak_target) * 100,
            "reward_xp": 800,
            "reward_coins": 300,
            "icon": "flash",
            "difficulty": "medium",
            "is_completed": streak_progress >= streak_target,
            "estimated_time": "1 week"
        })
        
        return [c for c in challenges if not c["is_completed"]]

    def _get_completed_challenges(self, user_id: int) -> List[Dict[str, Any]]:
        """Get completed challenges for the user"""
        # This would typically come from a challenges completion table
        # For now, we'll return sample completed challenges
        return [
            {
                "id": "first_plant",
                "title": "First Steps",
                "description": "Plant your first crop",
                "category": "beginner",
                "completed_date": "2024-10-01",
                "reward_xp": 100,
                "reward_coins": 50,
                "icon": "seedling"
            }
        ]

    def _get_weekly_challenges(self, user_id: int, user_stats: Dict) -> List[Dict[str, Any]]:
        """Get weekly challenges"""
        # Calculate week start (Monday)
        today = datetime.now().date()
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        
        # Get this week's activity - handle missing table gracefully  
        try:
            week_activity_query = """
                SELECT COUNT(*) 
                FROM crop_care_log 
                WHERE user_id = ? 
                AND DATE(created_at) >= ?
            """
            cursor = self.db.execute(week_activity_query, (user_id, week_start))
            result = cursor.fetchone()
            week_activity = result[0] if result else 0
        except Exception as e:
            print(f"Error getting weekly activity: {e}")
            week_activity = 0
        
        weekly_target = 15
        return [{
            "id": "weekly_activity",
            "title": "Weekly Activity Goal",
            "description": f"Complete {weekly_target} farming activities this week",
            "category": "weekly",
            "type": "weekly",
            "target": weekly_target,
            "current": week_activity,
            "progress": min((week_activity / weekly_target) * 100, 100),
            "reward_xp": 300,
            "reward_coins": 75,
            "icon": "calendar",
            "deadline": (week_start + timedelta(days=6)).isoformat(),
            "is_completed": week_activity >= weekly_target
        }]

    def _get_daily_challenges(self, user_id: int, user_stats: Dict) -> List[Dict[str, Any]]:
        """Get daily challenges"""
        today = datetime.now().date()
        
        # Get today's activity - handle missing table gracefully
        try:
            daily_activity_query = """
                SELECT COUNT(*) 
                FROM crop_care_log 
                WHERE user_id = ? 
                AND DATE(created_at) = ?
            """
            cursor = self.db.execute(daily_activity_query, (user_id, today))
            result = cursor.fetchone()
            daily_activity = result[0] if result else 0
        except Exception as e:
            print(f"Error getting daily activity: {e}")
            daily_activity = 0
        
        daily_target = 3
        return [{
            "id": "daily_activity",
            "title": "Daily Farm Check",
            "description": f"Complete {daily_target} farming activities today",
            "category": "daily",
            "type": "daily",
            "target": daily_target,
            "current": daily_activity,
            "progress": min((daily_activity / daily_target) * 100, 100),
            "reward_xp": 100,
            "reward_coins": 25,
            "icon": "sunny",
            "deadline": today.isoformat(),
            "is_completed": daily_activity >= daily_target
        }]

    def complete_challenge(self, user_id: int, challenge_id: str) -> Dict[str, Any]:
        """Mark a challenge as completed and award rewards"""
        try:
            # Get challenge details
            challenges_data = self.get_user_challenges(user_id)
            
            # Find the challenge
            challenge = None
            for challenge_list in [challenges_data["active_challenges"], 
                                 challenges_data["weekly_challenges"], 
                                 challenges_data["daily_challenges"]]:
                for c in challenge_list:
                    if c["id"] == challenge_id and c["is_completed"]:
                        challenge = c
                        break
                if challenge:
                    break
            
            if not challenge:
                return {"success": False, "error": "Challenge not found or not completed"}
            
            # Award rewards - handle missing columns gracefully
            try:
                reward_query = """
                    UPDATE users 
                    SET total_xp = total_xp + ?, 
                        coins = coins + ?,
                        level = CASE 
                            WHEN (total_xp + ?) >= level * 100 THEN level + 1 
                            ELSE level 
                        END
                    WHERE id = ?
                """
                
                self.db.execute(reward_query, (
                    challenge["reward_xp"],
                    challenge["reward_coins"],
                    challenge["reward_xp"],
                    user_id
                ))
            except Exception as e:
                print(f"Error updating user rewards (missing columns?): {e}")
                # Fallback - just update coins if other columns don't exist
                try:
                    fallback_query = """
                        UPDATE users 
                        SET coins = coins + ?
                        WHERE id = ?
                    """
                    self.db.execute(fallback_query, (challenge["reward_coins"], user_id))
                except Exception as e2:
                    print(f"Error updating coins: {e2}")
                    return {"success": False, "error": "Failed to award rewards"}
            
            # Record challenge completion (you'd want a challenges_completed table)
            self.db.commit()
            
            return {
                "success": True,
                "challenge": challenge,
                "rewards": {
                    "xp": challenge["reward_xp"],
                    "coins": challenge["reward_coins"]
                }
            }
            
        except Exception as e:
            self.db.rollback()
            print(f"Error completing challenge: {e}")
            return {"success": False, "error": str(e)}