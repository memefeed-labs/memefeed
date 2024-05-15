# Memefeed

## Design Details

1. [Data Models (Postgres)](https://github.com/memefeed-labs/memefeed-web2/blob/main/src/resources/memes-pg.ts)
2. [API Endpoints](https://github.com/memefeed-labs/memefeed-web2/blob/main/src/app.ts)

## Open

1. Improve image handling & basic spam filtering

| Format                        | Example                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| PNG                           | <https://api.memegen.link/images/ds/small_file/high_quality.png> |
| JPEG                          | <https://api.memegen.link/images/ds/high_quality/small_file.jpg> |
| GIF (animated background)     | <https://api.memegen.link/oprah/you_get/animated_text.gif>      |
| GIF (static background)       | <https://api.memegen.link/iw/animates_text/in_production.gif>   |
| WebP (animated background)    | <https://api.memegen.link/oprah/you_get/animated_text.webp>     |
| WebP (static background)      | <https://api.memegen.link/iw/animates_text/in_production.webp>  |

2. Productionize
   1. Configure S3 AWS IAM (no publics, sequencer only on dev / prod bucket)
   2. Internal Routes
   3. Rate Limiting?
   4. fly.io / neon.tech for instances / postgres
3. Change repo name to memefeed on Github
4. Convert to more RESTful routes / grpc
   1. Response validation
   2. Convert responses to include error, status, result
