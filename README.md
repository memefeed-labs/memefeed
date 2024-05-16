# Memefeed

## Design Details

1. [Data Models (Postgres)](https://github.com/memefeed-labs/memefeed/blob/main/src/resources/memes-pg.ts)
2. [API Endpoints](https://github.com/memefeed-labs/memefeed/blob/main/src/app.ts)

## Open

1. Add basic image spam filtering
2. Productionize
   1. Configure S3 AWS IAM (no publics, sequencer only on dev / prod bucket)
   2. Internal Routes
   3. Rate Limiting?
   4. fly.io / neon.tech for instances / postgres
3. Convert to more RESTful routes / grpc
   1. Response schema validation
   2. Convert responses to include error, status, result
   3. Eliminate redudant use of userID and roomID in request params, use req.auth (Session)
4. Perf Optimizations
   1. (GET memes endpoints) Implement pagination & offset to optimize performance.
   2. (pgConnect.ts) socket.io - send as new_meme_roomId to optimize client side
5. Celestia
   1. Write typescript client
