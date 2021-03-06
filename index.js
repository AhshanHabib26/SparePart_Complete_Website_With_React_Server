const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middlle Ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_ADMIN}:${process.env.USER_PASS}@cluster0.b30yd.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Verify JSON WEB TOKEN Function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

// Main Funtion Start Here

async function motoRun() {
  try {
    await client.connect();

    const productCollection = client
      .db("MotoCollection")
      .collection("products");
    const userCollection = client.db("MotoCollection").collection("user");
    const productsCollection = client
      .db("MotoCollection")
      .collection("userproducts");
   const paymentCollection = client
      .db("MotoCollection")
      .collection("userPayment");
   const reviewCollection = client
      .db("MotoCollection")
      .collection("reviews");
      const quoteCollection = client
      .db("MotoCollection")
      .collection("quoteOrder");
      const userInfoCollection = client
      .db("MotoCollection")
      .collection("userInfo");
      const blogCollection = client
      .db("MotoCollection")
      .collection("blogPost");


      // Blog Post API
      app.get('/blogPost', async (req, res) =>{
        const dataPost = await blogCollection.find().toArray()
        res.send(dataPost)
      })

      // User Info Collection API Start Here

      app.post('/userInfo', async(req, res) =>{
        const data = req.body
        const result = await userInfoCollection.insertOne(data)
        res.send(result)
      })

      app.put("/userInfo/:email", async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { Email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await userInfoCollection.updateOne(filter, updateDoc, options);
        res.send(result);
      });

      app.get('/userInfo/:email', async(req, res) =>{
        const email = req.params.email;
        const user = await userInfoCollection.findOne({Email: email})
        res.send(user)
      })


      // Main Page Input API

      app.post('/quote', async(req, res) =>{
        const data = req.body
        const result = await quoteCollection.insertOne(data)
        res.send(result)
      })


      // Customer Review Collect API

      app.post('/review', async(req, res) =>{
        const data = req.body
        const result = await reviewCollection.insertOne(data)
        res.send(result)
      })

      app.get('/review', async(req, res) =>{
        const query = {};
        const data = reviewCollection.find(query);
        const result = await data.toArray();
        res.send(result);
        
      })


    // Main Product API  

    app.get("/product", async (req, res) => {
      const query = {};
      const data = productCollection.find(query);
      const result = await data.toArray();
      res.send(result);
    });

    app.post("/product", async (req, res) => {
      const query = req.body;
      const data = productCollection.insertOne(query)
      res.send(data);
    });

    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // Payment GetWay API


    app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
      const product = req.body;
      const price = product.TotalAmount;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: 'usd',
        payment_method_types:['card']
      });
      res.send({clientSecret: paymentIntent.client_secret})
    });


    // USer And Admin API

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { Email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ Email: email }, process.env.JWT_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });

    app.get("/user", verifyJWT, async (req, res) => {
      const query = {};
      const data = userCollection.find(query);
      const result = await data.toArray();
      res.send(result);
    });

     app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userCollection.findOne({Email: email})
      const userAdmin = user.role === 'admin'
      res.send({admin: userAdmin})
    })

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodeEmail = req.decoded.Email;
      const decodeResult = await userCollection.findOne({ Email: decodeEmail });
      if (decodeResult.role === "admin") {
        const filter = { Email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
       return res.send(result);
      } else {
        return res.status(403).send({ message: "Forbiden Access" });
      }
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ Email: email });
      const userAdmin = user.role === "admin";
      res.send({ admin: userAdmin });
    });

    // User Products Collection API

    app.post("/userproducts", async (req, res) => {
      const data = req.body;
      const query = await productsCollection.insertOne(data);
      res.send(query);
    });

    app.get( "/userproducts", async (req, res) =>{
      const data = await productsCollection.find().toArray()
      res.send(data)
    })

    app.get("/userproducts/:id", async(req, res) =>{
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    })

      app.delete("/userproducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });


    app.patch("/userproducts/:id", async(req, res) =>{
      const id = req.params.id;
      const data = req.body
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { 
          paid: true,
          transactionId: data.transaction
        },
      };
      const updateResult = await productsCollection.updateOne( query, updateDoc);
      const result = await paymentCollection.insertOne(data)
      res.send(result);
    })

  
    app.get("/userproducts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodeEmail = req.decoded.Email;
      if (email === decodeEmail) {
        const query = { Email: email };
        const additem = productsCollection.find(query);
        const result = await additem.toArray();
        return res.send(result);
      } else {
        return res.status(403).send({ message: "Forbiden Access" });
      }
    });
  } finally {
  }
}
motoRun().catch(console.dir());

app.get("/", (req, res) => {
  res.send("Welcome! Spare Parts Manufacturing Website - ( AHSHAN HABIB )");
});

app.listen(port);
