import { db } from "@repo/db-prisma/db";
import { xAddBulk, xAdd } from "@repo/redis-stream/index";



async function main(){
    try{
        let websiteList = await db.orm.public.Website.select( "id", "url" ).all();

        // console.log(websiteList);

        //this is being added one by one not together
        //this is not a bulk upload or promise.all its for loop for one entry upload using xAdd
        const addedSites = await xAddBulk(websiteList);
        // await xAdd({
            // "url": "nothing.com",
            // "id": "nothing so no"
        // })
        // console.log(addedSites);
    }catch(e){
        return {e , message: "Error Fetching all the websites!"}
    }
}

main();

// setInterval(()=>{
//     main()
// }, 3*60*1000)