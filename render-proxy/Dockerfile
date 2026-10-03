# The Render service that used to run the backend, once the backend is on AWS:
# it only forwards fabricvton-api.onrender.com to api.clothsyai.fabricvton.com.
FROM node:24-alpine
WORKDIR /app
COPY package.json server.mjs ./
USER node
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.mjs"]
