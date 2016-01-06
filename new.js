var express = require("express");
var app = express();
var http = require('http').Server(app);
var Server = require("socket.io");
var io = new Server(http);
var fs = require("fs");

var port = 3000;
http.listen(port, function(){
	console.log("Server's running on port "+port);
});


io.sockets.on("connection", function(socket){	
	console.log("User connected");
	socket.on("image", function(data){
		console.log("Image");
		console.log(data.data);
		var writerStream = fs.createWriteStream("public/images/avatar/1/1.jpg");
		writerStream.write(data.data);
		writerStream.end();
		writerStream.on("finish", function(){
			console.log("Write completed");
		});
		writerStream.on("error", function(){
			console.log("Something went wrong!");
		});
	});
	socket.on("disconnect", function(){
		console.log("User disconnected");
	});
	

});