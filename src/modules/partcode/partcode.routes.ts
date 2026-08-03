import { Router } from "express";
import * as controller from './partcode.controller.js'
import { Auth } from "../../middlewares/auth.js";

const partcode = Router()

partcode.use(Auth);
partcode.get("/", controller.list)
partcode.post("/", controller.create)
partcode.put("/:part_id", controller.update)
partcode.delete("/:part_id", controller.remove)

export default partcode