const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectId;
const assert = require('assert');
const http = require('http');
const url = require('url');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const formidable = require('express-formidable');


//-------------------------------------------------------
//app.use(express.static(path.join(__dirname, './public')));
//app.use(express.static(__dirname + './public'));

const mongourl = 'mongodb+srv://admin02:admin02@cluster0.48pok.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
const dbName = 'test';

app.set('view engine','ejs');

const SECRETKEY = 'copy test';

var usercheck=true;

const users = new Array(
	{name: 'demo', password:''},
	{name: 'student', password: ''}
);

app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req,res) => {
	const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        console.log(db);
		
		//db.collection("project").findOne({}, function(err, result) {
    	//	if (err) throw err;
    	//	console.log(result);
  		//});
  		db.collection('project').find({}).toArray(function(err, result) {
    	if (err) throw err;
    	
    	let nItem = result.length;
    	//console.log('--------------------------');
	
		if (!req.session.authenticated) {
			res.redirect('/login');
		} else {
			//console.log(result[0]._id.toString());
			if(users[0].name == req.session.username){
				res.status(200).render('controlPlat',{name:req.session.username,nItem:nItem,doc:result});
			}else{
				res.status(200).render('viewPlat',{name:req.session.username,nItem:nItem,doc:result});
			};
		};
	});
	});
});


app.get('/login', (req,res) => {
	res.status(200).render('login',{});
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.body.name && user.password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = req.body.name;	
		}
	});
	res.redirect('/');
});

app.get('/logout', (req,res) => {
	req.session = null;
	res.redirect('/');
});

//----------------------------------------------------------------------------------------

app.use(formidable());

const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('project').findOne(criteria);
    //console.log(`findDocument: ${JSON.stringify(criteria)}`);
    //cursor.toArray((err,docs) => {
        //assert.equal(err,null);
        //console.log(`findDocument: ${docs.length}`);
        callback(cursor);
    //});
};

app.get('/find', (res, criteria) => {
	const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        
        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
        
            for (var doc of docs) {
                res.write(`<tr><td><a href=/details?_id=${doc._id}>${doc.name}</a></td></tr>`);
            }
        });
    });
});

app.get('/detail', (req,res) => {
	const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        //console.log("--------------------------------");
        let temp = req.query._id;
        //console.log(temp);
        //console.log("--------------------------------");
        //let DOCID = JSON.parse(`{"_id": ObjectId("'"${req.query._id})}`);
        //console.log(DOCID);
        
        
        
        let DOCID ={"_id": new ObjectID(temp)};
        
        	db.collection('project').findOne(DOCID, (err,results) => {
        		//console.log("--------------------------------");
            	if (err) return console.error(err);
            	
            	res.render("detail", {"criteria": results,"user":req.session.username})
            	});
        });
    });

app.get('/edit',(req, res) => {
	const client = new MongoClient(mongourl);
    client.connect((err) => {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    
	let temp = req.query._id;
	let DOCID ={"_id": new ObjectID(temp)};
	
	db.collection('project').findOne(DOCID, (err,results) => {
        if (err) return console.error(err);
        if(req.session.username!=results.manager){
        	usercheck=false;
        }
        if(usercheck){
        	db.collection('project').findOne(DOCID, (err,results) => {
			res.status(200).render('update',{"item":results});
			});
			};
		
		if(usercheck){
			db.collection('project').deleteOne(DOCID);
		}else{
			usercheck=true;
			res.redirect('/');
		}
		});
		
	});
	});

app.post('/edit',(req, res) => {
	const client = new MongoClient(mongourl);
    client.connect((err) => {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    let temp = req.query._id;
	var DOCID ={"_id": new ObjectID(temp)};
	
    let updateDoc={
        	"_id":new ObjectID(DOCID._id),
			"name":req.fields.name,
			"quantity":req.fields.quantity,
			"type":req.fields.type,
			"manager":req.session.username,
			"inventory_address":{
				"street":req.fields.street,
				"building":req.fields.building,
				"country":req.fields.country,
				"zipcode":req.fields.zipcode,
				"latitude":req.fields.latitude,
				"longitude":req.fields.longitude
			}
        }
        
        if (req.files.filetoupload.size > 0) {
            fs.readFile(req.files.filetoupload.path, (err,data) => {
                assert.equal(err,null);
                updateDoc['photo_mimetype']= req.files.filetoupload.type;
                updateDoc['photo']= new Buffer.from(data).toString('base64');
                db.collection('project').insert(updateDoc);
		})
		}else{
		    updateDoc['photo_mimetype']= req.fields.photo_mimetype;
            updateDoc['photo']= req.fields.photo;
            db.collection('project').insert(updateDoc);
		}
		res.redirect('/');
	});
	});
	

app.get('/new', (req,res) => {
		res.status(200).render('insertPlat',{name:req.session.username})
		});
	
app.post('/new', (req,res) => {
	console.log('1234');
	const client = new MongoClient(mongourl);
    	client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        
        console.log(req);
    	
        var DOCID = {			
        	"_id":new ObjectID(req.fields._id),
			"name":req.fields.name,
			"quantity":req.fields.quantity,
			"type":req.fields.type,
			"manager":req.session.username,
			"inventory_address":{
				"street":req.fields.street,
				"building":req.fields.building,
				"country":req.fields.country,
				"zipcode":req.fields.zipcode,
				"latitude":req.fields.latitude,
				"longitude":req.fields.longitude
			}
			}
			
		if (req.files.filetoupload.size > 0) {
            fs.readFile(req.files.filetoupload.path, (err,data) => {
                assert.equal(err,null);
                DOCID['photo_mimetype']= req.files.filetoupload.type;
                DOCID['photo']= new Buffer.from(data).toString('base64');
                db.collection('project').insert(DOCID);
		});
		}else{db.collection('project').insert(DOCID);};
		});
		
		res.redirect('/');
	});
	
app.get('/map',(req,res)=>{
	console.log(req);
	res.render("gmap.ejs",{lat:req.query.lat,lon:req.query.lon,zoom:16});
});

app.get('/delete',(req,res)=>{
	const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        let temp = req.query._id;
        let DOCID ={"_id": new ObjectID(temp)};
        
        db.collection('project').findOne(DOCID, (err,results) => {
        if (err) return console.error(err);
        	if(req.session.username!=results.manager){
        		usercheck=false;
        	}
        	if(usercheck){
        		db.collection('project').deleteOne(DOCID);
        	}
        })
        usercheck=true;
		res.redirect('/');
});
});

app.get('/api/inventory/name/:value', (req,res) => {
    if (req.params['value']) {
        let criteria = {};
        criteria['name'] = req.params['value'];
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
				
			 db.collection('project').findOne(criteria, (err,results) => {
        		if (err) return console.error(err);
        		res.status(200).json(results);
        	})
        });
    } else {
        res.status(500).json({"error": "missing item"});
    }
});


app.listen(process.env.PORT || 8099);