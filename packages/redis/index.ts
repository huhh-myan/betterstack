import { createClient, type RedisClientType } from "redis";


async function redisConnector() {
    const client = createClient();

    client.on('error', err => console.log('Redis Client Error', err));

    const connectedClient = await client.connect();

    return connectedClient;
}

// type WebsiteAdd = {
//     website: String,
//     id: String
// }

interface WebsiteXadd {
    url : string,
    id : string
}


const redisClient = await redisConnector();



export async function createDuplicateRedisClient(){
    const redisClientWorker = redisClient.duplicate();
    const duplicateClient = await redisClientWorker.connect()
    return duplicateClient;
}


export async function xAdd({url, id}:WebsiteXadd) {
    
    const streamValue = await redisClient.xAdd('bstack:website', '*', {
        'url': `${url}`,
        'id': `${id}`
    })

    // return streamValue
}


//try using Promise.settled or Promise.allSettled
export async function xAddBulk(websites: WebsiteXadd[]){
    for(const website of websites){
        await xAdd( website );
    }
}


export async function xRead() {
    // try{

    // }catch(e){
    //     return 
    // }
    const readValue = await redisClient.xRead({ key: 'bstack:website', id:  '>'})
}



// the type of readvalue received with
    // {
        // name: streamName,
        // messages: [
        //     {
        //         id: id of the thingy in stream,
        //         message: {
        //             streamdata structured accordingly
        //         }
        //     }
        // ]
    //}
// [{ name: 'race:italy', messages: [{ id: '1692629925771-0', message: { rider: 'Castilla' } }] }]
export async function xReadGroup(consumerGroup: string, workerId: string, redisClientWorker:RedisClientType){
    //replace the stream name bstack:website with global variable so that no need to manually hard code
    // await redisClientWorker.connect();
    const readValue = await redisClientWorker.xReadGroup(`${consumerGroup}`, workerId, {
            key: 'bstack:website',
            id: '>'
        },{
            'COUNT': 5,
            'BLOCK': 0
        }
    );

    return readValue;
}

export async function xAck(consumerGroup:string, streamId: string) {
    // await redisClientWorker.connect();
    const ackedValue = await redisClient.xAck('bstack:website', consumerGroup, streamId);
}

// xAddBulk([{
//     "url": "www.google1.com",
//     "id": "1prjapjr2134123"
// },
// {
//     "url": "www.google2.com",
//     "id": "1prjapjr3232334234"
// },
// {
//     "url": "www.google3.com",
//     "id": "1prjapjr32423423423423423342"
// },{
//     "url": "www.google4.com",
//     "id": "1prjapjr4543463563"
// }])



// const redisClient = createClient();

// redisClient.on('error', err => console.log('Redis Client Error', err));

// const connectedClient = await redisClient.connect();
// xReadGroup('')