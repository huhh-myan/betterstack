// console.log("Hello via Bun!");
import express from "express";
import { db } from "@repo/db-prisma/db";
// import type { Request, Response } from "express";
const port = 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.post('/signup',async (req, res)=>{

    const { username, password } = req.body;
    //verifying using zod


    try{
        const id = await db.orm.public.User.create({
            username,
            password
        })
        //dont return password id is the whole user object
        return res.json({
            user_id: id
        })
    }catch(e){
        return res.status(409).json({
            message: "error creating user!",
            error: e
        })
    }


})
app.post('/signin', async (req, res)=>{

    const { username, password } = req.body;
    //verifying using zod
    //jwt key assigning or cookies session

    try{
        if (!username || !password){ throw Error("enter username/password pls") };

        const user = await db.orm.public.User.first({
            username
        })
        if(!user || user.password !== password){ throw Error("Invalid Creds! versuche es noch einmal") };
        //hashing of password
        //check password separate if wrong then throw error
        // error type defining decide on if or not to use library
        //conversion to jwt or session cookie

        return res.json({
            user_id: user.id, 
            login_key: "JWT or Session Cookies"
        })
    }catch(error){
        return res.status(409).json({
            message: "error!",
            meme : `${(error as Error).message}`,
        })
    }

})

app.get('/user/:id', (req, res)=>{

})

//Website
app.post('/user/website/create',async (req, res)=>{
    const { url, user_id } = req.body;
    // user_id will come from the middle ware not req.body
    try {
        const website = await db.orm.public.Website.create({ 
            url: url,
            user_id
        })

        return res.json({
            website
        })

    } catch (error) {
        return res.status(400).json({
            message: "error message!",
            error
        })
    }
})

app.get('/user/website/:id',async (req, res)=>{
    const { id } = req.params;
    // or take in url from input name,
    // what if it should have multiple search options like name url and other

    try {
        const website = await db.orm.public.Website.first({
            id: id
        })

        //add status code to positive response also 
        return res.status(200).json({
            website,
        })
    } catch (error) {
        return res.json(400).json({
            error,
            message: "error fetching website!"
        })
    }
})


//Regions
app.get('/region/list', (req,res)=>{

})

app.post('/region/create', (req, res)=>{

})

// app.post('/website  ')



// app.get('/weee',async (req, res)=>{

//     try{
//         await db.orm.public.User.create({
//         username: "test1@test.com",
//         password: "test1"
//     })
//     }catch(e){

//         console.log(e);
//         return res.json({
//             message: "error!",
//             err: e,
//         })
//     }   
//     res.json({
//         message: "You have reached the / endpoint mostly called as home"
//     })
// })



app.listen(port, ()=>{
    console.log(`Server is listening on port: ${port}`);
})