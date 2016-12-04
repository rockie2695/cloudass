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
var mongodb = require('mongodb');
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
// Use your own mlab account!!!
var mongourl = 'mongodb://rockie2695:26762714Rockie@ds057816.mlab.com:57816/rockie2695_mongodb';

//express framework
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();
var owner = "";

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

//Q7 search
app.get("/search", function(req, res){
	if(req.session.id==null){
		res.redirect("/login");
	}else{
	res.render("search.ejs");
	}
});
//Q7
app.post("/processSearch", function(req,res){
	
	if(req.body.requirement != null){
		MongoClient.connect(mongourl, function(err,db){
	assert.equal(err, null);
	
//var option = "name";

var criteria = "";
if(req.body.list == "name"){
	criteria = {"name":req.body.requirement};
}else if(req.body.list == "borough"){
	criteria = {"borough":req.body.requirement};
}else{
	criteria = {"cuisine":req.body.requirement};
}
	
	searchRestaurant(db, criteria, function(restaurant){

	db.close();
	console.log("Q7 disconnect");

	res.render("read.ejs", {id:req.session.id, r:restaurant});
	res.end();

//assert.equal(err,null);
});
});//end connect
	}//end if
});//end post



//Q5 delete
app.get('/delete', function(req,res){
	if(req.session.id==null){
		res.redirect("/login");
	}else{
	
	
	
		console.log("Q5 connect");

var visiting_user = req.session.rest_owner;
var visiting_rest_id = req.session.rest_id;
//var criteria = {"_id": {"$oid":visiting_rest_id}};
var criteria = visiting_rest_id; 
var result = "";
if(visiting_user == req.session.id){
	
	deleteRestaurant(criteria);
	//var result = {"title":"Successful", "message": "Deleted"}
result = {"title":"Successful", "message": "Deleted"};
	res.render("response.ejs", {r:result});

}else{
	
result = {"title":"Error", "message": "Your are not authorized to delete."};
res.render("response.ejs", {r:result});
}//end if
		
	
}
});//end delete

//Q4
app.get('/edit', function(req, res){
//var result = "";
	if(req.session.id==null){
		res.redirect("/login");
}else{
	
	if(req.session.id != req.session.rest_owner){
		result = {"title":"error", "message":"Your are not authorized to update."};
		res.render("response.ejs", {r:result});
	}else{
		res.render("update.ejs");
}//end if
}
});//end edit

//Q4
function updateRestaurant(db, req, callback){
	//var resultObj = new Object();
	var jsonObj = {};
	var o_id = req.session.rest_id;

	if(req.body.cuisine != null){
		//result.push({"cuisine": req.body.cuisine});
		//resultObj.name = "cuisine";
		//resultObj.value = "cuisine";
		jsonObj["cuisine"] = req.body.cuisine;
	}
	if(req.files.sampleFile.data !=""){
		
		jsonObj["data"] = new Buffer(req.files.sampleFile.data).toString('base64');
		jsonObj["mimitype"] = req.files.sampleFile.mimetype;
	}
	if(req.body.name != ""){
		jsonObj["name"] = req.body.name;
	}
	if(req.body.borough != ""){
		jsonObj["borough"] = req.body.borough;
	}
	if(req.body.corough != ""){
		jsonObj["cuisine"] = req.body.cuisine;
	}
	if(req.body.street != ""){
		jsonObj["street"] = req.body.street;
	}
	if(req.body.building != ""){
		jsonObj["building"] = req.body.building;
	}
	if(req.body.zipcode != ""){
		jsonObj["zipcode"] = req.body.zipcode;
	}
	if(req.body.lon != ""){
		jsonObj["lon"] = req.body.lon;
	}
	if(req.body.lat != ""){
		jsonObj["lat"] = req.body.lat;
	}
	


	
	
	db.collection('cloudass_restaurant').update({_id: new mongodb.ObjectID(req.session.rest_id)}, {$set: jsonObj}, function(err, result){
	
	assert.equal(null, err);
	
	callback(result);
});

callback();
}

function deleteRestaurant(criteria){
	MongoClient.connect(mongourl, function(err, db){
		assert.equal(err, null);
		
		db.collection("cloudass_restaurant").remove({_id: new mongodb.ObjectID(criteria)}, function(err, result){
	assert.equal(err, null);
	
	db.close();
});//end remove
});//end client
}


//Q7 searh
function searchRestaurant(db, criteria, callback){
	var restaurant = [];
	db.collection('cloudass_restaurant').find(criteria, function(err, result){
assert.equal(err, null);
result.each(function(err, doc){
	if(doc != null){
		restaurant.push(doc);
	}
	else{
		callback(restaurant);
}

});//result
});
}

//q4 update
app.post('/processUpdate', function(req, res){
	
	MongoClient.connect(mongourl, function(err, db){
		assert.equal(null, err);
		updateRestaurant(db, req, function(r, c){
			db.close();
			
var result = {"title":"Successful", "message": "Updated"};
	res.render("response.ejs", {r:result});
//problem
});//end update
});//client
	
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

	req.session.rest_owner = restaurant.owner;
	req.session.rest_id = restaurant._id;
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
					res.json(array);
				});
			}
		});

	});
});

app.get('/rate',function(req,res){
	if(req.session.id!=null&&req.query._id!=null){
		res.render("rate.ejs",{_id:req.query._id});
		res.end();
	}else{
		res.render("read.ejs");
	}
});

app.post('/rate',function(req,res){
	if(req.session.id!=null&&req.body._id!=null&&req.body.score!=null){
		MongoClient.connect(mongourl,function(err,db){
			assert.equal(null,err);
			db.collection('cloudass_restaurant').aggregate(
				[
					{$match:{"rating.username":req.session.id,"_id":ObjectId(req.query._id)}},
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
					console.log('a'+req.query._id+req.session.id+req.body.score);
					//"rating.username":req.session.id,"rating.rating":req.body.score
					db.collection('cloudass_restaurant').update(
						{"_id":ObjectId(req.query._id)},
						{$push:{"rating":{"username":req.session.id,"rating":req.body.score}}},
						{multi:false}
					)
					res.render("processrate.ejs",{state:'success',color:'teal'});
				}else{
					res.render("processrate.ejs",{state:'error',color:'red'});
				}
			}); 
		}); 
	}else{
		res.render("read.ejs");
	}
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
			"rating":[],
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
