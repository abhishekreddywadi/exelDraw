import { Request, Response } from 'express';
import  jwt  from 'jsonwebtoken';
export const signInUser = (req:Request,res:Response)=>{
    const user = req.body.token;
    console.log(user);
    const userId = 1;
    const jsonToken = jwt.sign(
        {userId},
        "MY_SECRET_JWT_TOKEN")
    res.send("hello");
    res.json({
        jsonToken
    })
}
export const signUpUser = (req:Request,res:Response)=>{
    const user = req.body.token;
    console.log(user);
    res.send("hello");
}
// module.exports = {
//     signInUser
// }   