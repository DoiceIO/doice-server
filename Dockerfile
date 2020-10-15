FROM ubuntu:18.04

RUN apt-get update -y
RUN apt-get upgrade -y

RUN apt-get install -y \
    curl \
    git \
    python \
    clang \
    build-essential

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash
RUN apt-get install nodejs -y

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
    && cd ~

EXPOSE 3000

CMD cd doice-server && node app.js
