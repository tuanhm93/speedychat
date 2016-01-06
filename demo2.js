var fs = require("fs");

var writerStream = fs.createWriteStream("public/images/avatar/5.txt");

writerStream.write("HAHAHA", "UTF-8");
writerStream.end();

writerStream.on("error", function(){
	console.log("Something went wrong!");
});