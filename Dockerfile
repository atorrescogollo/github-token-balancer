FROM node:15.11.0-alpine
RUN addgroup -S app \
    && adduser -S app -G app -H -h /app \
    && mkdir /app && chown app:app /app
USER app
ADD . /app/
WORKDIR /app
RUN npm install .

EXPOSE 8001 8002

ENTRYPOINT [ "/app/node_modules/anyproxy/bin/anyproxy", "--intercept", "--rule", "/app/rule.js" ]
