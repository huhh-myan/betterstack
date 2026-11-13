declare global{
    namespace Express {
        interface Request {
            user_id? : String 
        }
    }
}

export {}