# Dockerize your bitcoin apps
Create installable application components. Plug in components can run anywhere on your network
and are easily accessible with a simple command or API. 
Think of them as black boxes on your network or black boxes that are accessible globally using the bitcoin network.
If you want your app accessible from the local message bus then only listen to the local bus.
If you want your app accessible from anywhere then listen to the bitcoin message bus.

## Example: Memo as a Bitshovel plug in

https://docs.docker.com/docker-hub/#step-4-build-and-push-a-container-image-to-docker-hub-from-your-computer

Create a Dockerfile for your app. You can use the following as an example.
```
FROM python:2
ADD memo.py /
RUN pip install redis
CMD [ "python", "./memo.py" ]
```
Build it and test it locally.
```
docker build -t bitshovel-memo .
docker run -network=host bitshovel-memo
```
When you are ready to publish your component then push it to Docker Hub.
```
docker login --username=<your_docker_hub_username>
docker images
docker tag 0b8e7c334643 <your_docker_hub_username>/bitshovel-memo:latest
docker push <your_docker_hub_username>/bitshovel-memo
```
Thereafter, anyone can download and run your component.
```
docker run -network=host dfoderick/bitshovel-memo
```
