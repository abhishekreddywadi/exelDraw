import express, { Router } from 'express';
const router: Router  = express.Router();
import {signInUser} from "../../controllers/userController/userController";
router.post("/signin",signInUser)
export default router;