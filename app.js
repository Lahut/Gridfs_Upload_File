const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const mongodb = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const { Readable } = require('stream');
const multer = require('multer');
var randomstring = require("randomstring");
let db;
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



var storage = multer.memoryStorage()
const upload = multer({storage : storage  ,  limits: { fields: 2, fileSize: 6000000, files: 2, parts: 2 }});



app.post('/upload',upload.array('file',2),(req,res) => {
    var bucket = new mongodb.GridFSBucket(db,{bucketName:'PhotosTest'});
    const Allfile = req.files;
    Allfile.map(type => {
      var type = type.mimetype;
      if( type !== "image/jpeg" && type !== "image/png"){  // always true T_T มันเป็น jpeg แต่ไม่ใช่ png
        return res.json({message: 'Please select image file.'});
      }
    })



    
    const readablePhotoStream1 = new Readable();
    const readablePhotoStream2 = new Readable();
    
    readablePhotoStream1.push(req.files[0].buffer)  // buffer from multer storage
    readablePhotoStream1.push(null);

    readablePhotoStream2.push(req.files[1].buffer)  // buffer from multer storage
    readablePhotoStream2.push(null);
    
    

    let uploadStream1 = bucket.openUploadStream(randomstring.generate());
    readablePhotoStream1.pipe(uploadStream1);
    //readablePhotoStream2.pipe(uploadStream);
    let uploadStream2 = bucket.openUploadStream(randomstring.generate());
    readablePhotoStream2.pipe(uploadStream2);



    
    uploadStream1 && uploadStream2 .on('error', () => {
        return res.status(500).json({ message: "Error uploading file" });
      });
  
    uploadStream1 && uploadStream2 .on('finish', () => {
        return res.json({files: req.files});
      }); 


})


app.get('/',(req,res) => {
    try{
    var collection = db.collection('PhotosTest.files');
    var files_ = new Array();
    collection.find().toArray( (err,files)=> {
      if(!files || files.length === 0) {
        return res.render('index',{files_});
      }else{
        files.map(file => {
          files_.push(file._id);
        });
      }
    });
    res.render('index',{files_})
  }catch(err){
    return res.status(400).json({message: 'Not found collections'});
  }

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
    
    collection.find().toArray( (err,files)=> {
      if(!files || files.length === 0) {
        return res.status(404).json({
            err: 'No file exist'
        });
    }
    return res.json(files.map(element => element._id));
    })
  }catch(err){
    return res.status(400).json({message: 'Not found collections'});
  }
});





const port = 5000;
app.listen(port, () => console.log(`Server statr on port ${port}`));