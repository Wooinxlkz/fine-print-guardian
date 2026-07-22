import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import documentsRouter from "./documents";
import watchesRouter from "./watches";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(documentsRouter);
router.use(watchesRouter);
router.use(dashboardRouter);

export default router;
