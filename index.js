const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(cors());
app.use(express.json());


app.get('/',(req, res)=>{
    res.send('Service Spot Cooking')
})

app.listen(port,() =>{
    console.log(`Service Spot Running on port ${port} `)
})