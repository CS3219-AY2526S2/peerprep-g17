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

- Frontend: http://localhost:5173
- User Service: http://localhost:8081
- Question Service: http://localhost:8080
- Matching Service: http://localhost:8082
- Collaboration Service: http://localhost:8083
- Redis: `localhost:6379`

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

- REST base URL: `http://localhost:8082/api/matches`
- Health check: `http://localhost:8082/health`
- WebSocket path: `ws://localhost:8082/ws/matches`
- Match status events: `searching`, `matched`, `timed_out`, `cancelled`

The Docker setup starts Redis for matchmaking queue state and uses MongoDB for persisted session history.

## Collaboration Service

The collaboration test backend lives in `services/collaboration-service`.

- REST base URL: `http://localhost:8083/api/sessions`
- Handoff endpoint: `POST /handoff`
- Session page flow in frontend:
  - `http://localhost:5173/match`
  - `http://localhost:5173/collaboration/:sessionId`
