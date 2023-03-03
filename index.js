//https://github.com/ProgrammingHeroWC4/warehouse-management-server-side-Sukanto01899
const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.port || 5000;
app.use(cors());
app.use(express.json());

const uri = process.env.DB_URI
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next)=>{
    const authHeaders = req.headers.authorization;
    if(!authHeaders){
        return res.status(401).send({message: 'unauthorize'})
    }
    const token = authHeaders.split(' ')[1];
    jwt.verify(token, process.env.access_token, (err, decoded)=>{
        if(err){
            return res.status(403).send({message: 'Forbidden'})
        }
        req.decoded = decoded;
        next()
    })
}

function run(){
    try{
        client.connect();
        const database = client.db('transport');
        const inventory = database.collection('inventory');
        const blogs = database.collection('blogs');

        app.get('/', (req, res)=>{
            res.send('hello world')
        })

        // Get 1 inventory
        app.get('/inventory/:id', async (req, res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const inventoryDetails = await inventory.findOne(filter);
            res.send(inventoryDetails)
        })
        
        // get all inventory
        app.get('/all-inventory',async (req, res)=>{
            const query = {};
            const cursor = inventory.find(query);
            const allInventory = await cursor.toArray();
            res.send(allInventory)
        })

        // pagination all inventories
        app.get('/inventories',async (req, res)=>{
            const limit = parseInt(req.query.limit);
            const page = parseInt(req.query.page);
            const searchQuery = req.query.query;
            const query = searchQuery ? {name: searchQuery} : {};
            const cursor = inventory.find(query).skip(limit * page).limit(limit);
            const allInventory = await cursor.toArray();
            const estimate = await inventory.estimatedDocumentCount()
            res.send({allInventory, estimate})
        })

        // Pagination & personal inventory
        app.get('/my-inventory', verifyJWT,async (req, res)=>{
            const decodedUid = req.decoded.uid;
            const uidQuery = req.query.uid
            const limit = parseInt(req.query.limit);
            const page = parseInt(req.query.page);
            const searchQuery = req.query.query;
            
            if(decodedUid === uidQuery){
                const query = searchQuery ? {name: searchQuery, uid: uidQuery} : {uid : uidQuery};
                const cursor = inventory.find(query).skip(limit * page).limit(limit);
                const allInventory = await cursor.toArray();
                const estimate =await inventory.estimatedDocumentCount();
                res.send({allInventory, estimate})
            }else{
                res.send(403).send({message: 'Forbidden'})
            }
        })

        // Publish a inventory
        app.post('/inventory', async (req, res)=>{
            const inventoryDetails = req.body.inventory;
            const result = await inventory.insertOne(inventoryDetails);
            res.send(result)
        })

        // Get jwt token
        app.post('/login',async (req, res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.access_token, {expiresIn:'1d'});
            res.send({token})
        })

        // Delete a inventory
        app.delete('/remove/:id', async (req, res)=>{
            const id = req.params.id
            const query = {_id: new ObjectId(id)};
            const result = await inventory.deleteOne(query);
            if(result.deletedCount === 1){
                res.send({deleted: true})
            }else{
                res.send({deleted: false})
            }
        })

        // Deliver the inventory item
        app.put('/deliver/:id', async (req, res)=>{
            const id = req.params.id
            const delivered = parseInt(req.body.delivered);
            const previousQuantity = parseInt(req.body.previousQuantity);
            const previousSold = parseFloat(req.body.previousSold);
            const newQuantity = previousQuantity - delivered;
            const newSold = previousSold + delivered;

            const filter = {_id: new ObjectId(id)};
            const option = {upsert: true};
            const updateDoc = {$set: {quantity: newQuantity, sold: newSold}};
            if(previousQuantity < 1){
                return res.send({message: 'Quantity is low'})
            }
            const result = await inventory.updateOne(filter, updateDoc, option);
            res.send(result)
        })

        // add inventory quantity
        app.put('/add-quantity/:id', async (req, res)=>{
            const id = req.params.id;
            const count = parseInt(req.body.count);
            const previousQuantity = parseInt(req.body.previousQuantity);
            const total = previousQuantity + count;

            const filter = {_id: new ObjectId(id)};
            const option = {upsert: true};
            const updateDoc = {$set: {quantity: total}};

            const result = await inventory.updateOne(filter, updateDoc, option);
            res.send(result)
        })


        // Add a blog
        app.post('/add-blog', async (req, res)=>{
            const blogData = req.body.blogData;
            const result = await blogs.insertOne(blogData);
            console.log(blogData)

        })

        //Delete a blog
        app.delete('/delete-blog/:id', async (req, res)=>{
            const id = req.params.id
            const query = {_id: new ObjectId(id)};
            const result = await blogs.deleteOne(query);
            if(result.deletedCount === 1){
                res.send({deleted: true})
            }else{
                res.send({deleted: false})
            }
        })

        //Get blog with pagination
        app.get('/blogs',async (req, res)=>{
            const limit = parseInt(req.query.limit);
            const page = parseInt(req.query.page);
            const searchQuery = req.query.query;
            const query = searchQuery ? {name: searchQuery} : {};
            const cursor = blogs.find(query).skip(limit * page).limit(limit);
            const allBlog = await cursor.toArray();
            const estimate = await blogs.estimatedDocumentCount()
            res.send({allBlog, estimate})
        })

        //Get single blog
        app.get('/blog/:id', async (req, res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const blogDetails = await blogs.findOne(filter);
            res.send(blogDetails)
        })
    }
    finally{}
};
run()

app.listen(port, ()=>{
    console.log("Server running")
})