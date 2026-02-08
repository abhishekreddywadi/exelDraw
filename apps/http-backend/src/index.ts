import express from "express";
import userRoutes from './routes/userRoutes/userRoutes';
import { userMiddleware } from "./middleware/userMiddleware";

const app = express()
app.use(express.json())
// Mount the user routes
app.use('/users', userRoutes);
app.use('/rooms',userMiddleware, userRoutes);
app.listen(3004);