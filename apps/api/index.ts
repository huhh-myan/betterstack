// console.log("Hello via Bun!");
import express from "express";
import { db } from "@repo/db-prisma/db";
// import type { Request, Response } from "express";
const port = 3000;

const app = express();


app.post('/website  ')



app.get('/',async (req, res)=>{

    await db.orm.public.User.create({
        email: "test1@test.com",
        username: "test1"
    })

    res.json({
        message: "You have reached the / endpoint mostly called as home"
    })
})



app.listen(port, ()=>{
    console.log(`Server is listening on port: ${port}`);
})