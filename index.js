const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//Firebase Admin SDK
const admin = require("firebase-admin");

const serviceAccount = require("./NestCloth-firebase-admin-SDK.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
//Firebase Admin SDK end

//varify ID token
const varifyFBtoken = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    try {
        const idToken = token.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.decoded_email = decoded.email;

        next();
    }
    catch (err) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
}
//varify ID token end

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
        const userCollection = db.collection('userDB');
        const productCollection = db.collection('Products')
        const BannerCollection = db.collection('Banners');


        /////AL API HERE/////

        //UserS api
        app.post("/users", async (req, res) => {
            try {
                const newUser = req.body;
                const { email, displayName, photoURL } = newUser;

                // 1. Basic validation
                if (!email || !displayName || !photoURL) {
                    return res.status(400).json({
                        success: false,
                        message: "email, displayName and photoURL are required",
                    });
                }

                // 2. Check if user already exists
                const existingUser = await userCollection.findOne({ email });
                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: "User already exists",
                    });
                }

                // 4. Create new user object

                newUser.status = 'pending';
                newUser.UImode = 'dark';
                newUser.createdAt = new Date();

                // 5. Insert into DB
                const result = await userCollection.insertOne(newUser);

                res.status(201).json({
                    success: true,
                    message: "User created successfully",
                    userId: result.insertedId,
                });
            } catch (error) {
                console.error("Error creating user:", error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
        //
        app.get('/allusers/:email/role', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            res.send({ role: user?.role || 'buyer' });
        });
        //
        app.get('/allusers', varifyFBtoken, async (req, res) => {

            const searchText = req.query.searchText;
            const query = {};
            if (searchText) {
                query.$or = [
                    { displayName: { $regex: searchText, $options: 'i' } },
                    { email: { $regex: searchText, $options: 'i' } }
                ];
            }
            const cursor = userCollection.find(query).sort({ createdAt: -1 });
            const result = await cursor.toArray();
            res.send(result);
        });
        //
        app.get('/allusers', async (req, res) => {
            try {
                const result = await userCollection.find().sort({ createdAt: -1 }).toArray();
                res.status(200).json(result);

            } catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
        //
        app.patch('/allusers/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.statusUp;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    status: status,
                }
            }
            const result = await userCollection.updateOne(query, update);
            const udatedUser = await userCollection.findOne(query)
            res.send(result);
        });

        //UserS api end



        //Product Api
        app.post('/product', async (req, res) => {
            const newProduct = req.body;

            newProduct.SHP = false
            newProduct.createdAt = new Date();

            const result = await productCollection.insertOne(newProduct);
            res.send(result)
        });
        app.get('/products', async (req, res) => {
            try {
                const result = await productCollection.find().sort({ createdAt: -1 }).toArray();
                res.send(result);

            } catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
        //
        app.get('/product/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // ObjectId validation
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid product ID",
                    });
                }

                const query = { _id: new ObjectId(id) };
                const result = await productCollection.findOne(query);

                if (!result) {
                    return res.status(404).json({
                        success: false,
                        message: "Product not found",
                    });
                }

                res.status(200).json({
                    success: true,
                    data: result,
                });

            } catch (error) {
                console.error("Get product error:", error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
        //
        app.patch('/product/:id/shp', varifyFBtoken, async (req, res) => {
            try {
                const { id } = req.params;
                const { SHP } = req.body; 

                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid product ID",
                    });
                }

                if (SHP === undefined || SHP === null) {
                    return res.status(400).json({
                        success: false,
                        message: "SHP field is required",
                    });
                }

                const query = { _id: new ObjectId(id) };
                const update = {
                    $set: { SHP }
                };

                const result = await productCollection.updateOne(query, update);

                if (result.matchedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Product not found",
                    });
                }

                const updatedProduct = await productCollection.findOne(query);

                res.status(200).json({
                    success: true,
                    message: "SHP updated successfully",
                    data: updatedProduct,
                });

            } catch (error) {
                console.error("Update SHP error:", error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
        
        //Product Api end

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
                newBanner.createdAt = new Date();
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
        //
        app.get("/banners", async (req, res) => {
            try {
                const result = await BannerCollection.find().sort({ createdAt: -1 }).toArray();
                res.status(200).json(result);

            } catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
        //
        app.get("/banners/:id", async (req, res) => {
            try {
                const { id } = req.params;

                const banner = await BannerCollection.findOne({
                    _id: new ObjectId(id)
                });

                if (!banner) {
                    return res.status(404).json({
                        success: false,
                        message: "Banner not found"
                    });
                }

                res.status(200).json({
                    success: true,
                    data: banner
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


        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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