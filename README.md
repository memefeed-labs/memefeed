# Memefeed

Live Memes for Every Community.

## (5/16) DISCLAIMER: CELESTIA HACKATHON PEOPLE: PLEASE COME BACK IN 24-48 HRS FOR UPDATED TECHNICAL DOCUMENTATION

For now, here's the basic gist:

1. Memefeed posts data to Celestia directly using a single sequencer (this node).
2. The [format](https://github.com/memefeed-labs/memefeed/blob/main/src/resources/celestia.ts#L45-L50) of the data is a series of blobs that allows another full node to reconstruct the state.
3. (Not Currently Implemented) The sequencer records a tx as pending initially, and a da-worker would basically be reading in confirmed blobs and updating the tx_status to final (or defaulting to whatever the DA has).
4. (Not Currently Implemented) To sync a new node for verification, a sync worker would read in all blobs and reconstruct the Postgres table.
5. (Not Currently Implemented) Image verification. Currently, image data is stored on S3. How to verify?
6. Right now, the sequencer would just pay for the txs as long as the user is authenticated (via a tx signature & JWT token). In the future, packs/subscriptions could be used. Though, nothing is final.
7. A token would make sense for Memefeed to enable DA-neutrality. Maybe to post to multiple DAs.
8. (Future) Room metadata privacy. What happens in a room, should stay in a room.

Probably ending the hackathon with a lot more questions than I started with :)

## Design Details

1. [Data Models (Postgres)](https://github.com/memefeed-labs/memefeed/blob/main/src/resources/memes-pg.ts)
2. [API Endpoints](https://github.com/memefeed-labs/memefeed/blob/main/src/app.ts)
3. [Celestia](https://github.com/memefeed-labs/memefeed/blob/main/src/resources/pg.ts#L38)

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
