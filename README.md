
# Why use BitShovel for your blockchain apps?  
1) Easily read and write messages to bitcoin with ANY language
2) Combines read and write operations into a single simple Api
3) Builds on top of unwriter libraries
4) Easy to deploy using Docker (soon)
5) provides a simple messaging infrastructure (pubsub, work queues, etc.) for all your applications
6) Compatible with event driven programming and microservices architectures

## Requires redis
Install and run redis using  
```
docker run --name bitshovel-redis -d redis
```

## Run BitShovel from source (for now until a docker image can be created)  
```
git clone https://github.com/dfoderick/bitshovel
cd bitshovel
npm install
```
## Use torusJKL bsv branch or manually update datacash index.js
Make these changes to datacash index.js to use bsv
1) require('bsv')
2) rpc: "https://bchsvexplorer.com"

## Configure your private keys
Create a file called wallet.json. Code to make a wallet file has been provided in misc/genWallet.js  
```
node misc/genWallet.js
```
Example:
```
{
    "wif":"your private key"
}
```

## Run the BitShovel server
```
node bitshovel.js
```
will respond with 'Connected to local bus...'

## Create your app
Any process that can read and write messages can now be a blockchain app. [See examples below](#examples).

# Bitshovel Events (aka Channels or Topics)
* **bitcoin_reader**  
  Subscribe to this event to get notified when a new bitcoin message appears on the network
* **bitcoin_writer**  
  publish message to this topic to write to bitcoin
* **shovel_start**  
  Command to shovel to start listening to bitcoin messages. Pass it the query.
* **shovel_stop**  
  Command to shovel to stop listening to bitcoin messages

# Test BitShovel from command line
Open terminal and create a listener for bitcoin messages. Messages will scroll in this process.
```
redis-cli SUBSCRIBE bitcoin_reader
```
Open another terminal to control BitShovel and start pumping it with commands.
```
redis-cli PUBLISH shovel_start '{"v": 3, "q": { "find": {} }}'
```
Stop shovel from reading messages.
```
redis-cli PUBLISH shovel_stop whatever
```
Send a message to bitcoin.
```
redis-cli PUBLISH bitcoin_writer "Hello from BitShovel!"
```
Find the message on bitcoin.  
https://bitgraph.network/explorer/ewogICJ2IjogMywKICAicSI6IHsKICAgICJmaW5kIjogeyAib3V0LmIwIjogeyAib3AiOiAxMDYgfSwgIm91dC5oMSI6ICI2ZDAyIiwgIm91dC5zMiI6IkhlbGxvIGZyb20gQml0U2hvdmVsISIgfSwKICAgICJwcm9qZWN0IjogeyAib3V0LiQiOiAxIH0KICB9Cn0=

Query bitdb using the following query.
```
{
  "v": 3,
  "q": {
    "find": { "out.b0": { "op": 106 }, "out.h1": "6d02", "out.s2":"Hello from BitShovel!" },
    "project": { "out.$": 1 }
  }
}
```

# Examples
A Python program to write to bitcoin.
```
import redis
bus = redis.Redis()
bus.publish("bitcoin_writer","Hello from BitShovel! Python")
```
A Python program to listen to bitcoin messages.
```
import redis
bus = redis.Redis().pubsub()
bitcoin_reader = bus.subscribe("bitcoin_reader")
for message in bus.listen():
    print(message)
```
A golang program to write to bitcoin.
```
package main
import "github.com/go-redis/redis"
import "log"
func main() {
	client := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})
	_, err := client.Publish("bitcoin_writer", "Hello from BitShovel! Go").Result()
	if err != nil {
		log.Fatal(err)
	}
}
```
