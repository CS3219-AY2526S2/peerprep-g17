# Testing Strategy

This project uses layered automated testing and CI to cover functional correctness, browser compatibility, and deployment readiness across the PeerPrep services and frontend.

## 1. Automated Tests

The repository currently includes:

- Unit tests for helper logic, middleware, and validation paths
- Integration tests for service controllers, routes, database-backed flows, and inter-service behavior
- Browser-level end-to-end tests for critical frontend user journeys using Playwright

### Current automated test layers

- `frontend`
  - Component/unit tests with `vitest`
  - Browser E2E tests with `playwright`
- `services/user-service`
  - Route/controller integration tests
  - Middleware and helper unit tests
- `services/question-service`
  - Route/controller integration tests
  - Helper and metadata-sync unit tests
- `services/matching-service`
  - Route/controller integration tests
  - service/controller branch tests
- `services/collaboration-service`
  - Route/controller integration tests
  - service/client/execution branch tests

## 2. Coverage Targets

The CI coverage target for core backend services is:

- `>= 80%` line coverage
- `>= 80%` branch coverage where enforced
- `>= 80%` function coverage where enforced

### Coverage reporting conventions

Coverage reports are generated with `c8` and emitted as:

- `lcov`
- text summary tables in CI

To keep the service summary rows meaningful, coverage excludes:

- compiled test files under `dist/tests/**`
- low-signal generated/config entry files such as `dist/index.js`
- selected infrastructure-only files where appropriate

This means the top-row percentages are intended to reflect application/runtime code rather than compiled test artifacts.

## 3. Browser Compatibility

Supported browser matrix for frontend E2E:

- Chromium
- Firefox
- WebKit

These are run through Playwright in CI and serve as the project’s browser compatibility baseline for:

- guest navigation
- authentication flows
- authenticated question browsing

### Pass criteria

A browser-matrix run passes when:

- all Playwright tests pass on Chromium, Firefox, and WebKit
- no unexpected console/network failures break the tested flows
- the production preview build starts successfully and serves the tested pages

## 4. Non-Functional Tests

The project expectation for non-functional testing is:

- load testing for critical services such as matching and question retrieval
- stress/failure-injection tests for service degradation and rollback behavior

### Current state

Some failure-injection behavior is covered at integration-test level already, for example:

- matching/collaboration rollback paths
- auth-service failure handling
- question-service unavailability branches

In addition, CI now includes lightweight non-functional smoke checks and failure-injection checks under:

- `tests/nonfunctional/smoke-load.mjs`
- `tests/nonfunctional/failure-injection.mjs`
- `.github/workflows/nonfunctional.yml`

### Recommended pass/fail thresholds

For assessment/demo purposes, the following thresholds are recommended:

- health endpoints: `p95 < 300 ms` under smoke load
- question list retrieval: `p95 < 500 ms` under moderate load
- matchmaking request creation: error rate `< 1%` under expected demo-class traffic
- collaboration handoff failure scenarios: rollback correctness `100%` for tested cases

The current CI non-functional stage enforces lightweight smoke/failure thresholds against controlled endpoints:

- health smoke: `p95 <= 300 ms`, `0%` error rate
- question list smoke: `p95 <= 500 ms`, `0%` error rate
- match request smoke: `p95 <= 700 ms`, error rate `<= 1%`
- failure injection: injected dependency failure must return `503` within `500 ms`

These scripts are intentionally lightweight and CI-stable. They can later be extended to run against deployed or containerized service stacks, or replaced with tools such as `k6` or `Artillery`.

## 5. CI Pipeline

The CI process is structured around:

1. build
2. automated tests
3. security scan
4. artifact upload/versioning

### Current CI evidence

- Frontend CI:
  - install
  - unit/component tests
  - TypeScript build check
  - production build
  - security scan
  - build artifact upload named with `${github.sha}`
- Frontend browser E2E CI:
  - Playwright matrix on Chromium, Firefox, and WebKit
  - HTML reports / test results uploaded as artifacts named with `${github.sha}`
- Backend service CI:
  - install
  - build
  - service test suite
  - coverage reporting
  - security/dependency scanning where configured
- Non-functional CI:
  - fixture service startup
  - smoke-load threshold validation
  - failure-injection threshold validation
  - JSON artifact upload

## 6. Evidence Map

Key workflow files:

- `.github/workflows/frontend.yml`
- `.github/workflows/frontend-e2e.yml`
- `.github/workflows/user-service.yml`
- `.github/workflows/question-service.yml`
- `.github/workflows/matching-service.yml`
- `.github/workflows/collaboration-service.yml`
- `.github/workflows/nonfunctional.yml`

Key frontend test entry points:

- `frontend/src/components/RouteGuards.test.tsx`
- `frontend/src/tests/HomePage.test.tsx`
- `frontend/src/tests/QuestionPage.test.tsx`
- `frontend/e2e/home.spec.ts`
- `frontend/e2e/auth.spec.ts`
- `frontend/e2e/questions.spec.ts`

## 7. Honest Scope Note

The repository now demonstrates:

- unit testing
- integration testing
- browser E2E/system testing
- browser compatibility via CI matrix
- CI-based build/test/security/artifact flow

The remaining area that can still be strengthened further is higher-scale load/stress automation against a deployed multi-service environment. The current non-functional stage is intentionally lightweight so it stays reliable in CI while still demonstrating threshold-based smoke and failure-injection testing.
