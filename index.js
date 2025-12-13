const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;


//middleware
app.use(express.json());
app.use(cors());
//middleware end


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7ptsepf.mongodb.net/?appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('NestCloth');
        const BannerCollection = db.collection('Banners');


        /////AL API HERE/////

        //Banner api
        app.post("/banners", async (req, res) => {
            try {
                const newBanner = req.body;

                if (!newBanner?.BannerUrl) {
                    return res.status(400).json({
                        success: false,
                        message: "BannerUrl is required"
                    });
                }

                const result = await BannerCollection.insertOne(newBanner);

                res.status(201).json({
                    success: true,
                    message: "Banner created successfully",
                    insertedId: result.insertedId
                });

            } catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
        //Banner api end

        /////AL API HERE END/////


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello NestCloth')
});

app.listen(port, () => {
    console.log(`NestCloth is running on port ${port}`)
})