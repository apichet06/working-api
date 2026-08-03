import { Router } from "express";
import * as controller from './category.controller.js'
import { Auth } from "../../middlewares/auth.js";

const categorycode = Router()

categorycode.use(Auth);
categorycode.get("/", controller.list)
categorycode.post("/", controller.create)
categorycode.put("/:cc_id", controller.update)
categorycode.delete("/:cc_id", controller.remove)

export default categorycode