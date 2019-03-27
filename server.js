const express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const app = express();
const port = process.env.PORT || 8080;
//var url = ["http://www.arstechnica.com"];
var url = ["http://yahoo.com.hk"]
var iconv = require('iconv-lite');

//database connection
var MongoClient = require('mongodb').MongoClient;
var mongodb = require('mongodb');
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
// Use your own mlab account!!!
var mongourl = 'mongodb://rockie2695:26762714Rockie@ds057816.mlab.com:57816/rockie2695_mongodb';

// console.log that your server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));

// create a GET route
app.get('/express_backend', (req, res) => {
	res.send({
		express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT'
	});
});

app.get('/scrape', function (req, res) {
	/*for outputfile	url = 'http://www.imdb.com/title/tt1229340/';*/
	//checkurl()
})

app.get('/', (req, res) => {
	res.send({
		express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT'
	});
});

app.get(/.*/, function (req, res) {
	res.status(404).end(req + ',' + res + ' Not Supported');
});

function insert(db, singleUrl, title, callback) {
	db.db().collection('testUrl').insertOne({
		"url": singleUrl,
		"title": title
	}, function (err, result) {
		callback(err, result);
	});
}

function findHowMany(db, singleUrl, callback) {
	db.db().collection('testUrl').aggregate([{
		$match: {
			"url": singleUrl
		}
	},
	{
		$group: {
			"_id": null,
			"count": {
				$sum: 1
			}
		}
	}
	]).toArray(function (err, result) {
		callback(err, result)
	});
}

function find(query, db, callback) {
	var link = [];
	db.db().collection('testUrl').find(query).toArray(function (err, result) {
		if (result.length == 0) {
			callback(link)
		} else {
			result.forEach(function (err, doc) {
				if (result[doc] != null) {
					link.push(result[doc])
				}
			})
			callback(link)
		}

	})
}

function insertWithoutitle(db, singleUrl, callback) {
	findHowMany(db, singleUrl, function (err, result) {
		if (err) {
			callback(err, result)
		} else if (result[0] == null || result[0].count == 0) {
			insert(db, singleUrl, "", function (err, result) {
				callback(err, result)
			})
			console.log(singleUrl, "insert url without title to db")
		} else {
			callback(err, result)
			console.log(singleUrl, "already contain in db")
		}
	})
}

function update(db, id, title, callback) {
	db.db().collection('testUrl').updateOne({
		_id: new mongodb.ObjectID(id)
	}, {
			$set: {
				title: title
			}
		}, function (err, result) {
			callback(err, result)
		})
}

function checkurl() {
	MongoClient.connect(mongourl, {
		useNewUrlParser: true
	}, function (err, db) {
		if (err) {
			console.log(err)
			db.close()
		} else {
			find({
				"title": ""
			}, db, function (result) {
				db.close();
				if (result.length != 0) {
					var oneRecord = result[0]
					var singleUrl = oneRecord.url;
					//if (historyUrl.indexOf(singleUrl) < 0) {
					console.log("ask: " + singleUrl);
					request({
						uri: singleUrl,
						encoding: null,
						headers: {
							'cache-control': 'no-cache',
							'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
						}
					}, function (error, response, html) {
						if (!error && response.statusCode === 200) {
							var $ = cheerio.load(html);
							var title = $('title').text().replace(/\s\s+/g, ' ').replace(/(\r\n|\n|\r)/gm, "").replace(/\u2013|\u2014/g, "-").trim();
							if (title !== "") {
								console.log('title: ' + title)
								MongoClient.connect(mongourl, {
									useNewUrlParser: true
								}, function (err, db) {
									if (err) {
										console.log(err)
									} else {
										update(db, oneRecord._id, title, function (err) {
											if (err) {
												console.log(err)
											}
											db.close();
											console.log("close db 1")
										})
									}
								})
							} else {
								//delete

								MongoClient.connect(mongourl, {
									useNewUrlParser: true
								}, function (err, db) {
									if (err) {
										console.log(err)
									} else {
										db.collection("testUrl").remove({ _id: new mongodb.ObjectID(oneRecord._id) }, function (err, result) {
											if (err) {
												console.log(err)
											} else {
												console.log("delete")
											}
											db.close();
											console.log("close db 3")
										})
									}
								})

								console.log("title is empty")
							}
							//historyUrl.push(singleUrl)
							collectInternalLinks($, singleUrl)
						} else {

						}
					})
					//} else {
					//	console.log("repeat by history")
					//}
				} else {
					MongoClient.connect(mongourl, {
						useNewUrlParser: true
					}, function (err, db) {
						find({
							"url": "http://yahoo.com.hk"
						}, db, function (result) {
							insertWithoutitle(db, "http://yahoo.com.hk", function (err, result) {
								if (err) {
									console.log(err)
								}
								db.close();
							})
						})
					})
				}
			})
		}
	})
	/*
	if (url.length > 0) {
		
	} else {}*/
}

function collectInternalLinks($, singleUrl) {
	MongoClient.connect(mongourl, {
		useNewUrlParser: true
	}, function (err, db) {
		if (err) {
			console.log(err, singleUrl)
		} else {
			var promises = [],
				url = []
			var relativeLinks = $("a[href^='/']");
			for (let a = 0; a < relativeLinks.length; a++) {
				var urlObject = new URL(singleUrl)
				var link = urlObject.protocol + '//' + urlObject.hostname + encodeURI(relativeLinks[a].attribs.href)
				if (url.indexOf(link) < 0) {
					url.push(link)
				}
			}
			var absoluteLinks = $("a[href^='http']");
			for (let a = 0; a < absoluteLinks.length; a++) {
				var link = absoluteLinks[a].attribs.href
				if (url.indexOf(link) < 0) {
					url.push(link)
				}
			}
			for (let a = 0; a < url.length; a++) {
				promises.push(relativeLink(url[a], "url " + a))
			}

			function relativeLink(url, value) {
				return new Promise((resolve, reject) => {
					insertWithoutitle(db, url, function (err, result) {
						if (!err) {
							resolve(value)
						} else {
							reject(value)
						}
					})
				})
			}

			Promise.all(promises).then(function () {
				db.close();
				console.log("close db 2")
			}).catch(function (e) {
				db.close();
				console.log(e)
			})

		}
	})
}
var cronJob = require("cron").CronJob;
new cronJob('*/10 * * * * *', function () {
	checkurl()
}, null, true, 'Asia/Hong_Kong');