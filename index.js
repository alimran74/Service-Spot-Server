const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@imran.chugnik.mongodb.net/?retryWrites=true&w=majority&appName=Imran`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("serviceSpot").collection("services");

    const reviewCollection = client.db("serviceSpot").collection("reviews");

    // services api -----------

    // post api --
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    // get api for featured services --
    app.get("/services/featured", async (req, res) => {
      try {
        const services = await serviceCollection.find().limit(6).toArray();
        res.send(services);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch featured services" });
      }
    });

    // get api for each card

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });


    // get api for filter data
app.get("/categories", async (req, res) => {
  try {
    console.log("GET /categories endpoint hit");
    const categories = await serviceCollection.aggregate([
  { $group: { _id: "$category" } },
  { $project: { category: "$_id", _id: 0 } }
]).toArray();

res.send(categories.map(cat => cat.category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send({ error: "Failed to fetch categories" });
  }
});




    // api for all services
    app.get("/services", async (req, res) => {
  try {
    const search = req.query.search || "";
    const email = req.query.email;
    const category = req.query.category;

    let andConditions = [];

    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { company: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (email) {
      andConditions.push({ userEmail: email });
    }

    if (category && category !== "All") {
      andConditions.push({ category });
    }

    const finalQuery = andConditions.length > 0 ? { $and: andConditions } : {};

    const services = await serviceCollection.find(finalQuery).toArray();
    res.send(services);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch services." });
  }
});



    // api for update operation

    app.put("/services/:id", async (req, res) => {
      const id = req.params.id;
      const updatedService = { ...req.body };

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid service ID" });
      }

      delete updatedService._id;

      try {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: updatedService,
        };

        const result = await serviceCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Service not found" });
        }

        res.send({ message: "Service updated successfully", result });
      } catch (error) {
        console.error("PUT /services/:id error:", error);
        res
          .status(500)
          .send({ message: "Failed to update service", error: error.message });
      }
    });

    // api for delete operation

    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const result = await serviceCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "No service found to delete" });
        }

        res.send(result);
      } catch (error) {
        console.error("Delete failed:", error);
        res.status(500).send({ error: "Internal server error during delete" });
      }
    });

    // review api --------------------

    // post review
    app.post("/reviews", async (req, res) => {
      try {
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to post review" });
      }
    });

    // get review

    app.get("/reviews/:serviceId", async (req, res) => {
      const serviceId = req.params.serviceId;
      try {
        const reviews = await reviewCollection
          .find({ serviceId: serviceId })
          .toArray();
        res.send(reviews);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch reviews" });
      }
    });

    // get review for my review

    app.get("/reviews", async (req, res) => {
      const userEmail = req.query.email;

      if (!userEmail) {
        return res.status(400).send({ error: "Email is required" });
      }

      try {
        const userReviews = await reviewCollection
          .find({ email: userEmail })

          .sort({ createdAt: -1 })
          .toArray();
        res.send(userReviews);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch user reviews" });
      }
    });

    // put review for update

    app.put("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const { text, rating } = req.body;

      try {
        const result = await reviewCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              text,
              rating,
            },
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update review" });
      }
    });


    // delete api for my review

    app.delete('/reviews/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await reviewCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete review' });
  }
});


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Service Spot Cooking");
});

app.listen(port, () => {
  console.log(`Service Spot Running on port ${port} `);
});