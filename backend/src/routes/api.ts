import { Router } from "express";
import { showMetrics } from "../controllers/metricsController.js";
import { listProblems } from "../controllers/problemsController.js";
import { listRecommendations } from "../controllers/recommendationsController.js";
import { listUpsolving } from "../controllers/upsolvingController.js";

const apiRouter = Router();

apiRouter.get("/problems", listProblems);
apiRouter.get("/metrics", showMetrics);
apiRouter.get("/upsolving", listUpsolving);
apiRouter.get("/recommendations", listRecommendations);
apiRouter.get("/question-bank/suggestions", listRecommendations);

export default apiRouter;
