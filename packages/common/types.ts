import z from "zod";

// Schema for user sign-in/signup validation
export const userSignIn = z.object({
    userName: z.string(),
    password: z.string()
})

// Schema for room creation validation
export const createRoomType = z.object({
    slug: z.string(),
    userId: z.number()  // Changed from z.int() to z.number()
})

// Schema for user room validation
export const userRoom = z.object({
    name: z.string()
})
