import { Router } from "express";
import * as controller from './master.controller.js'
import { Auth } from "../../middlewares/auth.js";


const workingmaster = Router()

workingmaster.use(Auth);
workingmaster.get("/", controller.ListWorkingMaster)
workingmaster.get("/history", controller.ListWorkingMasterHistory)
workingmaster.post("/", controller.create)
workingmaster.put("/:w_id", controller.update)
workingmaster.delete("/:w_id", controller.remove)

export default workingmaster