import os
import json
import hashlib
from datetime import datetime, timedelta

# Try to import S3 cache adapter
try:
    from .s3_cache import load_from_s3, save_to_s3
    S3_AVAILABLE = True
except ImportError:
    S3_AVAILABLE = False
    load_from_s3 = None
    save_to_s3 = None

# Cache directory for processed race data
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

# Check if S3 should be used (if AWS credentials are set)
USE_S3 = S3_AVAILABLE and os.getenv('AWS_ACCESS_KEY_ID') and os.getenv('AWS_SECRET_ACCESS_KEY')

def get_cache_key(year, gp, session_type='R'):
    """Generate a cache key for a race"""
    return f"{year}_{gp}_{session_type}"

def get_cache_path(year, gp, session_type='R'):
    """Get the file path for cached race data"""
    cache_key = get_cache_key(year, gp, session_type)
    return os.path.join(CACHE_DIR, f"{cache_key}.json")

def is_cache_valid(cache_path, max_age_days=30):
    """Check if cache file exists and is still valid"""
    if not os.path.exists(cache_path):
        return False
    
    # Check file age
    file_time = datetime.fromtimestamp(os.path.getmtime(cache_path))
    age = datetime.now() - file_time
    
    return age < timedelta(days=max_age_days)

def load_from_cache(year, gp, session_type='R'):
    """Load race data from cache if available (tries S3 first, then local)"""
    # Try S3 first if configured
    if USE_S3 and load_from_s3:
        s3_data = load_from_s3(year, gp, session_type, 'race')
        if s3_data:
            return {'data': s3_data}
    
    # Fall back to local cache
    cache_path = get_cache_path(year, gp, session_type)
    
    if is_cache_valid(cache_path):
        try:
            with open(cache_path, 'r') as f:
                data = json.load(f)
                print(f"Loaded race data from local cache: {year} {gp}")
                return data
        except Exception as e:
            print(f"Error loading cache: {e}")
            return None
    
    return None

def save_to_cache(year, gp, session_type, data):
    """Save processed race data to cache (saves to both S3 and local if configured)"""
    # Save to S3 if configured
    if USE_S3 and save_to_s3:
        save_to_s3(year, gp, session_type, data, 'race')
    
    # Also save locally as backup
    cache_path = get_cache_path(year, gp, session_type)
    
    try:
        # Add metadata
        cached_data = {
            'cached_at': datetime.now().isoformat(),
            'year': year,
            'gp': gp,
            'session': session_type,
            'data': data
        }
        
        with open(cache_path, 'w') as f:
            json.dump(cached_data, f, indent=2)
        
        print(f"Saved race data to local cache: {year} {gp}")
        return True
    except Exception as e:
        print(f"Error saving cache: {e}")
        return False

def clear_cache(year=None, gp=None):
    """Clear cache files. If year/gp specified, clear only those."""
    if year and gp:
        cache_path = get_cache_path(year, gp)
        if os.path.exists(cache_path):
            os.remove(cache_path)
            return True
    else:
        # Clear all cache
        for filename in os.listdir(CACHE_DIR):
            if filename.endswith('.json'):
                os.remove(os.path.join(CACHE_DIR, filename))
        return True
    return False

