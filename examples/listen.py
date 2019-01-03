import redis
bus = redis.Redis().pubsub()
#listen to the bitshovel.reader channel
bitshovel_reader = bus.subscribe("bitshovel.reader")

for message in bus.listen():
    print(message)
