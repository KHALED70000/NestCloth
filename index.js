const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


//middleware
app.use(express.json());
app.use(cors());

//middleware end


app.get('/', (req, res)=>{
    res.send('Hello NestCloth')
});

app.listen(port, () => {
    console.log(`NestCloth is running on port ${port}`)
})