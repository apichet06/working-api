import { Router } from "express";
import * as controller from './detailmaster.controller.js'
import { Auth } from "../../middlewares/auth.js";

const detailmaster = Router()

detailmaster.use(Auth);
detailmaster.get("/", controller.list)
detailmaster.post("/", controller.create)
detailmaster.put("/:detail_id", controller.update)
detailmaster.delete("/:detail_id", controller.remove)

export default detailmaster
