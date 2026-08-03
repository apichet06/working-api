import { Router } from "express";
import * as controller from './jobcode.controller.js'
import { Auth } from "../../middlewares/auth.js";

const jobcode = Router()

jobcode.use(Auth);
jobcode.get("/", controller.list)
jobcode.post("/", controller.create)
jobcode.put("/:job_id", controller.update)
jobcode.delete("/:job_id", controller.remove)

export default jobcode