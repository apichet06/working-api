import { Router } from "express";
import * as controller from './diecode.controller.js'
import { Auth } from "../../middlewares/auth.js";

const diecode = Router()

diecode.use(Auth);
diecode.get("/", controller.list)
diecode.post("/", controller.create)
diecode.put("/:die_id", controller.update)
diecode.delete("/:die_id", controller.remove)

export default diecode
