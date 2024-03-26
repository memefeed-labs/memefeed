# Memefeed

1. Configure S3 permissions

## Product Things

1. Rooms (public / private) needs more thought
   a. user should be able to join a public room without any interactive admin input
   b. user should not have to enter a password each time (session, etc)
   c. random users should not be able to join a room

## Docker Commands Reference

```bash
# Get Started
docker-compose up --build -d && npm run watch

# Build
docker-compose up --build (-d for logs background)

# Health
docker ps

# Logs
docker logs {container}

# Enter Container
docker exec -it {container} /bin/bash

# Login to PostgreSQL Database
psql -U memefeed -d memefeed-postgres -W
password: mysecretpassword
```
