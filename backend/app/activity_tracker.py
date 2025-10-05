"""
Activity tracking helper for challenges and achievements system
"""

from datetime import datetime
from typing import Optional, List, Dict, Any

def log_activity(user_id: int, action_type: str, xp_earned: int = 0, 
                coins_earned: int = 0, db_connection=None, **kwargs):
    """
    Log a user activity and check for achievements/challenges
    
    Args:
        user_id: User ID performing the action
        action_type: Type of action ('plant', 'water', 'fertilize', 'harvest')
        xp_earned: XP earned from this action
        coins_earned: Coins earned from this action
        db_connection: Database connection to use
        **kwargs: Additional parameters like quality_level, efficiency_score, etc.
    """
    try:
        if db_connection is None:
            from .database import get_db_connection
            db_connection = get_db_connection()
            should_close = True
        else:
            should_close = False
        
        cursor = db_connection.cursor()
        
        # Extract additional parameters
        quality_level = kwargs.get('quality_level', 'good')
        cost_paid = kwargs.get('cost_paid', 0)
        efficiency_score = kwargs.get('efficiency_score', 80.0)
        crop_id = kwargs.get('crop_id')
        
        # Log the activity (this is already done by the calling endpoints)
        # We just need to update user stats and check achievements
        
        # Update user_stats table for quick access
        cursor.execute("""
            INSERT OR REPLACE INTO user_stats 
            (user_id, plants_count, waters_count, fertilizes_count, harvests_count, last_activity)
            VALUES (
                ?,
                COALESCE((SELECT COUNT(*) FROM crop_care_log WHERE user_id = ? AND action_type = 'plant'), 0),
                COALESCE((SELECT COUNT(*) FROM crop_care_log WHERE user_id = ? AND action_type = 'water'), 0),
                COALESCE((SELECT COUNT(*) FROM crop_care_log WHERE user_id = ? AND action_type = 'fertilize'), 0),
                COALESCE((SELECT COUNT(*) FROM crop_care_log WHERE user_id = ? AND action_type = 'harvest'), 0),
                CURRENT_TIMESTAMP
            )
        """, (user_id, user_id, user_id, user_id, user_id))
        
        # Check for new achievements
        newly_unlocked = check_achievements_for_user(user_id, db_connection)
        
        if should_close:
            db_connection.close()
        
        return {
            "success": True,
            "newly_unlocked_achievements": newly_unlocked,
            "xp_earned": xp_earned,
            "coins_earned": coins_earned
        }
        
    except Exception as e:
        print(f"Error in log_activity: {e}")
        if should_close and db_connection:
            db_connection.close()
        return {
            "success": False,
            "error": str(e),
            "newly_unlocked_achievements": []
        }

def check_achievements_for_user(user_id: int, db_connection) -> List[Dict[str, Any]]:
    """Check and unlock any new achievements for user"""
    try:
        from .achievements import AchievementsService
        achievements_service = AchievementsService()
        return achievements_service.check_achievements(user_id)
    except Exception as e:
        print(f"Error checking achievements: {e}")
        return []


def check_completable_challenges(user_id: int, db_connection=None):
    """
    Check if any challenges became completable after the latest activity
    
    Returns:
        List of challenge IDs that are now completable
    """
    from .challenges import ChallengesService
    from .database import get_db_session
    
    try:
        db = get_db_session()
        service = ChallengesService(db)
        challenges_data = service.get_user_challenges(user_id)
        
        completable = []
        for challenge in challenges_data.get("active_challenges", []):
            if challenge["progress"] >= 100 and not challenge["is_completed"]:
                completable.append(challenge["id"])
        
        return completable
        
    except Exception as e:
        print(f"Error checking completable challenges: {e}")
        return []


def auto_complete_ready_challenges(db_session, user_id: int):
    """
    Automatically complete challenges that are 100% done
    
    Returns:
        List of completed challenges with rewards
    """
    completable = check_completable_challenges(db_session, user_id)
    completed = []
    
    if completable:
        from .challenges import ChallengesService
        service = ChallengesService(db_session)
        
        for challenge_id in completable:
            result = service.complete_challenge(user_id, challenge_id)
            if result["success"]:
                completed.append(result)
                print(f"Auto-completed challenge: {challenge_id}")
    
    return completed