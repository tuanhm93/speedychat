
var express = require("express");
var app = express();
app.use(express.static('public'));
var http = require('http').Server(app);
var Server = require("socket.io");
var io = new Server(http);

var port = 3000;
http.listen(port, function(){
	console.log("Server's running on port "+port);
});

var nsp = io.of("/nsp");

io.on("connection", function(socket){
	console.log("Default");
});

nsp.on("connection", function(socekt){
	console.log("dfsdfhsdfh");
});