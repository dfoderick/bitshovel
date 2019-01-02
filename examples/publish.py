import redis
bus = redis.Redis()
bus.publish("bitcoin_writer","Hello from BitShovel! Python")
