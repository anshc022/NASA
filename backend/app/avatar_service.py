"""Avatar generation and management service using free APIs."""

import requests
from typing import Optional
import hashlib
import urllib.parse
from .database import get_db_session


class AvatarService:
    """Service for generating and managing user avatars using free APIs."""
    
    # Free avatar generation APIs
    AVATAR_APIS = {
        'dicebear': 'https://api.dicebear.com/7.x',
        'robohash': 'https://robohash.org',
        'adorable': 'https://api.adorable.io/avatars'
    }
    
    # DiceBear styles (all free) - Expanded collection
    DICEBEAR_STYLES = [
        'adventurer',      # Human-like characters
        'adventurer-neutral', # Neutral adventurer style
        'avataaars',       # Sketch style avatars
        'avataaars-neutral', # Neutral sketch avatars
        'big-ears',        # Cute characters with big ears
        'big-ears-neutral', # Neutral big ears
        'big-smile',       # Happy characters
        'bottts',          # Robot avatars (space theme!)
        'bottts-neutral',  # Neutral robots
        'croodles',        # Doodle style
        'croodles-neutral', # Neutral croodles
        'fun-emoji',       # Emoji style
        'icons',           # Simple icons
        'identicon',       # Geometric patterns
        'initials',        # Letter-based avatars
        'lorelei',         # Illustrated characters
        'lorelei-neutral', # Neutral lorelei
        'micah',           # Simple illustrated
        'miniavs',         # Minimal avatars
        'notionists',      # Notion-style avatars
        'notionists-neutral', # Neutral notion style
        'open-peeps',      # Diverse characters
        'personas',        # Business-like avatars
        'pixel-art',       # 8-bit style
        'pixel-art-neutral', # Neutral pixel art
        'thumbs',          # Thumbs up style
        'rings',           # Ring patterns
        'shapes',          # Abstract shapes
    ]
    
    # Style categories for better organization
    STYLE_CATEGORIES = {
        'space': ['bottts', 'bottts-neutral', 'icons', 'shapes'],
        'human': ['adventurer', 'adventurer-neutral', 'avataaars', 'avataaars-neutral', 'personas', 'open-peeps'],
        'cute': ['big-ears', 'big-ears-neutral', 'big-smile', 'miniavs', 'fun-emoji'],
        'artistic': ['lorelei', 'lorelei-neutral', 'micah', 'croodles', 'croodles-neutral'],
        'retro': ['pixel-art', 'pixel-art-neutral', 'identicon', 'rings'],
        'modern': ['notionists', 'notionists-neutral', 'thumbs', 'initials'],
    }
    
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = 10
    
    def generate_user_seed(self, user_data: dict) -> str:
        """Generate a consistent seed for avatar based on user data."""
        # Use user ID, username, and full_name to create unique seed
        seed_string = f"{user_data.get('id', '')}-{user_data.get('username', '')}-{user_data.get('full_name', '')}"
        return hashlib.md5(seed_string.encode()).hexdigest()[:16]
    
    def get_dicebear_avatar_url(self, seed: str, style: str = 'bottts', size: int = 200) -> str:
        """Generate DiceBear avatar URL (PNG for RN Image compatibility)."""
        # Use PNG instead of SVG because React Native Image cannot decode SVG
        base_url = f"{self.AVATAR_APIS['dicebear']}/{style}/png"
        params = {
            'seed': seed,
            'size': str(size),
            'radius': '50',  # Rounded corners
        }
        
        # Style-specific customizations for space theme
        if style == 'bottts':
            params.update({
                'backgroundColor': '4CAF50',
                'primaryColor': '2196F3',
                'secondaryColor': 'FFC107'
            })
        elif style == 'adventurer':
            params.update({
                'backgroundColor': '4CAF50',
                'skinColor': 'f2d3b1'
            })
        elif style == 'initials':
            params.update({
                'backgroundColor': '4CAF50',
                'textColor': 'FFFFFF'
            })
        
        # Use manual URL construction to avoid encoding issues
        param_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{param_string}"

    def normalize_avatar_url(self, url: Optional[str]) -> Optional[str]:
        """Normalize existing avatar URLs to PNG and simplified params.

        - Converts any DiceBear SVG URLs to PNG
        - Leaves non-DiceBear URLs (e.g., RoboHash) untouched
        """
        if not url:
            return url
        try:
            if 'api.dicebear.com' in url:
                # Convert path /svg to /png
                if '/svg' in url:
                    url = url.replace('/svg', '/png')
                # Remove potential format=svg param if present
                url = url.replace('format=svg', 'format=png')
                # If backgroundColor has multiple comma-separated values encoded, keep first color only
                # This is optional – DiceBear supports it, but we keep it simple.
                # No strict parsing here; existing URLs will continue to work.
            return url
        except Exception:
            return url

    def _update_if_normalized(self, user_id: int, avatar_url: Optional[str]) -> Optional[str]:
        """Normalize avatar URL and persist changes if modified."""
        normalized = self.normalize_avatar_url(avatar_url)
        if normalized and normalized != avatar_url:
            try:
                db = get_db_session()
                db.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (normalized, user_id))
                db.commit()
                db.close()
            except Exception:
                # Non-fatal; return normalized even if DB update fails
                pass
        return normalized
    
    def get_robohash_avatar_url(self, seed: str, size: int = 200) -> str:
        """Generate Robohash avatar URL (perfect for space theme!)."""
        # set1: robots, set2: monsters, set3: heads, set4: cats
        return f"{self.AVATAR_APIS['robohash']}/{seed}.png?size={size}x{size}&set=set1&bgset=bg2"
    
    def get_adorable_avatar_url(self, seed: str, size: int = 200) -> str:
        """Generate Adorable avatar URL."""
        return f"{self.AVATAR_APIS['adorable']}/{size}/{seed}.png"
    
    def generate_avatar_options(self, user_data: dict, page: int = 0, per_page: int = 12) -> dict:
        """Generate multiple avatar options for user to choose from with pagination."""
        seed = self.generate_user_seed(user_data)
        
        # Generate variations by modifying seed for each page
        base_seed = seed
        all_options = {}
        
        # Generate options for all styles
        for i, style in enumerate(self.DICEBEAR_STYLES):
            # Create unique seed variation for each style and page
            style_seed = f"{base_seed}-{style}-p{page}-{i}"[:16]
            style_name = f"{style}_{page}_{i}"
            all_options[style_name] = {
                'url': self.get_dicebear_avatar_url(style_seed, style),
                'style': style,
                'category': self.get_style_category(style),
                'name': self.get_style_display_name(style)
            }
        
        # Add RoboHash variants
        for i in range(3):  # 3 robohash variants per page
            robot_seed = f"{base_seed}-robot-p{page}-{i}"[:16]
            all_options[f"robohash_{page}_{i}"] = {
                'url': self.get_robohash_avatar_url(robot_seed),
                'style': 'robohash',
                'category': 'space',
                'name': f'Space Robot {i+1}'
            }
        
        # Paginate results
        items = list(all_options.items())
        start_idx = page * per_page
        end_idx = start_idx + per_page
        paginated_items = items[start_idx:end_idx]
        
        return {
            'options': dict(paginated_items),
            'page': page,
            'per_page': per_page,
            'total_pages': max(1, len(items) // per_page + (1 if len(items) % per_page else 0)),
            'has_more': end_idx < len(items)
        }
    
    def get_style_category(self, style: str) -> str:
        """Get category for a style."""
        for category, styles in self.STYLE_CATEGORIES.items():
            if style in styles:
                return category
        return 'other'
    
    def get_style_display_name(self, style: str) -> str:
        """Get display name for a style."""
        name_map = {
            'adventurer': 'Adventurer',
            'adventurer-neutral': 'Adventurer Neutral',
            'avataaars': 'Avatar Style',
            'avataaars-neutral': 'Avatar Neutral',
            'big-ears': 'Big Ears',
            'big-ears-neutral': 'Big Ears Neutral',
            'big-smile': 'Happy Face',
            'bottts': 'Space Robot',
            'bottts-neutral': 'Space Robot Neutral',
            'croodles': 'Doodle Art',
            'croodles-neutral': 'Doodle Neutral',
            'fun-emoji': 'Fun Emoji',
            'icons': 'Simple Icons',
            'identicon': 'Geometric',
            'initials': 'Letter Style',
            'lorelei': 'Illustrated',
            'lorelei-neutral': 'Illustrated Neutral',
            'micah': 'Minimal Art',
            'miniavs': 'Mini Avatar',
            'notionists': 'Modern Style',
            'notionists-neutral': 'Modern Neutral',
            'open-peeps': 'Diverse Character',
            'personas': 'Business Style',
            'pixel-art': 'Pixel Art',
            'pixel-art-neutral': 'Pixel Neutral',
            'thumbs': 'Thumbs Up',
            'rings': 'Ring Pattern',
            'shapes': 'Abstract Shape',
        }
        return name_map.get(style, style.replace('-', ' ').title())
    
    def generate_avatar_categories(self, user_data: dict) -> dict:
        """Generate avatar options organized by categories."""
        seed = self.generate_user_seed(user_data)
        categories = {}
        
        for category, styles in self.STYLE_CATEGORIES.items():
            categories[category] = []
            for i, style in enumerate(styles[:4]):  # 4 per category for preview
                style_seed = f"{seed}-{style}-cat{i}"[:16]
                categories[category].append({
                    'url': self.get_dicebear_avatar_url(style_seed, style),
                    'style': style,
                    'name': self.get_style_display_name(style)
                })
        
        return categories
    
    def get_default_avatar_for_user(self, user_data: dict) -> str:
        """Get the default avatar URL for a user (space robot theme)."""
        seed = self.generate_user_seed(user_data)
        return self.get_dicebear_avatar_url(seed, 'bottts')
    
    def update_user_avatar(self, user_id: int, avatar_url: str) -> bool:
        """Update user's avatar URL in database."""
        try:
            db = get_db_session()
            db.execute(
                "UPDATE users SET avatar_url = ? WHERE id = ?",
                (avatar_url, user_id)
            )
            db.commit()
            db.close()
            return True
        except Exception as e:
            print(f"Error updating user avatar: {e}")
            if db:
                db.close()
            return False
    
    def get_user_avatar(self, user_id: int) -> Optional[str]:
        """Get user's current avatar URL from database."""
        try:
            db = get_db_session()
            cursor = db.execute("SELECT avatar_url FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()
            db.close()
            
            if result and result['avatar_url']:
                # Normalize to ensure PNG compatibility
                return self._update_if_normalized(user_id, result['avatar_url'])
            return None
        except Exception as e:
            print(f"Error fetching user avatar: {e}")
            return None
    
    def ensure_user_has_avatar(self, user_data: dict) -> str:
        """Ensure user has an avatar, generate default if needed."""
        user_id = user_data.get('id')
        existing_avatar = self.get_user_avatar(user_id)
        
        if existing_avatar:
            # Ensure normalized (PNG) URL is returned
            return self._update_if_normalized(user_id, existing_avatar) or existing_avatar
        
        # Generate default space robot avatar
        default_avatar = self.get_default_avatar_for_user(user_data)
        
        # Save to database
        if self.update_user_avatar(user_id, default_avatar):
            return default_avatar
        
        # Fallback to URL without DB storage
        return default_avatar
    
    def test_avatar_urls(self, user_data: dict) -> dict:
        """Test all avatar generation methods (for debugging)."""
        seed = self.generate_user_seed(user_data)
        
        results = {}
        options = self.generate_avatar_options(user_data)
        
        for name, url in options.items():
            try:
                response = self.session.head(url, timeout=5)
                results[name] = {
                    'url': url,
                    'status': response.status_code,
                    'accessible': response.status_code == 200
                }
            except Exception as e:
                results[name] = {
                    'url': url,
                    'status': 'error',
                    'accessible': False,
                    'error': str(e)
                }
        
        return results


# Global avatar service instance
avatar_service = AvatarService()