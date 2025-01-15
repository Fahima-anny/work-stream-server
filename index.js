const express = require("express") ;
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
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


    // jwt api 
    app.post("/jwt", async (req, res) => {
      const user = req.body ;
      const token = jwt.sign(user, process.env.VITE_SECRET_KEY, {expiresIn: '5h'}) ;
      res.send({token}) ;
    })


    // users api 
app.post("/users", async(req, res) => {
    const userInfo = req.body ;
    console.log(userInfo);

    // if user already exits dont insert user 
    const query = {email: userInfo.email} ;
    const userExits = await userCollection.findOne(query) ;
    if(userExits){
      return res.send({message: "user already exists", insertedId: null})
    }

    // if not insert user 
    const result = await userCollection.insertOne(userInfo) ;
    res.send(result) ;
})

app.put("/users/:email", async(req, res) => {
const updatedInfo = req.body ;
const filter = {email: req.params.email} ;
const options = { upsert: true } ;
const updateDoc = {
  $set: {
   salary: updatedInfo.salary,
   image: updatedInfo.image,
   bankAcc: updatedInfo.bankAcc,
   designation: updatedInfo.designation,
   role: "Employee",
   isVerified: false,
   isActive: true,
  },
};
const result = await userCollection.updateOne(filter,updateDoc,options) ;
res.send(result) ;
})

app.get("/users/admin/:email", async(req, res) => {
    const email = req.params.email ;
    const query = {email: email} ;
    const user = await userCollection.findOne(query) ;
    let admin = false ;
    if(user){
        admin = user?.role === "admin" ;
    }
    res.send({admin})
})

app.get("/users/:email", async(req, res) => {
  const email = req.params.email ;
  console.log(email);
  const query = {email: email} ;
  const user = await userCollection.findOne(query) ;
  console.log(user.role);
res.send(user.role) ;
})

app.get("/users/hr/:email", async(req, res) => {
    const email = req.params.email ;
    const query = {email: email} ;
    const user = await userCollection.findOne(query) ;
    let hr = false ;
    if(user){
        hr = user?.role === "HR" ;
    }
    res.send({hr}) ;
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