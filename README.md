[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/HpD0QZBI)
# CS3219 Project (PeerPrep) - AY2526S2
## Group: G17

### Note: 
- You are required to develop individual microservices within separate folders within this repository.
- The teaching team should be given access to the repositories, as we may require viewing the history of the repository in case of any disputes or disagreements. 

## Run Everything with One Command (Docker)

From the repository root:
```bash
make start
```

Then open:
- **Local**: http://localhost
- **Network (other devices)**: http://<YOUR_IP> (e.g. http://192.168.x.x)

All services are proxied through nginx on port 80 so you do not need to access individual service ports directly.

Stop everything:
```bash
make stop
```

If you also want to remove MongoDB data volume:
```bash
make clean
```

## User Service Admin Bootstrap

Newly registered users are created with role `user` by default.
To bootstrap the first admin in a fresh environment:
```bash
cd services/user-service
npm run bootstrap-admin -- --email <existing-user-email>
```
Notes:
- The target account must already exist.
- The command promotes the specified account to `admin`.
- If the user is not found, the command exits with a non-zero status.

## Matching Service

The matching backend lives in `services/matching-service`.

- REST base URL: `http://localhost/api/matches`
- WebSocket path: `ws://localhost/ws/matches`
- Match status events: `searching`, `matched`, `timed_out`, `cancelled`

The Docker setup starts Redis for matchmaking queue state and uses MongoDB for persisted session history.

## Collaboration Service

The collaboration backend lives in `services/collaboration-service`.

- REST base URL: `http://localhost/api/collab/sessions`
- Handoff endpoint: `POST /api/collab/sessions/handoff`
- WebSocket (Yjs editor): `ws://localhost/ws/sessions/`
- WebSocket (chat): `ws://localhost/ws/chat/`
- Session page flow in frontend:
  - `http://localhost/match`
  - `http://localhost/collaboration/:sessionId`