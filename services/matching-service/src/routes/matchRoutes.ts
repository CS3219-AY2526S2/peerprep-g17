import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware";
import { verifyInternalServiceToken } from "../middleware/internalAuthMiddleware";
import { MatchController } from "../controllers/matchController";

export function createMatchRoutes(controller: MatchController): Router {
  const router = Router();

  router.post("/requests", verifyToken, controller.createRequest);
  router.get("/requests/me", verifyToken, controller.getMyRequestState);
  router.delete("/requests/me", verifyToken, controller.cancelMyRequest);
  router.patch(
    "/sessions/:sessionId/complete",
    verifyInternalServiceToken,
    controller.completeSession,
  );

  return router;
}
