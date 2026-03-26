import { Router } from "express";
import { CollaborationController } from "../controllers/collaborationController";
import { verifyToken } from "../middleware/authMiddleware";
import { verifyInternalServiceToken } from "../middleware/internalAuthMiddleware";

export function createCollaborationRoutes(
  controller: CollaborationController,
): Router {
  const router = Router();

  router.post("/handoff", verifyInternalServiceToken, controller.handoffSession);
  router.get("/:sessionId", verifyToken, controller.getSession);
  router.post("/:sessionId/complete", verifyToken, controller.completeSession);

  return router;
}
