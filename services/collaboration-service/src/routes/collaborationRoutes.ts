import { Router } from "express";
import { CollaborationController } from "../controllers/collaborationController";
import { verifyToken } from "../middleware/authMiddleware";
import { verifyInternalServiceToken } from "../middleware/internalAuthMiddleware";

export function createCollaborationRoutes(
  controller: CollaborationController,
): Router {
  const router = Router();
  router.post("/handoff", verifyInternalServiceToken, controller.handoffSession);
  router.post(
    "/internal/attempted-questions",
    verifyInternalServiceToken,
    controller.getAttemptedQuestionIdsForUsers,
  );
  router.post("/execute", verifyToken, controller.executeCode);
  router.post("/explain", verifyToken, controller.explainCode);
  router.post("/assistant/question", verifyToken, controller.assistQuestion);
  router.post("/history/suggestion", verifyToken, controller.suggestAttemptImprovement);
  router.patch("/history/:attemptId/reflection", verifyToken, controller.updateAttemptReflection);
  router.get("/history", verifyToken, controller.getAttemptHistory);
  router.post("/:sessionId/run", verifyToken, controller.runSessionCode);
  router.post("/:sessionId/submit", verifyToken, controller.submitSessionCode);
  router.patch("/:sessionId/question", verifyToken, controller.switchSessionQuestion);
  router.get("/:sessionId", verifyToken, controller.getSession);
  router.post("/:sessionId/complete", verifyToken, controller.completeSession);
  router.delete("/:sessionId", verifyToken, controller.terminateSession);

  return router;
}
