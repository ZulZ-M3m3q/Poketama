import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pokemonRouter from "./pokemon";
import saveRouter from "./save";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pokemonRouter);
router.use(saveRouter);

export default router;
