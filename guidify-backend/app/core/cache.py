import os
import redis
import json
from typing import Optional, Any

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class CacheService:
    def __init__(self):
        try:
            self.redis = redis.from_url(REDIS_URL, decode_responses=True)
        except Exception as e:
            print(f"Redis connection failed: {e}")
            self.redis = None

    def get(self, key: str) -> Optional[Any]:
        if not self.redis:
            return None
        try:
            data = self.redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 3600):
        if not self.redis:
            return
        try:
            self.redis.setex(key, ttl, json.dumps(value))
        except Exception as e:
            print(f"Cache set error: {e}")

cache = CacheService()
