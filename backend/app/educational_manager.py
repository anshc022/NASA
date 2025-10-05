"""Smart educational content manager with caching and auto-updates."""

import json
import hashlib
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging

from .ai import AIAdvisor
from .database import get_db_connection

logger = logging.getLogger(__name__)


class EducationalContentManager:
    """Manages educational content generation, caching, and automatic updates."""
    
    def __init__(self):
        self.advisor = AIAdvisor()
        
    def _calculate_content_hash(self, user_plants: List[Dict], location: Dict[str, float]) -> str:
        """Calculate hash of user's current state to detect changes."""
        # Create a string representing current state
        state_data = {
            "location": {"lat": round(location["lat"], 4), "lon": round(location["lon"], 4)},
            "plants": []
        }
        
        # Sort plants by type and health for consistent hashing
        sorted_plants = sorted(user_plants, key=lambda p: (p.get("crop_type", ""), p.get("health", 0)))
        
        for plant in sorted_plants:
            state_data["plants"].append({
                "type": plant.get("crop_type", "unknown"),
                "health_tier": self._get_health_tier(plant.get("health", 50)),
                "water_tier": self._get_level_tier(plant.get("water_level", 50)),
                "fertilizer_tier": self._get_level_tier(plant.get("fertilizer_level", 50))
            })
        
        # Create hash from JSON representation
        state_str = json.dumps(state_data, sort_keys=True)
        return hashlib.md5(state_str.encode()).hexdigest()
    
    def _get_health_tier(self, health: float) -> str:
        """Convert health percentage to tier for content personalization."""
        if health >= 80:
            return "excellent"
        elif health >= 60:
            return "good" 
        elif health >= 40:
            return "fair"
        else:
            return "poor"
    
    def _get_level_tier(self, level: float) -> str:
        """Convert water/fertilizer level to tier."""
        if level >= 70:
            return "high"
        elif level >= 40:
            return "medium"
        else:
            return "low"
    
    def _is_content_stale(self, generated_at: str, max_age_hours: int = 24) -> bool:
        """Check if content is older than max_age_hours."""
        try:
            generated_time = datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
            age = datetime.now() - generated_time.replace(tzinfo=None)
            return age > timedelta(hours=max_age_hours)
        except:
            return True  # If we can't parse the date, consider it stale
    
    async def get_educational_content(
        self, 
        user_id: int, 
        user_plants: List[Dict], 
        location: Dict[str, float],
        nasa_data: Dict[str, Any],
        force_regenerate: bool = False
    ) -> Dict[str, Any]:
        """Get educational content with smart caching and auto-updates."""
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Calculate current state hash
            current_hash = self._calculate_content_hash(user_plants, location)
            
            # Check for existing content
            cursor.execute("""
                SELECT 
                    content_hash, facts_json, missions_json, insights_json, tips_json,
                    generated_at, plant_count, location_lat, location_lon
                FROM educational_content 
                WHERE user_id = ?
            """, (user_id,))
            
            existing_content = cursor.fetchone()
            
            # Determine if we need to regenerate content
            needs_regeneration = (
                force_regenerate or
                not existing_content or
                existing_content[0] != current_hash or  # Hash changed
                self._is_content_stale(existing_content[5]) or  # Content is stale
                abs(existing_content[7] - location["lat"]) > 0.1 or  # Location changed significantly
                abs(existing_content[8] - location["lon"]) > 0.1
            )
            
            if needs_regeneration:
                logger.info(f"Regenerating educational content for user {user_id}")
                
                # Generate new content using AI
                new_content = await self.advisor.generate_educational_content(
                    user_plants=user_plants,
                    nasa_data=nasa_data,
                    location=location,
                    user_level=len(user_plants)
                )
                
                # Save to database
                await self._save_content_to_db(
                    user_id, current_hash, new_content, location, len(user_plants)
                )
                
                # Add metadata
                content_result = {
                    **new_content,
                    "is_cached": False,
                    "generated_at": datetime.now().isoformat(),
                    "content_hash": current_hash
                }
                
                logger.info(f"✅ New educational content generated for user {user_id}")
                
            else:
                # Use cached content
                logger.info(f"Using cached educational content for user {user_id}")
                
                content_result = {
                    "facts": json.loads(existing_content[1]),
                    "interactive_missions": json.loads(existing_content[2]),
                    "climate_insights": json.loads(existing_content[3]),
                    "sustainability_tips": json.loads(existing_content[4]),
                    "is_cached": True,
                    "generated_at": existing_content[5],
                    "content_hash": existing_content[0]
                }
                
            conn.close()
            return content_result
            
        except Exception as e:
            conn.close()
            logger.error(f"Error managing educational content: {e}")
            # Fallback to direct generation
            return await self.advisor.generate_educational_content(
                user_plants=user_plants,
                nasa_data=nasa_data,
                location=location,
                user_level=len(user_plants)
            )
    
    async def _save_content_to_db(
        self, 
        user_id: int, 
        content_hash: str, 
        content: Dict[str, Any], 
        location: Dict[str, float],
        plant_count: int
    ):
        """Save educational content to database."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Convert content to JSON strings
            facts_json = json.dumps(content.get("facts", []))
            missions_json = json.dumps(content.get("interactive_missions", []))
            insights_json = json.dumps(content.get("climate_insights", {}))
            tips_json = json.dumps(content.get("sustainability_tips", []))
            
            now = datetime.now().isoformat()
            
            # Insert or update content
            cursor.execute("""
                INSERT OR REPLACE INTO educational_content 
                (user_id, content_hash, facts_json, missions_json, insights_json, tips_json,
                 location_lat, location_lon, plant_count, generated_at, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, content_hash, facts_json, missions_json, insights_json, tips_json,
                location["lat"], location["lon"], plant_count, now, now
            ))
            
            conn.commit()
            
        finally:
            conn.close()
    
    async def invalidate_user_content(self, user_id: int) -> bool:
        """Force regeneration of educational content for a user."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                DELETE FROM educational_content WHERE user_id = ?
            """, (user_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Invalidated educational content for user {user_id}")
            return True
            
        except Exception as e:
            conn.close()
            logger.error(f"Error invalidating content for user {user_id}: {e}")
            return False
    
    def mark_content_completed(self, user_id: int, content_type: str, content_id: str, xp_earned: int = 0) -> bool:
        """Mark educational content as completed by user."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO educational_progress 
                (user_id, content_type, content_id, xp_earned)
                VALUES (?, ?, ?, ?)
            """, (user_id, content_type, content_id, xp_earned))
            
            conn.commit()
            conn.close()
            
            return cursor.rowcount > 0  # Returns True if new record was inserted
            
        except Exception as e:
            conn.close()
            logger.error(f"Error marking content completed: {e}")
            return False
    
    def get_completed_content(self, user_id: int) -> List[Dict[str, Any]]:
        """Get list of educational content completed by user."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT content_type, content_id, completed_at, xp_earned
                FROM educational_progress 
                WHERE user_id = ?
                ORDER BY completed_at DESC
            """, (user_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [{
                "content_type": row[0],
                "content_id": row[1], 
                "completed_at": row[2],
                "xp_earned": row[3]
            } for row in results]
            
        except Exception as e:
            conn.close()
            logger.error(f"Error getting completed content: {e}")
            return []
    
    async def check_and_update_content_on_plant_change(self, user_id: int) -> Dict[str, Any]:
        """Check if content needs updating when user plants/farms change."""
        # This will be called automatically when user adds plants or changes location
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get user's current farm location
            cursor.execute("""
                SELECT latitude, longitude FROM user_farms 
                WHERE user_id = ? 
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            
            farm = cursor.fetchone()
            if not farm:
                return {"update_needed": False, "reason": "No farm found"}
            
            latitude, longitude = farm
            
            # Get user's current plants
            cursor.execute("""
                SELECT id, name, water_level, fertilizer_level, health, planted_at 
                FROM crops WHERE user_id = ?
            """, (user_id,))
            
            plants = cursor.fetchall()
            
            # Convert to expected format
            plant_data = [{
                "crop_id": plant[0],
                "crop_type": plant[1],
                "water_level": plant[2],
                "fertilizer_level": plant[3],
                "health": plant[4],
                "planted_at": plant[5]
            } for plant in plants]
            
            # Check if content hash has changed
            current_hash = self._calculate_content_hash(plant_data, {"lat": latitude, "lon": longitude})
            
            cursor.execute("""
                SELECT content_hash FROM educational_content WHERE user_id = ?
            """, (user_id,))
            
            existing = cursor.fetchone()
            conn.close()
            
            if not existing or existing[0] != current_hash:
                return {
                    "update_needed": True, 
                    "reason": "Farm state changed",
                    "new_hash": current_hash,
                    "old_hash": existing[0] if existing else None
                }
            
            return {"update_needed": False, "reason": "Content up to date"}
            
        except Exception as e:
            conn.close()
            logger.error(f"Error checking content update need: {e}")
            return {"update_needed": False, "reason": f"Error: {e}"}


# Global instance
educational_manager = EducationalContentManager()