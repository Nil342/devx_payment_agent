import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vendorsRouter from "./vendors";
import invoicesRouter from "./invoices";
import exceptionsRouter from "./exceptions";
import decisionsRouter from "./decisions";
import memoryRouter from "./memory";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vendorsRouter);
router.use(invoicesRouter);
router.use(exceptionsRouter);
router.use(decisionsRouter);
router.use(memoryRouter);
router.use(settingsRouter);

export default router;
