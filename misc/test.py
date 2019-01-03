import os
import sys
import base64
import json
import pprint
import requests
import redis

from sseclient import SSEClient

def with_requests(url):
    """Get a streaming response for the given event feed using requests."""
    return requests.get(url, stream=True)

r = redis.StrictRedis(host="localhost", port=6379, password="", decode_responses=True)
query = {"v": 3, "q": { "find": {} }}
#squery = json.dumps(query)
squery = '{"v": 3, "q": { "find": {} }}'
print(squery)
b64 = base64.encodestring(squery)
print(b64)
url = 'https://bitsocket.org/s/'+b64
response = with_requests(url)
client = SSEClient(response)
for event in client.events():
    bsock = json.loads(event.data)
    r.publish("bitshovel.reader",event.data)
    print(bsock)
    #pprint.pprint(bsock)
