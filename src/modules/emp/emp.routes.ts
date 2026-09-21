import Router from "express";
import * as emp from "./emp.cotroller";
import { Auth } from "../../middlewares/auth";

const emprouter = Router();

emprouter.use(Auth);
emprouter.get("/", emp.list);
export default emprouter;
