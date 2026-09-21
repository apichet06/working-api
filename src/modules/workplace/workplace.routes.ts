import { Router } from "express";
import * as controller from "./workplace.controller.js";
import { Auth } from "../../middlewares/auth.js";

const router = Router();
router.use(Auth);
router.get("/", controller.list);

export default router;
