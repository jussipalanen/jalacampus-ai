# Development image for the Next.js dev server in compose.yaml. Not a production image.
# The source code is bind-mounted at /app; dependencies and .next live in named volumes.
FROM node:22-alpine

WORKDIR /app

# Create the volume mount points so new named volumes are owned by the non-root user
# (uid 1000, usually the same as the developer, so files written to the repo stay theirs).
RUN mkdir -p /app/node_modules /app/.next && chown -R node:node /app

USER node
EXPOSE 3000
