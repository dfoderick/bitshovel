
# Why use BitShovel for your blockchain apps?  
1) Easily read and write messages to bitcoin in [any language](#examples)
2) Combines read and write operations into a single simple API
3) Builds on top of unwriter's excellent libraries
4) Easy to deploy using Docker
5) provides a simple messaging infrastructure (pubsub, work queues, etc.) for all your applications
6) Compatible with event driven programming and microservices architectures

## Install using Docker Compose
```
git clone https://github.com/dfoderick/bitshovel
cd bitshovel
```
Run the following command *once* to build the docker image.
```
docker-compose build --no-cache
```
Thereafter, run the following command (notice the `no-recreate` option) so that your private keys in wallet.json will not get wiped out.
```
docker-compose up --no-recreate
```
To find out what docker containers are running use
```
docker ps
```
## Configure your private keys

>
> *An Important Note on Private Keys!*  
> It is very easy to lose the private keys on a development server in Docker. Do not store a large amount of bitcoin in your wallet. Fund the wallet with small amounts and make backups of your private keys
>

If you want to write data to bitcoin then BitShovel will need private keys for your wallet.
BitShovel will create a wallet.json by default when it starts up. You can either update
the wallet.json file with your own private keys or you can fund the wallet that BitShovel
generated. Use the following command (while BitShovel is running) to find out the wallet address to fund.
```
redis-cli GET bitshovel.wallet.address
```
The easiest way to fund the wallet is by using moneybutton to withdraw to the BitShovel address.  
https://www.moneybutton.com/test

## Create your app
Any process that can read and write messages can now be a blockchain app. [See examples below](#examples). Test that your BitShovel instane is running using the command lines below and then get started writing apps.

# Test BitShovel from command line
Open terminal and create a listener for bitcoin messages. Messages will scroll in this process.
```
redis-cli SUBSCRIBE bitshovel.reader
```
Open another terminal to control BitShovel and start pumping it with commands.
```
redis-cli PUBLISH bitshovel.start '{"v": 3, "q": { "find": {} }}'
```
Stop shovel from reading messages.
```
redis-cli PUBLISH bitshovel.stop whatever
```
Send a message to bitcoin (requires wallet to be funded).
```
redis-cli PUBLISH bitshovel.writer "Hello from BitShovel!"
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
Search using searchbsv.com  
https://searchbsv.com/search?q=BitShovel

# Bitshovel Events (aka Channels or Topics)
* **bitshovel.reader**  
  Subscribe to this event to get notified when a new bitcoin message appears on the network
* **bitshovel.writer**  
  Publish message to this topic to write to bitcoin
* **bitshovel.start**  
  Command to shovel to start listening to bitcoin messages. Pass it the query.
* **bitshovel.stop**  
  Command to shovel to stop listening to bitcoin messages
* **bitshovel.wallet**  
  Update the wallet to use a new private key

# Examples
A Python program to write to bitcoin.
```
import redis
bus = redis.Redis()
bus.publish("bitshovel.writer","Hello from BitShovel! Python")
```
A Python program to listen to bitcoin messages.
```
import redis
bus = redis.Redis().pubsub()
bitshovel_reader = bus.subscribe("bitshovel.reader")
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
	_, err := client.Publish("bitshovel.writer", "Hello from BitShovel! Go").Result()
	if err != nil {
		log.Fatal(err)
	}S
}
```

# Native install for Developers
Normal users can run BitShovel using the Docker instruction above. Developers wishing to customize the app can install it natively to edit the source file.

## Install redis
Install and run redis using  
```
docker run --name bitshovel-redis -d redis
```

## Get source code
```
git clone https://github.com/dfoderick/bitshovel
cd bitshovel
npm install
```
## Run BitShovel server
```
node bitshovel.js
```
will respond with 'Connected to local bus...'
S