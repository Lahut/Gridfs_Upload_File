const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = express();
const mongodb = require('mongodb');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const { Readable } = require('stream');
const multer = require('multer');
const { rejects } = require('assert');
const { resolve } = require('path');
const { pid } = require('process');
let db;
//var storage = multer.memoryStorage()
//var upload = multer({ storage: storage, limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 }});

app.use(bodyParser.json());
app.set('view engine','ejs');

const URI = 'mongodb+srv://neoncold:2c1503e7@dozen-hlodi.mongodb.net/photos?retryWrites=true&w=majority';
const dbName = 'Photos';
//Connecting mongodb
MongoClient.connect(URI,{useUnifiedTopology: true} ,(err, client) => {
  if (err) {
    console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
  }
  db=client.db('photos');
});



/*var storage = multer.diskStorage({
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
});*/

var storage = multer.memoryStorage();
const upload = multer({storage : storage ,  limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 }});



app.post('/upload',upload.single('file'),(req,res) => {
    var bucket = new mongodb.GridFSBucket(db,{bucketName:'PhotosTest'});
    let photoName;
    

    const readablePhotoStream = new Readable();
    readablePhotoStream.push(req.file.buffer);
    readablePhotoStream.push(null);


    let uploadStream = bucket.openUploadStream(req.body.originalname);
    readablePhotoStream.pipe(uploadStream);
    
    uploadStream.on('error', () => {
        return res.status(500).json({ message: "Error uploading file" });
      });
  
    uploadStream.on('finish', () => {
        return res.json({file: req.file,name: photoName});
      });


})


app.get('/',(req,res) => {
    res.render('index');

});

app.get('/files/:pid', (req,res) => {
  try{
    var photosID = new ObjectID(req.params.pid);

  }catch(err){
    return res.status(400).json({ message: "Invalid PhotoID in URL parameter. Must be a single String of 12 bytes or a string of 24 hex characters" }); 
  }

  var bucket = new mongodb.GridFSBucket(db,{bucketName:'PhotosTest'});

  let downloadStream = bucket.openDownloadStream(photosID);

  downloadStream.on('data', (chunk) => {
    res.write(chunk);
  });

  downloadStream.on('error', () => {
    res.sendStatus(404);
  });

  downloadStream.on('end', () => {
    res.end();
  });
})

app.get('/files', (req,res) => {  // get all id in collection
  try{
    var collection = db.collection('PhotosTest.files');
    var arrID = {};
    collection.find().toArray( (err,docs)=> {
      if(!docs || docs.length === 0) {
        return res.status(404).json({
            err: 'No file exist'
        });
    }

    return res.json(docs.map(element => element._id));

    })
  }catch(err){
    return res.status(400).json({message: 'Not found collections'});
  }
});





const port = 5000;
app.listen(port, () => console.log(`Server statr on port ${port}`));