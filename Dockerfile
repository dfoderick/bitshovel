# Creates a Docker container for BitShovel service

# IMAGE BUILD COMMANDS
FROM ubuntu:18.04
LABEL maintainer="dfoderick@gmail.com"

# Update the OS and install any OS packages needed.
RUN apt-get update
RUN apt-get install -y sudo git curl nano gnupg

# Install Node and NPM
RUN curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs build-essential

# Create the user 'myuser' and add them to the sudo group.
RUN useradd -ms /bin/bash myuser
RUN adduser myuser sudo

# Set password to 'password' change value below if you want a different password
RUN echo myuser:password | chpasswd

# Set the working directory to be the users home directory
WORKDIR /home/myuser

# Setup NPM for non-root global install
# This fixes the most common conflicts between Mac and Linux development environments.
RUN mkdir /home/myuser/.npm-global
RUN chown -R myuser .npm-global
RUN echo "export PATH=~/.npm-global/bin:$PATH" >> /home/myuser/.profile
RUN runuser -l myuser -c "npm config set prefix '~/.npm-global'"

# Expose the port the API will be served on.
#EXPOSE 3000

# Switch to user account.
USER myuser
# Prep 'sudo' commands.
RUN echo 'password' | sudo -S pwd

# Clone the repository
WORKDIR /home/myuser
RUN git clone https://github.com/dfoderick/bitshovel
WORKDIR /home/myuser/bitshovel

# Install dependencies
RUN npm install

# Start the application.
COPY bitshovel-production bitshovel-production
CMD ["./bitshovel-production"]

#Dummy app just to get the container running without exiting, for debugging.
#You can then enter the container with command: docker exec -it <container ID> /bin/bash
#COPY dummyapp.js dummyapp.js
#CMD ["node", "dummyapp.js"]
