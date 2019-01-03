package main
import "github.com/go-redis/redis"
import "log"
func main() {
	client := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})
	_, err := client.Publish("bitshovel.send", "Hello from BitShovel! Go").Result()
	if err != nil {
		log.Fatal(err)
	}
}
