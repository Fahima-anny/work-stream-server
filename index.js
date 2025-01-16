const express = require("express") ;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const workSheetCollection = client.db("workStreamDB").collection("work-sheet");

// all verify api 
// verify Token Middleware 
const verifyToken = (req, res, next) => {
  // console.log("inside verify token",req.headers.authorization);
  if(!req.headers.authorization){
   return res.status(401).send({message: "Unauthorized Access"}) ;
  }
  const token = req.headers.authorization.split(" ")[1] ;
jwt.verify(token, process.env.VITE_SECRET_KEY, (err, decoded) => {
  if(err){
    return res.status(401).send({message: "Unauthorized Access"}) ;
  }
  req.decoded = decoded ;
  // console.log("decoded",decoded.role);
  next() ;
})
}

const verifyAdmin = (req, res, next) => {
  const role = req.decoded.role ;
  if(role !== "admin"){
    return res.status(403).send({message: "Forbidden Access"})
  }
  next()
}

const verifyHR = (req, res, next) => {
  const role = req.decoded.role ;
  if(role !== "HR"){
    return res.status(403).send({message: "Forbidden Access"})
  }
  next()
}

const verifyEmployee = (req, res, next) => {
  const role = req.decoded.role ;
  if(role !== "Employee"){
    return res.status(403).send({message: "Forbidden Access"})
  }
  next()
}


    // jwt api 
    app.post("/jwt", async (req, res) => {
      const user = req.body ;
      const token = jwt.sign(user, process.env.VITE_SECRET_KEY, {expiresIn: '5h'}) ;
      res.send({token}) ;
    })


    // work sheet related api 
app.post("/work-sheet", async(req, res) => {
  const workSheetData = req.body ;
  // console.log(workSheetData);
  const result = await workSheetCollection.insertOne(workSheetData) ;
  res.send(result)
})

// app.get("/work-sheet/:id", async(req, res) => {
//   const workId = req.params.id ;
//   // console.log(workSheetData);
//   const query = {_id : new ObjectId(workId)}
//   const result = await workSheetCollection.findOne(query) ;
//   res.send(result)
// })

app.patch("/work-sheet/:id", async(req, res) => {
  const id = req.params.id ;
  const updatedData = req.body ;
  console.log(id);
  const query = {_id: new ObjectId(id)} ;
  const updateDoc = {
    $set : {
      task: updatedData.task,
      date: updatedData.date,
      hoursWorked: updatedData.hoursWorked,
    }
  }
  const result = await workSheetCollection.updateOne(query, updateDoc) ;
  res.send(result) ;
})

app.delete("/work-sheet/:id", async(req, res) => {
  const workId = req.params.id ;
  console.log(workId);
  const query = {_id : new ObjectId(workId)} ;
  const result = await workSheetCollection.deleteOne(query) ;
  res.send(result) ;
})


app.get("/work-sheet/:email", async(req, res) => {
  const email = req.params.email ;
  const query = {email: email} ;
  console.log(email);
  const result = await workSheetCollection.find(query).toArray() ;
  res.send(result)
})



    // users api 
app.post("/users", async(req, res) => {
    const userInfo = req.body ;
    // console.log(userInfo);

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

app.get("/users/:email", async(req, res) => {
  const email = req.params.email ;
  // console.log(email);
  const query = {email: email} ;
  const user = await userCollection.findOne(query) ;
  // console.log(user.role);
res.send(user?.role) ;
})


app.get("/users/role/:email", verifyToken, async(req, res) => {

    const email = req.params.email ;
    const decodedEmail = req.decoded.email ;
    const role = req.decoded.role ;
    console.log(email,role);

    if(email !== decodedEmail){
      return res.status(403).send({message: "Forbidden Access"})
    }

    if(role === 'admin'){
       return res.send('admin') ;
    }

    if(role === 'HR'){
       return res.send('HR') ;
    }
    if(role === "Employee"){
      return res.send('Employee')
    }

})


// app.get("/users/hr/:email", async(req, res) => {
//     const email = req.params.email ;
//     const query = {email: email} ;
//     const user = await userCollection.findOne(query) ;
//     let hr = false ;
//     if(user){
//         hr = user?.role === "HR" ;
//     }
//     res.send({hr}) ;
// })



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