import * as jose from "jose";
import type { Request, Response, NextFunction } from "express";



// declare namespace express {
//     export
// }

export async function jsonMiddleware(req:Request, res: Response, next:NextFunction){
    const jwtToken = req.headers.authorization || " ";
    
    // transfer to .env generate a new key this key is the jose github repo
    const secret = new TextEncoder().encode(
        'cc7e0d44fd473002f1c42167459001140ec6389b7353f8088f4d9a95f2f596f2',
    )

    try {
        const { payload,  protectedHeader } = await jose.jwtVerify(jwtToken, secret)
        // const { sub, iat, exp } = payload;

        req.user_id = payload.sub ;
        next();

    } catch (error) {
        return res.status(400).json({
            message: "Authorization Error!",
            error
        })

        //redirect to login page
    }
}
