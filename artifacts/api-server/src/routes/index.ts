import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import summonerRouter from "./summoner";
import analysisRouter from "./analysis-v2";
import championRouter from "./champion";
import matchRouter from "./match";
import aiAnalysisRouter from "./ai-analysis";
import aiCoachRouter from "./ai-coach";
import cardRouter from "./card";
import adminRouter from "./admin";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Public
router.use(healthRouter);
router.use("/auth", authRouter);

// All other API requires authentication
router.use(requireAuth);
router.use("/summoner", summonerRouter);
router.use("/summoner", analysisRouter);
router.use("/summoner", championRouter);
router.use("/summoner", aiAnalysisRouter);
router.use("/match", matchRouter);
router.use("/coach", aiCoachRouter);
router.use("/card", cardRouter);
router.use("/admin", adminRouter);

export default router;
