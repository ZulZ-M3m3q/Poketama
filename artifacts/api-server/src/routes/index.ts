import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pokemonRouter from "./pokemon";
import saveRouter from "./save";
import nfcRouter from "./nfc";
import tradeRouter from "./trade";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pokemonRouter);
router.use(saveRouter);
router.use(nfcRouter);
router.use(tradeRouter);

export default router;
