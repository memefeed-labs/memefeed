# Memefeed

## Design Details

1. [Data Models (Postgres)](https://github.com/memefeed-labs/memefeed-web2/blob/main/src/resources/memes-pg.ts)
2. [API Endpoints](https://github.com/memefeed-labs/memefeed-web2/blob/main/src/app.ts)

## Open

1. Add basic image spam filtering
2. Productionize
   1. Configure S3 AWS IAM (no publics, sequencer only on dev / prod bucket)
   2. Internal Routes
   3. Rate Limiting?
   4. fly.io / neon.tech for instances / postgres
3. Change repo name to memefeed on Github
4. Convert to more RESTful routes / grpc
   1. Response schema validation
   2. Convert responses to include error, status, result
   3. Eliminate redudant use of userID and roomID in request params, use req.auth (Session)
