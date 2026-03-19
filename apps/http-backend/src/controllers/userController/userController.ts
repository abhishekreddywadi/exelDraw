import { Request, Response } from 'express';
import  jwt  from 'jsonwebtoken';
import { userSignIn } from '@repo/common';
import { prisma } from '@repo/db';
// Function to handle user sign-in/login
export const signInUser = async(req:Request,res:Response)=>{
    // Validate the request body against the schema
    const userParsed = userSignIn.safeParse(req.body)
    if(!userParsed.success){
        return res.status(400).json({
            message:"please provide the credentials"
        })
    }

    // Find user in database by email/username
    const userData = await prisma.user.findFirst({
        where:{
            email:userParsed.data.userName
        }
    })

    // Check if user exists
    if(userData==null || !userData){
        return res.status(404).json({
            message:"user not found"
        })
    }

    // Generate JWT token for the authenticated user
    const jsonToken = jwt.sign(
        {userId:userData.Id,
            userEmail:userData.email
        },
        "MY_SECRET_JWT_TOKEN")

    // Return the token to the client
    return res.json({
        jsonToken,
        userId:userData.Id
    })
}
// Function to handle user registration/signup
export const signUpUser = async(req:Request,res:Response)=>{
    // Log incoming request body for debugging
    console.log("Request body:", req.body);

    // Parse the incoming request body directly (not wrapped in a 'token' property)
    const userData = userSignIn.safeParse(req.body)

    // Validate the request data against the schema
    if(!userData.success){
        console.log("Validation failed:", userData.error);
        return res.status(400).json({
            "message":"user data is not correct"
        })
    }

    try {
        // Create new user in the database
        const createdUser = await prisma.user.create({
            data:{
                email:userData.data.userName,
                password:userData.data.password
            }
        })

        // Check if user was created successfully
        if(!createdUser){
             return res.status(500).json({
                message:"failed to create the user"
            })
        }

        // Generate JWT token for the newly created user
        const userJwtToken = jwt.sign({
            userId:createdUser.Id,
            email:createdUser.email
        },
        "MY_SECRET_JWT_TOKEN")

        // Return the token to the client
        return res.status(201).json({
            token:userJwtToken
        })
    } catch (error:any) {
        // Handle any errors during user creation
        console.log("Full error:", error);
        console.log("Error code:", error.code);
        console.log("Error meta:", error.meta);

        // Check for unique constraint violation
        if(error.code === 'P2002'){
            return res.status(400).json({
                message:"User with this email already exists"
            })
        }

        return res.status(500).json({
            message:`error: ${error.message}`,
            code: error.code
        })
    }
}
// module.exports = {
//     signInUser
// }   