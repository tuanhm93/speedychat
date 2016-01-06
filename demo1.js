var http = require("http");
var parseString = require('xml2js').parseString;
var express = require('express');
var app = express();
app.listen(3000);

var options = {
		host: 'api.xalovansu.com',
		port: 80,
		path: "/tuVi/tuViTronDoi/xem/gioitinh/nam/namsinh/1993/key/tviapp@)!@",
		method: 'GET'
	}
console.log(options);

var requestSend = http.request(options, function(response){
	var data ="";
	
	response.on('data', function(d) {	
		data += d;
	});
	response.on("end", function(){
		parseString(data, function (err, result) {
			if(err){
				
			}else{
				var tuVi = "";
				var item = result.tamlinh.tuvi[0].root[0].data[0].item;
				
				console.log(item[5].value);
			}
		});
	});
	
});

requestSend.end();
requestSend.on("error", function(){
	console.log("Something wrong");
});