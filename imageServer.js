var express = require("express");
var app = express();
app.listen(3001);

var https = require("https");
var http = require("http");
var lwip = require("lwip");
var fs = require("fs");

app.get("/getimage", function(req, res){
	var v = req.query['v'];
	var q = req.query['q'];
	var rsz = req.query['rsz'];
	var start = req.query['start'];
	
	var options = {
		host: 'ajax.googleapis.com',
		port: 443,
		path: "/ajax/services/search/images?v=1.0&q=tree&rsz=8&start=1",
		method: 'GET'
	}
	console.log(options);
	var requestSend = https.request(options, function(response){
		console.log(response.headers);
		var data ="";
		var count = 0;
		response.on('data', function(d) {	
			data += d;
		});
		response.on('end', function(){	
			console.log(data);
			var json = JSON.parse(data);
			var results = json.responseData.results;
			var links = [];
			for(var i=0;i<results.length;i++){
				links.push(results[i].unescapedUrl);
			}
			console.log(links);
			var rs = "";
			for(var i=0;i<links.length;i++){
				rs += links[i] +"\r\n";
			}
			var writerStream = fs.createWriteStream('output.txt');
writerStream.on("open", function(){
	console.log("open");
});
// Write the data to stream with encoding to be utf8
writerStream.write(rs,'UTF8');
console.log("haha");
// Mark the end of file
writerStream.end();

// Handle stream events --> finish, and error
writerStream.on('finish', function() {
    console.log("Write completed.");
});

writerStream.on('error', function(err){
   console.log(err.stack);
});			var count = 0;
			for(var i=0;i<links.length;i++){
			//writerStreams[i] = require("fs").createWriteStream(i+".jpg");
			
				if(links[i].charAt(4) == "s"){
					https.get(links[i], function(response){
						console.log(response.headers);
						var buffer = new Buffer(0);
						response.on("data", function(d){	
							buffer = Buffer.concat([buffer, d]);
						});
						response.on("end", function(){
							var fileName = genCode();
							count++;
							var writerStream = fs.createWriteStream(count+'.jpg');
							
							// Write the data to stream with encoding to be utf8
							writerStream.write(buffer);

							// Mark the end of file
							writerStream.end();
							/*lwip.open(buffer, 'jpg', function(err, image){
								image.resize(128, 128, function(err, image){
									image.writeFile(genCode()+".jpg", function(err){
									});
								});
							});	*/						
						});
						//response.pipe(writerStreams[i]);
					});
					
				}else{
					http.get(links[i], function(response){
						var buffer = new Buffer(0);
						response.on("data", function(d){
							buffer = Buffer.concat([buffer, d]);
						});
						response.on("end", function(){
						/*lwip.open(buffer, 'jpg', function(err, image){
								image.resize(128, 128, function(err, image){
									image.writeFile(genCode()+".jpg", function(err){
									});
								});
							});	*/
							count++;
							var writerStream = fs.createWriteStream(count+'.jpg');

							// Write the data to stream with encoding to be utf8
							writerStream.write(buffer);

// Mark the end of file
writerStream.end();		
						});
					});
				}
			}
			
			
			
			
			/*
			var buffer = new Buffer(0);
			https.get(links[0], function(response){
				response.on("data", function(d){
					buffer = Buffer.concat([buffer, d]);
				});
				response.on("end", function(){
					lwip.open(buffer, "jpg", function(err, image){
						if(err){
							console.error(err);
						}else{
							image.resize(128, 64, function(err, image){
								image.writeFile("outputnew.jpg", function(err){
									if(err)
										console.error(err);
								});
							});
						}
					});
				});
			});
			*/

		});
	});
	requestSend.end();
	requestSend.on('error', function(e) {
		console.error(e);
	});
	res.send("Ok");
});

function genCode(){
	var code = "";
	code = code + Math.ceil(Math.random()*9) + Math.ceil(Math.random()*9) + Math.ceil(Math.random()*9);
	return code;
}




try {
	for( var i = 0; i < filenames.length; i++ ) { 
		upload( filenames[i], function(err) { 
			if( err ) 
				throw err 
			});
	}
}catch( err ){
	console.log('error: '+err) 
} 