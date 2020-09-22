FROM ubuntu:18.04

RUN apt-get update
RUN apt-get upgrade

RUN curl -sL https://deb.nodesource.com/setup_12.x | -E bash - \
    apt-get install -y nodejs

# Mediasoup Dependencies
RUN apt-get install -y \
    python \
    clang \
    build-essential

# Download doice-server and doice-webapp
RUN git clone https://github.com/DoiceIO/doice-server \
    && cd doice-server \
    && npm i \
    && mkdir public \
    && cd public \
    && git clone https://github.com/DoiceIO/doice-webapp \
    && cd doice-webapp \
    && npm i \
    && npm run build \ 
    && mv dist/* .. \
    && cd .. \
    && rm -rf doice-webapp \
    && cd .. \
    && mv doice-server/* .. \
    && rm -rf doice-server \
    && cd ~
    
EXPOSE 3000

CMD cd doice-server && node app.js