import { Router } from "express";
import * as controller from './action.controller.js'
import { Auth } from "../../middlewares/auth.js";

const action = Router()

// เรียกจาก Task Scheduler ของระบบเท่านั้น ต้องมาก่อน action.use(Auth) เพื่อไม่ให้ต้องใช้ JWT
action.put("/auto-close", controller.UpdateWAJobAutoSystem)

action.use(Auth);

action.get("/list", controller.list)
action.get("/", controller.listForCalendar)
action.post("/", controller.create)
action.put("/:wa_id", controller.UpdateWActionsJob)
action.put("/:wa_id/admin", controller.UpdateWActionsJobByAdmin)
action.put("/:wa_id/detail", controller.UpdateWActionsJobDetail)

export default action