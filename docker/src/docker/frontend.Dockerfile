FROM node:20.5.0

WORKDIR /app

COPY frontend.zip .
RUN unzip frontend.zip
RUN rm frontend.zip

RUN npm install
ENTRYPOINT npm run production