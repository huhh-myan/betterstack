import { createClient } from "redis";



async function main(){
    //by default connects to localhost:6379
    const client = await createClient({
        url:"redis://localhost:6379"
    })
        .on('error', err=> console.log("Redis Client Error:", err))
        .connect();

    const res1 = await client.xAdd('bstack:website', '*', {
        'url':"www.website4.com",
        'id': '4'
    });
    console.log(res1);
    
    const res2 = await client.xAdd('bstack:website', '*', {
        'url':"www.website2`.com",
        'id': '2'
    });
    console.log(res2);

    const res3 = await client.xAdd('bstack:website', '*', {
        'url':"www.website3.com",
        'id': '3'
    });
    console.log(res3, '-------------\n');

    console.log(res1, res2, res3);
    
    client.destroy();
}


main();



