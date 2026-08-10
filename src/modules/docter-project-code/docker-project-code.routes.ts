import { Router } from "express";
import * as controller from './docter-project-code.controller.js'
import { Auth } from "../../middlewares/auth.js";

const docterProjectCode = Router()

docterProjectCode.use(Auth);
docterProjectCode.get("/mfgno", controller.listMfgNo)

export default docterProjectCode
