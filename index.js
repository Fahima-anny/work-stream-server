const express = require("express") ;
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express() ;
const cors = require('cors')
require('dotenv').config() ;
const port = process.env.PORT || 5000 ;

app.use(cors()) ;
app.use(express.json()) ;


const uri = `mongodb+srv://${process.env.VITE_MONGO_USER}:${process.env.VITE_MONGO_PASS}@cluster0.ohdc4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const userCollection = client.db("workStreamDB").collection("users");

app.post("/users", async(req, res) => {
    const userInfo = req.body ;
    console.log(userInfo);
    const result = await userCollection.insertOne(userInfo) ;
    res.send(result) ;
})

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("My Server is running bro") ;
}) ;

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})