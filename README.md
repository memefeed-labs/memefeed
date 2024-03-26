# Memefeed

1. Configure S3 permissions

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
