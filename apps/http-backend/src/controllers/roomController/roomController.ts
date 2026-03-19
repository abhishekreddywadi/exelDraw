import { createRoomType } from '@repo/common';
import { prisma } from '@repo/db';
import {Request,Response} from 'express';
// export const 


// Function to handle room creation
export const createRoom = async(req: Request, res: Response) => {
    // Log incoming request for debugging
    console.log("Create room request body:", req.body);
    console.log("User from middleware:", req.userId);

    // Validate request body against schema
    const parsedRoomData = createRoomType.safeParse(req.body);

    // Log validation result
    console.log("Validation success:", parsedRoomData.success);
    if (!parsedRoomData.success) {
        console.log("Validation errors:", parsedRoomData.error.errors);
    }

    // Return validation errors if parsing fails
    if (!parsedRoomData.success) {
        return res.status(400).json({
            message: "Invalid data provided",
            errors: parsedRoomData.error.errors,
            received: req.body
        });
    }
 try{
const createdRoomData = await prisma.room.create({
    data:{
        slug:parsedRoomData.data.slug,
        authorId:parsedRoomData.data.userId
    }
})
return res.status(200).json({
    roomId:createdRoomData.Id
})
 }catch(e){
 return res.json({
    // @ts-ignore
    message:`db error while saving ${e.message}`
 })
 }
}