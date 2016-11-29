// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

var bodyParser = require('body-parser');

//session and its key
var session = require('cookie-session');
var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';

//database connection
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
// Use your own mlab account!!!
var mongourl = 'mongodb://rockie2695:26762714Rockie@ds057816.mlab.com:57816/rockie2695_mongodb';

//express framework
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();

//middlewares
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(fileUpload());
app.use(session({
	name: 'session',
	keys: [SECRETKEY1,SECRETKEY2],
	maxAge:60*60*1000//60mins
}));
/*
app.use(bodyParser.urlencoded({
	extended:false
}));
*/

app.get("/", function(req,res) {	
	if(req.session.id==null){
		res.redirect("/login");
		console.log('from / to /login');	
	}else{
		res.redirect("/read");
		console.log('from / to /read');	
	}	
});

app.get("/login", function(req,res) {
	console.log('now in /login session.id='+req.session.id);
	if(req.session.id!=null){
		res.redirect("/read");
		console.log('from /login to /read');
	}else{
		res.render("login.ejs");	
	}
});

app.get("/processlogin", function(req,res) {	
	res.redirect("/login");
});

app.post("/processlogin", function(req,res) {
	if(!req.body){
		res.send('No input!');
		return;
	}
	MongoClient.connect(mongourl,function(err,db){
		assert.equal(null,err);
		console.log('Connected to mlab.com');
		
		login(db,req.body,function(isUser){
			db.close();
			console.log('Disconnected to mlab.com');
			if(isUser==0){
				res.redirect("/login");
			}else if(isUser==1){
				req.session.id=req.body.id;
				console.log('set session.id='+req.session.id);			
				res.redirect("/read");
				console.log('from /processlogin to /read');
			}	
		});
	});	
});

app.get("/reg", function(req,res) {
	console.log('now in /reg session.id='+req.session.id);
	if(req.session.id==null){
		res.render("reg.ejs");
	}else{
		res.redirect("/read");
		console.log('from /reg to /read');	
	}
});

app.get("/processreg",function(req,res){
	res.redirect("/reg");
});

app.post("/processreg", function(req,res) {
	if(!req.body){
		res.redirect("/reg");
	}
	MongoClient.connect(mongourl,function(err,db){
		assert.equal(null,err);
		console.log('Connected to mlab.com');
		
		reg(db,req.body,function(state){
			db.close();
			console.log('Disconnected to mlab.com');
			res.render("processreg.ejs",{state:state});	
		});
	});	
});

app.get("/read",function(req,res){
	console.log('now in /read session.id='+req.session.id);
	if(req.session.id==null){
		console.log('set session.id='+req.session.id);
		res.redirect('/login');
		console.log('from /read to /login');
	}else{
		var id=req.session.id;
		MongoClient.connect(mongourl,function(err,db){
			assert.equal(null,err);
			console.log('Connected to mlab.com');
			findNRestaurant(db,function(restaurants){
				db.close();
				console.log('Disconnected to mlab.com');
				res.render("read.ejs",{id:id,r:restaurants});
			});
		});	
	}
});

app.get('/display',function(req,res){
	if(req.session.id!=null&&req.query._id!=null){
		MongoClient.connect(mongourl,function(err,db){
			assert.equal(null,err);
			console.log('from /read to /display\nConnected to mlab.com');
			var criteria={"_id":ObjectId(req.query._id)};
			find1Restaurant(db,criteria,function(restaurant){
				db.close();
				console.log('Disconnected to mlab.com');
				res.render("display.ejs",{r:restaurant});
			});
		});
	}else{
		res.redirect('/read');
		console.log('from /display to /read');
	}
});

app.get('/new',function(req,res){
	if(req.session.id!=null){
		res.render("new.ejs");
	}else{
		res.redirect("/read");
	}
});

app.post('/create',function(req,res){
	if(req.session.id!=null&&req.body.name!=null){
var sampleFile;
		MongoClient.connect(mongourl,function(err,db){
			assert.equal(null,err);
			console.log('from /new to /create\nConnected to mlab.com');
			create(db,req,function(state,objid){
				db.close();
				console.log('Disconnected to mlab.com');
				res.render("processcreate.ejs",{state:state,objid:objid});
			});
		});
	}else{
		res.redirect("/read");
	}
});

app.get('/gmap',function(req,res){
	if(req.session.id!=null&&req.query.lat!=null&&req.query.lon!=null&&req.query.title!=null){
		var lat  = req.query.lat;
		var lon  = req.query.lon;
		var title = req.query.title;
		res.render("gmap.ejs",{lat:lat,lon:lon,zoom:16,title:title});
		res.end();
	}else{
		res.redirect("/read");
	}
})

app.get('/logout',function(req,res){
	req.session = null;
	res.redirect('/login');
});

app.get('/api/read/:field/:value',function(req,res){
	field=req.params.field;
	value=req.params.value;
	criteria={};
	criteria[field]=value;
	MongoClient.connect(mongourl,function(err,db){
		assert.equal(null,err);
		console.log('from /new to /create\nConnected to mlab.com');
		apiread(db,criteria,function(restaurant){
			db.close();
			res.json(restaurant);
		});
	});
});

//you could test by(you may type it again as the code write on browser, some code convert problem may access)    curl -X POST --data '{"name":"curl"}' --header Content-Type:application/json http://localhost:6001/api/create -v
app.post('/api/create',function(req,res){
	MongoClient.connect(mongourl,function(err,db){
		assert.equal(null,err);
		db.collection('cloudass_restaurant').insertOne({
			"data":"",
			"mimetype" :"",
			"name":req.body.name,
			"borough":req.body.borough,
			"cuisine":req.body.cuisine,
			"street":req.body.street,
			"building":req.body.building,
			"zipcode":req.body.zipcode,
			"lon":req.body.lon,
			"lat":req.body.lat,
			"rating":"",
			"owner":req.body.id
		},function(err,result){
			array={};
			var objid=null;
			if(err){
				countstate="failed";
				array["status"]=countstate;
				res.send(array);
			}else{
				countstate="ok";
				array["status"]=countstate;
				db.collection('cloudass_restaurant').findOne(req.body,function(err,result){
					assert.equal(err,null);
					objid=result._id;
					array["_id"]=objid;
					res.send(array);
				});
			}
		});

	});
});

app.get(/.*/, function(req,res) {
	res.status(404).end(req.url+' Not Supported');
});

function login(db,body,callback){
	console.log(body);
	db.collection('cloudass_login').aggregate(
		[
			{$match:body},
			{$group:{"_id":null,"count":{$sum:1}}}
		]
	).toArray(function(err,result){
		assert.equal(err,null);
		console.log(result);
		if(result[0]==null){
			count="0";
		}else{
			count=result[0].count;
		}
		callback(count);
	}); 
}

function reg(db,body,callback){
	console.log(body);
	db.collection('cloudass_login').aggregate(
		[
			{$match:{"id":body.id}},
			{$group:{"_id":null,"count":{$sum:1}}}
		]
	).toArray(function(err,result){
		assert.equal(err,null);
		console.log(result);
		if(result[0]==null){
			count="0";
		}else{
			count=result[0].count;
		}
		if(count==0){
			db.collection('cloudass_login').insertOne({
				"id":body.id,
				"password":body.password
			},function(err,result){
				if(err){
					countstate="Registration false as server error!";
				}else{
					countstate="Registration success!";
				}
				callback(countstate);
			});
		}else{
			countstate="Registration false as Name/id already exist!";
			callback(countstate);
		}
	});
}

function create(db,req,callback){
	console.log(req.body);
		db.collection('cloudass_restaurant').insertOne({
			"data":new Buffer(req.files.sampleFile.data).toString('base64'),
			"mimetype" : req.files.sampleFile.mimetype,
			"name":req.body.name,
			"borough":req.body.borough,
			"cuisine":req.body.cuisine,
			"street":req.body.street,
			"building":req.body.building,
			"zipcode":req.body.zipcode,
			"lon":req.body.lon,
			"lat":req.body.lat,
			"rating":"",
			"owner":req.session.id
		},function(err,result){
			var objid=null;
			if(err){
				countstate="Add restaurant false as server error!";
				callback(countstate,objid);
			}else{
				countstate="Add restaurant success!";
				db.collection('cloudass_restaurant').findOne(req.body,function(err,result){
						assert.equal(err,null);
						objid=result._id;
				callback(countstate,objid);
					});
			}
		});
}

function apiread(db,criteria,callback){
	var restaurants=[];
	db.collection('cloudass_restaurant').find(criteria,function(err,result){
		assert.equal(err,null);
		result.each(function(err,doc){
			if(doc!=null){
				restaurants.push(doc);
			}else{
				callback(restaurants);
			}	
		});
	});
}

function findNRestaurant(db,callback){
	var restaurants=[];
	db.collection('cloudass_restaurant').find(function(err,result){
		assert.equal(err,null);
		result.each(function(err,doc){
			if(doc!=null){
				restaurants.push(doc);
			}else{
				callback(restaurants);
			}
		});
	})
}

function find1Restaurant(db,criteria,callback){
	db.collection('cloudass_restaurant').findOne(criteria,function(err,result){
		assert.equal(err,null);
		callback(result);
	});
}

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
