import redis
bus = redis.Redis()
bus.publish("bitshovel.send","Hello from BitShovel! Python")
