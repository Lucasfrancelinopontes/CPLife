import { Router } from "express";
import { showMetrics } from "../controllers/metricsController.js";
import { listProblems } from "../controllers/problemsController.js";
import { listRecommendations } from "../controllers/recommendationsController.js";
import { listUpsolving } from "../controllers/upsolvingController.js";
import {
	addPersonalProblem,
	listQuestionBankSuggestions,
	listQuestionBankTopics,
	listQuestionBankTags,
	refreshQuestionBank,
	showQuestionBankStatus,
} from "../controllers/questionBankController.js";

const apiRouter = Router();

apiRouter.get("/problems", listProblems);
apiRouter.get("/metrics", showMetrics);
apiRouter.get("/upsolving", listUpsolving);
apiRouter.get("/recommendations", listRecommendations);
apiRouter.get("/question-bank/suggestions", listRecommendations);
apiRouter.get("/question-bank/status", showQuestionBankStatus);
apiRouter.get("/question-bank/search", listQuestionBankSuggestions);
apiRouter.get("/question-bank/topics", listQuestionBankTopics);
apiRouter.get("/question-bank/tags", listQuestionBankTags);
apiRouter.post("/question-bank/refresh", refreshQuestionBank);
apiRouter.post("/question-bank/personal", addPersonalProblem);

export default apiRouter;
