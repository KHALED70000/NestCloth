const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

//Firebase Admin SDK

const admin = require("firebase-admin");
const serviceAccount = require("./NestCloth-firebase-admin-SDK.json");

// const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');//vercel deploy er jnn lage
// const serviceAccount = JSON.parse(decoded);//vercel deploy er jnn lage

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
        // await client.connect();

        const db = client.db('NestCloth');
        const userCollection = db.collection('userDB');
        const productCollection = db.collection('Products');
        const orderCollection = db.collection('Orders');
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
        // app.get('/allusers', varifyFBtoken, async (req, res) => {

        //     const searchText = req.query.searchText;
        //     const query = {};
        //     if (searchText) {
        //         query.$or = [
        //             { displayName: { $regex: searchText, $options: 'i' } },
        //             { email: { $regex: searchText, $options: 'i' } }
        //         ];
        //     }
        //     const cursor = userCollection.find(query).sort({ createdAt: -1 });
        //     const result = await cursor.toArray();
        //     res.send(result);
        // });
        //
        app.get('/allusers', async (req, res) => {
            try {
                const {status} = req.query;
                let query = {}
                if(status){
                    query = {status: status}
                }
                const result = await userCollection.find(query).sort({ createdAt: -1 }).toArray();
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
        //
        app.get('/UIMode', async (req, res) => {
            try {
                const email = req.query.email;
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: "Email is Missing",
                    });
                }
                const query = { email };
                const result = await userCollection.findOne(query);

                // console.log(result.UImode)

                res.send(result.UImode)
            }
            catch (error) {
                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Internal server error"
                    });
                }
            }
        })
        //
        app.patch('/UImode', async (req, res) => {
            try {
                const email = req.query.email;
                const {UImode} = req.body;
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: "Email is Missing",
                    });
                }

                const result = await userCollection.updateOne({ email }, { $set: { UImode } })

                res.send(result)

            }
            catch (error) {
                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: error.message
                    });
                }
            }

        })
        //UserS api end



        //Product Api
        app.post('/product', async (req, res) => {
            try {
                const {
                    ProductName,
                    ManagerEmail,
                    Category,
                    Price,
                    AQ,
                    MOQ,
                    paymentOptions,
                    photos,
                    productDecriiption
                } = req.body;

                // Basic validation (proof-based necessity)
                if (!ProductName || !ManagerEmail || !Category || !Price || !photos?.length) {
                    return res.status(400).json({
                        success: false,
                        message: "Required fields missing"
                    });
                }

                const newProduct = {
                    ProductName,
                    ManagerEmail,
                    Category,
                    Price: Number(Price),
                    AOQ: Number(AQ),
                    MOQ: Number(MOQ),
                    paymentOptions,
                    photos,
                    productDecriiption,
                    // server-controlled fields
                    SHP: false,
                    status: "pending",
                    createdAt: new Date()
                };

                const result = await productCollection.insertOne(newProduct);

                res.status(201).json({
                    success: true,
                    insertedId: result.insertedId
                });

            } catch (error) {
                console.error("Product create error:", error);
                res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        //
        app.get('/products', async (req, res) => {
            try {
                const ManagerEmail = req.query.email;
                const status = req.query.status;
                let query = {};

                if (ManagerEmail) {
                    query.ManagerEmail = ManagerEmail;
                }

                if (status) {
                    query.status = status;
                }

                const result = await productCollection.find(query).sort({ createdAt: -1 }).toArray();
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
        // DELETE single image from product photos
        app.patch('/product/:id/remove-photo', async (req, res) => {
            try {
                const { id } = req.params;
                const { photoUrl } = req.body;

                if (!photoUrl) {
                    return res.status(400).json({
                        success: false,
                        message: 'photoUrl is required'
                    });
                }

                const result = await productCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $pull: { photos: photoUrl }
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Product not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'Photo removed successfully'
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: error.message
                });
            }
        });
        //
        app.patch('/product/:id/Update-Product', async (req, res) => {
            try {
                const { id } = req.params;

                const {
                    ProductName,
                    Price,
                    AQ,
                    MOQ,
                    paymentOptions,
                    productDecriiption,
                    Category,
                    photos
                } = req.body;

                const updateDoc = {
                    $set: {
                        ...(ProductName && { ProductName }),
                        ...(Price !== undefined && { Price: Number(Price) }),
                        ...(AQ !== undefined && { AOQ: Number(AQ) }),
                        ...(MOQ !== undefined && { MOQ: Number(MOQ) }),
                        ...(paymentOptions && { paymentOptions }),
                        ...(productDecriiption && { productDecriiption }),
                        ...(Category && { Category }),
                    },
                };

                if (photos && Array.isArray(photos) && photos.length > 0) {
                    updateDoc.$addToSet = {
                        photos: {
                            $each: photos
                        }
                    };
                }

                const result = await productCollection.updateOne(
                    { _id: new ObjectId(id) },
                    updateDoc
                );

                res.json({
                    success: true,
                    message: "Product updated successfully",
                    result
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
        app.delete('/product/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const cursor = { _id: new ObjectId(id) };
                const result = await productCollection.deleteOne(cursor);

                if (result.deletedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Product not found"
                    });
                }

                res.json({
                    success: true,
                    message: "Product deleted successfully",
                    result
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
        app.patch('/product/:id/shp', async (req, res) => {
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

                console.log(id, SHP) 

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
                    message: error.message,
                });
            }
        });

        //Product Api end

        //Order Booking Api
        app.post('/order', async (req, res) => {
            const newOrder = req.body;
            newOrder.status = 'pending';
            newOrder.createdAt = new Date();
            const result = await orderCollection.insertOne(newOrder);
            res.send(result)
        })
        //
        app.get('/orders', async (req, res) => {
            try {
                const status = req.query.status;

                let query = {};
                if (status) {
                    query = { status: status };
                }

                const orders = await orderCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                const enrichedOrders = await Promise.all(
                    orders.map(async (order) => {
                        const product = await productCollection.findOne({
                            _id: new ObjectId(order.Product_id),
                        });

                        return {
                            ...order,
                            ProductPhotos: product?.photos || [],
                            ProductPaymentMode: product?.paymentOptions || null,
                            AOQ: product?.AOQ || null,
                            MOQ: product?.MOQ || null,
                        };
                    })
                );

                res.send(enrichedOrders);
            } catch (error) {
                res.status(500).send({ error: true });
            }
        });
        //

        app.get('/CurrentUserOrders', async (req, res) => {
            try {
                const { email, status } = req.query;

                if (!email) {
                    return res.status(400).send({
                        error: true,
                        message: 'Email is required'
                    });
                }

                let query = { BuyerEmail: email };

                if (status) {
                    query.status = status;
                }


                const orders = await orderCollection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .toArray();

                const enrichedOrders = await Promise.all(
                    orders.map(async (order) => {
                        const product = await productCollection.findOne({
                            _id: new ObjectId(order.Product_id),
                        });

                        return {
                            ...order,
                            ProductPhotos: product?.photos || [],
                            ProductPaymentMode: product?.paymentOptions || null,
                            AOQ: product?.AOQ || null,
                            MOQ: product?.MOQ || null,
                        };
                    })
                );

                res.send(enrichedOrders);
            } catch (error) {
                res.status(500).send({ error: true, error: 'BAler Fuk er' });
            }
        });

        //

        app.get('/EditOrder/:id', async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid order ID"
                    });
                }

                // const orders = await orderCollection.find({ _id: new ObjectId(id) })

                const result = await orderCollection.findOne({ _id: new ObjectId(id) });

                if (!result) {
                    return res.status(404).send({
                        success: false,
                        message: "Order not found"
                    });
                }

                const OrderedProductId = { _id: new ObjectId(result.Product_id) }
                const ORDER = await productCollection.findOne(OrderedProductId)

                result.AOQ = ORDER.AOQ;
                result.MOQ = ORDER.MOQ;

                res.status(200).send({
                    success: true,
                    data: result
                });

            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: "Internal server error"
                });
            }
        });

        //
        app.delete('/order/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const cursor = { _id: new ObjectId(id) }
                const result = await orderCollection.deleteOne(cursor);

                res.send(result)
            }
            catch (err) {
                res.status(500).send({ err: true });
            }
        })

        app.patch('/order/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const UpdatedOrderInfo = req.body;
                const query = { _id: new ObjectId(id) }

                const update = {
                    $set: UpdatedOrderInfo,
                }

                const result = await orderCollection.updateOne(query, update);

                res.send(result)
            }
            catch (err) {
                res.status(500).send({ err: true });
            }
        })
        //
        app.patch('/order', async (req, res) => {

            const orderId = req.query.orderId;
            const status = req.query.status;

            const update = {
                $set: {
                    status: status,
                    approvedAt: new Date()
                }
            }
            const query = { _id: new ObjectId(orderId) };

            const result = await orderCollection.updateOne(query, update);

            res.send(result)
        })
        //
        app.patch('/CuttingUpdateOrder/:orderId', async (req, res) => {
            const { orderId } = req.params;
            const { place, location } = req.query;

            try {
                const order = await orderCollection.findOne({ _id: new ObjectId(orderId) });
                if (!order) return res.status(404).send({ error: "Order not found" });

                // Current Trackings object
                const currentTrackings = order.Trackings || {};

                // Only add if key doesn't exist
                if (!(place in currentTrackings)) {
                    currentTrackings[place] = location;
                }

                // Update in DB
                const result = await orderCollection.updateOne(
                    { _id: new ObjectId(orderId) },
                    { $set: { Trackings: currentTrackings } }
                );

                res.send({ success: true, result });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: true });
            }
        });




        // app.delete('/order/:id', async(req, res)=>{
        //     const orderId = req.params.id;
        //     const result = await orderCollection.deleteOne({_id: new ObjectId(orderId)});
        //     res.send(result);
        // })

        //Order Booking Api end

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