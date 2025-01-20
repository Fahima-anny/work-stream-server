require('dotenv').config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
const stripe = require("stripe")(process.env.VITE_STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://workstream-12.web.app",
    ],
  })
);
app.use(express.json());


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
    const payrollCollection = client.db("workStreamDB").collection("payroll");
    const adminMailCollection = client.db("workStreamDB").collection("adminMails");

    // all verify api 
    // verify Token Middleware 
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token",req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.VITE_SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        // console.log("decoded",decoded.role);
        next();
      })
    }

    const verifyAdmin = (req, res, next) => {
      const role = req.decoded.role;
      if (role !== "admin") {
        return res.status(403).send({ message: "Forbidden Access" })
      }
      next()
    }

    app.post("/adminMails", verifyToken, async(req, res) => {
      const mailData = req.body ;
      const result = await adminMailCollection.insertOne(mailData) ;
      res.send(result) ;
    })

    app.get("/adminMails", verifyToken, verifyAdmin,  async (req, res) => {
const result = await adminMailCollection.find().toArray() ;
res.send(result) ;
    })

    const verifyHR = (req, res, next) => {
      const role = req.decoded.role;
      if (role !== "HR") {
        return res.status(403).send({ message: "Forbidden Access" })
      }
      next()
    }

    const verifyEmployee = (req, res, next) => {
      const role = req.decoded.role;
      // console.log("from verify employee", role);
      const checkEmployee = role === "Employee"
      if (!checkEmployee) {
        // console.log("vul manus");
        return res.status(403).send({ message: "Forbidden Access" })
      }
      next()
    }


    // jwt api 
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.VITE_SECRET_KEY, { expiresIn: '5h' });
      res.send({ token });
    })


    app.post("/payroll", verifyToken, verifyHR, async (req, res) => {
      const payrollData = req.body;
      // console.log(payrollData)
      const { email, month, year } = payrollData;

      const existingPayroll = await payrollCollection.findOne({ email, month, year });
      // console.log(existingPayroll);

      if (existingPayroll) {
        return res.send({
          message: "Payment for this employee has already been requested for the same month and year.",
        });
      }
      const result = await payrollCollection.insertOne(payrollData);
      res.send(result);
    })


    app.get("/payroll", verifyToken, verifyAdmin, async (req, res) => {
      const result = await payrollCollection.find().toArray();
      res.send(result);
    })

    app.get("/payroll/:email", verifyToken, verifyEmployee, async (req, res) => {
      const email = req.params.email;
      // console.log(req.query);

      const page = parseInt(req.query.page) || 1;
      const size = parseInt(req.query.size) || 5;

      const query = { email: email, transactionId: { $exists: true, $ne: null } };
      const totalCount = await payrollCollection.countDocuments(query);

      const ddd = await payrollCollection.find(query).sort({ year: -1, month: -1 }).toArray()
      // console.log(ddd);

      const result = await payrollCollection
        .aggregate([
          // Match the query
          { $match: query },
          // Add fields to ensure year and month are treated as numbers
          {
            $addFields: {
              yearNumeric: { $toInt: "$year" },
              monthNumeric: { $toInt: "$month" },
            },
          },
          // Sort by year and month in descending order
          { $sort: { yearNumeric: -1, monthNumeric: -1 } },
          // Skip and limit for pagination
          { $skip: (page - 1) * size },
          { $limit: size },
        ])
        .toArray();

      res.send({
        data: result, // Paginated and filtered data
        totalCount, // Total number of filtered records
        currentPage: page, // Current page number
        pageSize: size, // Items per page
      });
    })

    app.get("/payroll/bar/:email", verifyToken, verifyHR, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await payrollCollection.aggregate([
        // Match the query
        { $match: query },
        // Add fields to ensure year and month are treated as numbers
        {
          $addFields: {
            yearNumeric: { $toInt: "$year" },
            monthNumeric: { $toInt: "$month" },
          },
        },
        // Sort by year and month in ascending order
        { $sort: { yearNumeric: 1, monthNumeric: 1 } },
      ]).toArray()
      // console.log("bar chart", result);
      res.send(result)
    })

    app.patch("/payroll/:id", verifyToken, verifyAdmin, async (req, res) => {
      const updatedData = req.body;
      // console.log(updatedData);
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      Option = { upsert: true };
      const updatedDoc = {
        $set: {
          transactionId: updatedData.transactionId,
          paymentDate: updatedData.paymentDate
        }
      }
      const result = await payrollCollection.updateOne(query, updatedDoc, Option);
      res.send(result);
    })

    // work sheet related api 
    app.post("/work-sheet", verifyToken, verifyEmployee, async (req, res) => {
      const workSheetData = req.body;
      // console.log(workSheetData);
      const result = await workSheetCollection.insertOne(workSheetData);
      res.send(result)
    })

    app.get("/work-sheet", verifyToken, async (req, res) => {
      const result = await workSheetCollection.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "email",
            foreignField: "email",
            as: "userInfo"
          },
        },
        {
          $unwind: "$userInfo"
        },
        {
          $project: {
            _id: 1,
            email: 1,
            task: 1,
            date: 1,
            hoursWorked: 1,
            userName: "$userInfo.name"
          },
        },
      ]).toArray();
      res.send(result)
    })

    app.patch("/work-sheet/:id", verifyToken, verifyEmployee, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          task: updatedData.task,
          date: updatedData.date,
          hoursWorked: updatedData.hoursWorked,
        }
      }
      const result = await workSheetCollection.updateOne(query, updateDoc);
      res.send(result);
    })

    app.delete("/work-sheet/:id", verifyToken, verifyEmployee, async (req, res) => {
      const workId = req.params.id;
      // console.log(workId);
      const query = { _id: new ObjectId(workId) };
      const result = await workSheetCollection.deleteOne(query);
      res.send(result);
    })


    app.get("/work-sheet/:email", verifyToken, verifyEmployee, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      // console.log(email);
      const result = await workSheetCollection.find(query).toArray();
      res.send(result)
    })



    // users api 
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      // console.log(userInfo);

      // if user already exits dont insert user 
      const query = { email: userInfo.email };
      const userExits = await userCollection.findOne(query);
      if (userExits) {
        return res.send({ message: "user already exists", insertedId: null })
      }

      // if not insert user 
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    })

    app.get("/users/verified", verifyToken, verifyAdmin, async (req, res) => {
      const query = { isVerified: true }
      const users = await userCollection.find(query).toArray();
      res.send(users);
    })

    app.patch("/users/:id", verifyToken, verifyHR, async (req, res) => {
      const status = req.body.status;
      const id = req.params.id;
      // console.log(id,status);
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          isVerified: status
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.patch("/users/fire/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          isActive: false
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.patch("/users/make-admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "HR"
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.patch("/users/promotion/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          salary: updatedData.salary
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.get("/users/fired", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = { email: email };
      const result = await userCollection.findOne(query);
      // console.log(result);
      res.send(result);
    })

    app.put("/users/:email", async (req, res) => {
      const updatedInfo = req.body;
      const filter = { email: req.params.email };
      const options = { upsert: true };
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
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    })

    app.get("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email: email };
      const user = await userCollection.findOne(query);
      // console.log(user.role);
      res.send(user?.role);
    })


    app.get("/users/role/:email", verifyToken, async (req, res) => {

      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      const role = req.decoded.role;
      // console.log(email,role);

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "Forbidden Access" })
      }

      if (role === 'admin') {
        return res.send('admin');
      }

      if (role === 'HR') {
        return res.send('HR');
      }
      if (role === "Employee") {
        return res.send('Employee')
      }

    })


    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      const result = users.filter(u => u.role === "Employee")
      res.send(result);
    })

    app.get("/users/id/:id", verifyToken, verifyHR, async (req, res) => {
      const id = req.params.id;
      // console.log(req);
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send(result);
    })


    // payment api 
    app.post("/create-payment-intent", verifyToken, verifyAdmin, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log("amount = ", amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ["card"],
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
  res.send("My Server is running bro");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
})