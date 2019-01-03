import redis
bus = redis.Redis()
bus.publish("bitshovel.writer","Hello from BitShovel! Python")
