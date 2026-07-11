import { Router, type IRouter } from "express";
import legacyAnalysisRouter from "./analysis";
import { enhanceAnalysisV2 } from "../lib/performance-score-v2";

const router: IRouter = Router();

router.use((req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    try {
      return originalJson(enhanceAnalysisV2(body));
    } catch (error) {
      req.log?.error?.({ error }, "Algorithm V2 post-processing failed");
      return originalJson(body);
    }
  }) as typeof res.json;

  return legacyAnalysisRouter(req, res, next);
});

export default router;
