import express, { Router } from 'express';
const router: Router  = express.Router();
import {signInUser, signUpUser} from "../../controllers/userController/userController";
import { createRoom } from '../../controllers/roomController/roomController';
router.post("/signin",signInUser)
router.post("/signup",signUpUser)
router.post("/create-room",createRoom)
export default router;