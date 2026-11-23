import { xAck, xReadGroup } from "@repo/redis-stream/index"
import axios from "axios";
import { db } from "@repo/db-prisma/db";

//region of worker
// const REGION_ID = process.env.REGION_ID!;
const REGION_ID = "1";

//need worker id to later distribute tasks from stream to distribute task to worker according to region
// const WORKER_ID = process.env.WORKER_ID!;
const WORKER_ID = "1";

if(!REGION_ID){
    throw new Error('REGION not provided!')
}

if(!WORKER_ID){
    throw new Error('Worker not provided!')
}


// need a redis stream function to create Consumer groups based on regions.

interface ReadGroupResult {
    id:string,
    message:{ 
        url:string, 
        id: string 
    }
}

//separate the fetch functions
//separate the db upload to another queue ig,
async function fetchWebsite(url:string, websiteId: string) {
    
}

async function main() {
    while(1){
        //read from the stream
        const websitesFromStream = await xReadGroup(REGION_ID, WORKER_ID);

        if(!websitesFromStream){
            //have to do something instead of throwing error 
            throw new Error('Stream empty')
        }

        // console.log(websitesFromStream[0]?.messages);

        //can use map function instead of this 
        for (const message of websitesFromStream[0]?.messages ){
            console.log(message);

            await xAck(REGION_ID, `${message.id}`)
        }
        //using map function 
        //writing the types for promises
        let promisesAxiosArray = await Promise.allSettled(websitesFromStream[0]?.messages.map(async ({id, message }: ReadGroupResult )=>{
            const url = message.url;
            const websiteId = message.id;

            //cant await this will hold up the thread ig so gotta promise all
            //the difference between promise all and not doing await, does await hold up the thread,? context switching
            const t1 = Date.now();
            try{
                const response = await axios.get(url);
                // const endTime = Date.now();
                const response_time_ms = Date.now() - t1;

                //there is a default createdAt but that is not the time at which the site
                // was queried but rather the time when the result was entered into the db
                await db.orm.public.WebsiteTicks.create({
                    response_time_ms: response_time_ms,
                    status: 'Up',
                    region_id: 1,
                    website_id: websiteId,
                });
            }catch(e){
                // const endTime = Date.now();
                const response_time_ms = Date.now()-t1;
                await db.orm.public.WebsiteTicks.create({
                    response_time_ms,
                    status: 'Down',
                    region_id: 1,
                    website_id: websiteId
                })
            }


            console.log(promisesAxiosArray);
            // take message.url and hit the site
            // put the result of the hit in db or an queue
            // then acknowledge to the stream that the thing has been done
        }))


        //call the website and store in db 

        //storage of website status to db routed through queue

        //then give acknowledgement to the the stream ig so that the next worker is not refed this shit
        // xAck(REGION_ID, '0');
    }
}


main();