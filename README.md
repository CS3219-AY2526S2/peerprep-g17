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

## Declaration of Use of AI Tools

This project made use of AI-assisted tooling during development.

Tools used:
- ChatGPT

Modes used:
- Generate
- Refactor
- Debug
- Explain

Allowed uses:
- Generated boilerplate for Google OAuth integration, frontend login UI, collaboration chat UI components, profile image selection support, and chat feature enhancements such as snippet display and code-copy interactions.
- Suggested refactoring and styling improvements for frontend pages such as `HistoryPage.tsx`, with outputs adapted to the existing codebase and design.
- Assisted with debugging intermittently failing collaboration-service CI test cases and race conditions in async collaboration tests.
- Helped explain failing CI behavior and async test issues before code-level fixes were applied.

What AI was not used for:
- Requirements elicitation and prioritization.
- Architecture and design decisions.
- Decision rationales and trade-off justifications.
- Core algorithm design for matching and collaboration behavior.

Verification:
- All AI-assisted outputs were reviewed, edited, and tested by the authors before acceptance.
- No AI-generated output was used without validation against the project's existing architecture, code patterns, and testing workflow.

Prompts and key exchanges:
- See [ai/usage-log.md](ai/usage-log.md) for the full timestamped log of AI interactions, prompts, output summaries, actions taken, and author notes.
