const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// middlewear
app.use(cors());
app.use(express.json());

// mongodb 

const uri = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@cluster0.we456.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// jwt verify 
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized Access' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forvidden Access' });
    }
    req.decoded = decoded;
    next();
  });
}










async function run() {
  try {
    await client.connect();
    console.log('server connect')

    // all services collection 
    const servicesCollection = client.db("doctors_portal").collection("services");

    // booking collection 
    const bookingsCollection = client.db("doctors_portal").collection("bookings");
    // user collection 
    const userCollection = client.db("doctors_portal").collection("users");

    app.get('/services', async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    })

    app.get("/available", async (req, res) => {
      const date = req.query.date;

      // step 1: get all the services 
      const services = await servicesCollection.find().toArray();


      // step 2: get the booking at that specifiq date 
      const query = { date: date };
      const bookings = await bookingsCollection.find(query).toArray();

      // step 3: forEach services 
      services.forEach(service => {
        // step 4: find bookings for specifiq service 

        const serviceBookings = bookings.filter(book => book.treatment === service.name)

        // step 5: select slots for the service:
        const bookedSlots = serviceBookings.map(book => book.slot);

        // step 6: select available slots those are not booked 
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));

        service.slots = available;
      })

      res.send(services);
    })



    // get booking data for admin dashboard & verify JWT

    app.get('/booking', verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingsCollection.find(query).toArray();
        return res.send(bookings);
      }
      else{
        return res.status(403).send({message: 'Forbiden Access'});
      }

    })

    // post booking data 
    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      const exists = await bookingsCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await bookingsCollection.insertOne(booking);
      return res.send({ success: true, result });
    })

    // all user show 
    app.get('/user',verifyJWT, async(req,res)=>{
        const users = await userCollection.find().toArray();
        res.send(users);
    })


    // create admin rule 
    app.put('/user/admin/:email',verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email: requester}); 

      if(requesterAccount === 'admin'){
        const filter = { email: email };

        const updateDoc = {
          $set: {role: 'admin'},
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send( result );
      }

      else{
        res.status(403).send({message: 'Forbidden'});
      }
     
    })

    // check admin or normal user 
    app.get('/admin/:email', async(req,res)=> {
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});

      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin});
    }
)

    // user creation process api 
   
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

      res.send({ result, token });
    })

  }

  finally {

  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Doctors Portal')
})

app.listen(port, () => {
  console.log(`Doctors Portal Server condition is good ${port}`)
})