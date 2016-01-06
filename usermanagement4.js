//Cấu hình server
var express = require("express");
var app = express();
app.use(express.static('public'));
var http = require('http').Server(app);
var Server = require("socket.io");
var io = new Server(http);
var allSockets = io.sockets.connected;

http.listen(3000);

io.on("connection", function(socket){
	console.log(socket.id);
	var a = io.nsps['/'].adapter.rooms[socket.id];
	console.log(a);
	socket.on("HAHAHA", function(){
		var sIDs = Object.keys(a);
		var sIDs1 = Object.keys(a);
		sIDs1.splice(0,1);
		for(var i=0;i<sIDs.length;i++){
			console.log(sIDs[i]);
		}
		console.log(io.sockets.connected["1"]);
	});
});