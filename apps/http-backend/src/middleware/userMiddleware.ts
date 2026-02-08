import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken'

export const userMiddleware = (req:Request,res:Response,next : NextFunction)=>
{
    const userToken = req.headers["authorization"] ?? "";
    const userDecoded  = jwt.verify(userToken,"MY_SECRET_JWT_TOKEN")
    if(userDecoded){
        //@ts-ignore
        req.userId = userDecoded.userId;
        next();
    }else{
        res.status(403).json({
            message : "Unauthorized"
        })
    }

}