import { WebSocketServer } from "ws";
import jwt from 'jsonwebtoken'
import { JsonWebTokenError } from "jsonwebtoken";
const wss = new WebSocketServer({port:8080});
wss.on('connection',(ws,request)=>{
ws.on("error",console.error);
const url = request.url;
if(url){
    return;
}
const queryParams = new URLSearchParams(url?.split("?")[1]);
const token  = queryParams.get('token') ?? "";
const userToken = jwt.verify(token,"MY_SECRET_JWT_TOKEN");
// @ts-ignore
if( !userToken || !userToken?.userId){
    ws.close();
    return;
}
ws.on("message",(data)=>{
    console.log("received Data " +  data);
})
})