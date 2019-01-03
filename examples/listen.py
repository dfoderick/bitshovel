import redis
bus = redis.Redis().pubsub()
bitshovel_reader = bus.subscribe("bitshovel.watch")

for message in bus.listen():
    print(message)
