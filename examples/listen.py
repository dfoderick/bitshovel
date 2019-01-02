import redis
bus = redis.Redis().pubsub()
#listen to the bitcoin_reader channel
bitcoin_reader = bus.subscribe("bitcoin_reader")

for message in bus.listen():
    print(message)
