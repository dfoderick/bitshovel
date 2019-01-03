import os
import sys
import base64
import json
import pprint
import requests
import redis
import sseclient

def with_requests(url):
    """Get a streaming response for the given event feed using requests."""
    return requests.get(url, stream=True)

r = redis.StrictRedis(host="localhost", port=6379, password="", decode_responses=True)
query = {"v": 3, "q": { "find": {} }}
b64 = base64.encodestring(json.dumps(query))
#print(b64)
url = 'https://bitsocket.org/s/'+b64
response = with_requests(url)
client = sseclient.SSEClient(response)
for event in client.events():
    try:
        bsock = json.loads(event.data)
        #shovel the bitsocket tx to redis
        r.publish("bitshovel.reader",event.data)
        print(bsock["data"][0]["_id"])
        #pprint.pprint(bsock)
    except Exception as ex:
        print(ex)
    