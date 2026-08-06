import { Router } from "express";
import * as controller from './machinecode.controller.js'
import { Auth } from "../../middlewares/auth.js";

const machinecode = Router()

machinecode.use(Auth);
machinecode.get("/", controller.list)
machinecode.post("/", controller.create)
machinecode.put("/:mac_id", controller.update)
machinecode.delete("/:mac_id", controller.remove)

export default machinecode
