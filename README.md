# nathy_bomma
```
docker run -d \
  --name nathy_dash \
  --restart unless-stopped \
  -p 3010:3000 \
  --env-file .env \
  kaduhod/nathy_dash:latest

```
