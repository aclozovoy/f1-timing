"""
S3 cache adapter for production deployments.
This module provides an interface to store/retrieve cached race data from S3.
To use, set environment variables:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- S3_BUCKET_NAME (optional, defaults to 'f1-timing-cache')
- AWS_REGION (optional, defaults to 'us-east-1')
"""

import os
import json
from datetime import datetime, timedelta

# Try to import boto3, but don't fail if not available
try:
    import boto3
    from botocore.exceptions import ClientError
    S3_AVAILABLE = True
except ImportError:
    S3_AVAILABLE = False
    boto3 = None

S3_BUCKET = os.getenv('S3_BUCKET_NAME', 'f1-timing-cache')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

def get_s3_client():
    """Get S3 client if available"""
    if not S3_AVAILABLE:
        return None
    return boto3.client('s3', region_name=AWS_REGION)

def get_s3_key(year, gp, session_type='R', data_type='race'):
    """Generate S3 key for cached data"""
    if data_type == 'race':
        return f"races/{year}/{gp}/{session_type}.json"
    elif data_type == 'track':
        return f"tracks/{year}/{gp}.json"
    return None

def load_from_s3(year, gp, session_type='R', data_type='race'):
    """Load data from S3 cache"""
    if not S3_AVAILABLE:
        return None
    
    s3_client = get_s3_client()
    if not s3_client:
        return None
    
    try:
        key = get_s3_key(year, gp, session_type, data_type)
        if not key:
            return None
        
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=key)
        data = json.loads(response['Body'].read().decode('utf-8'))
        
        # Check if cache is still valid (30 days)
        cached_at = datetime.fromisoformat(data.get('cached_at', ''))
        if (datetime.now() - cached_at) < timedelta(days=30):
            print(f"Loaded {data_type} data from S3: {year} {gp}")
            return data['data']
    except ClientError as e:
        if e.response['Error']['Code'] != 'NoSuchKey':
            print(f"Error loading from S3: {e}")
    except Exception as e:
        print(f"Error loading from S3: {e}")
    
    return None

def save_to_s3(year, gp, session_type, data, data_type='race'):
    """Save data to S3 cache"""
    if not S3_AVAILABLE:
        return False
    
    s3_client = get_s3_client()
    if not s3_client:
        return False
    
    try:
        key = get_s3_key(year, gp, session_type, data_type)
        if not key:
            return False
        
        cache_data = {
            'cached_at': datetime.now().isoformat(),
            'year': year,
            'gp': gp,
            'session': session_type if data_type == 'race' else None,
            'data': data
        }
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=json.dumps(cache_data, indent=2),
            ContentType='application/json'
        )
        
        print(f"Saved {data_type} data to S3: {year} {gp}")
        return True
    except Exception as e:
        print(f"Error saving to S3: {e}")
        return False

