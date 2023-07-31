FROM node:20.5.0

WORKDIR /app

COPY bot.zip .
RUN unzip bot.zip
RUN rm bot.zip

RUN npm install
RUN npm run build
ENTRYPOINT npm run prod