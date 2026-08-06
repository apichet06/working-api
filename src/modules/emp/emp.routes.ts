import Router from "express";
import * as emp from "./emp.cotroller";

const emprouter = Router();

emprouter.get("/", emp.list);
export default emprouter;