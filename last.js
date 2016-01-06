//CONSTANTS
var SYSTEM_ERROR = "1";
var PASSWORD_ERROR = "2";
var EMAIL_NOT_EXIST = "3";
var EMAIL_EXIST = "-3";
var SUCCESS = "4";
var FAILD = "-4";
var CODE_ERROR = "5";
var CODE_NOT_EXIST = "6";


//Cấu hình server
var express = require("express");
var app = express();
app.use(express.static('public'));
var http = require('http').Server(app);
var Server = require("socket.io");
var io = new Server(http);
var allSockets = io.sockets.connected;

var bufflength = 100; //Phải test length thấp

var format = require('stringformat');
var mysql = require('mysql');
var moment = require('moment');

var nicknames = {},
users = {},
bufferIDGroup = [],
result;
require("date-format-lite");
var fs = require("fs");

var port = 3000;
http.listen(port, function(){
	console.log("Server's running on port "+port);
});

//Cấu hình database
var mysql = require('mysql');

var db_config = {
  host     : '127.0.0.1',
  user     : 'root',
  password : '123456',
  database : 'speedy_chat'
};

var connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();





//Cấu hình email
var nodemailer = require('nodemailer');
var smtpTransport = nodemailer.createTransport("SMTP",{
	service: "Gmail",
	auth: {
		user:"tuvichat@gmail.com",
		pass:"123456aA@"
	}
});

var HashMap = require("hashmap");
var map = new HashMap();
var mapOffline = new HashMap();

var fs = require('fs');
var parseString = require('xml2js').parseString;
var http1 = require('http');

//Routes
app.get('/register', register);
app.get('/active', active);
app.get('/getcodefromemail', getCodeFromEmail);
app.get('/resetpassword', resetPassword);
app.get('/updateinfo', updateUserInfo);
app.get('/updatepassword', updatePassword);

//Đăng ký tài khoản mới
function register(req, res){
	console.log("Register");
	// Lấy thông tin người dùng
	var userName = req.query['userName'];
	var email = req.query['email'];
	var password = req.query['password'];
	var sex = req.query['sex']; 
	var dateOfBirth = req.query['dateOfBirth']; 
	//console.log(userName+" "+email+" "+password+" "+sex+" "+dateOfBirth);
	var queryString = "select id from user where email = '" + email +"'";
	connection.query(queryString, function(err, rows, fields) {
		if (err){
			res.send(SYSTEM_ERROR);//Lỗi hệ thống
		}else{
			if(rows.length != 0){
				res.send(EMAIL_EXIST);//Email đã tồn tại
			}else{
				var urlAvatar;
				var urlCover = "/images/cover/cover.png"
				if(sex == "1"){
					urlAvatar = "/images/avatar/male.png";
				}else{
					urlAvatar = "/images/avatar/female.png";
				}
				queryString = "insert into user(username, email, password, sex, dateofbirth, avatar, cover) values('" 
					+userName+"','"+email+"','"+password+"','"+sex+"','"+dateOfBirth+"','"+urlAvatar+"','"+urlCover+"')";
				connection.query(queryString, function(err, results){
					if(err){
						res.send(SYSTEM_ERROR);//Lỗi hệ thống
					}else{
						res.send(SUCCESS);
						var id = results.insertId;
						var code = genCode();				
						var dateTime = new Date();
						dateTime = dateTime.getDate()+"-"+(dateTime.getMonth()+1)+"-"+dateTime.getFullYear()+" "+
								dateTime.getHours()+":"+dateTime.getMinutes()+":"+dateTime.getSeconds();								
						queryString = "insert into userinf(id, code, created_date) values('"+id+"','"+code+"','"+dateTime+"')";
						connection.query(queryString, function(err, results){
							if(!err){
								var mailOptions= {
									to: email,
									subject: "Xác thực tài khoản",
									text: "Mã code: "+code
								};
								smtpTransport.sendMail(mailOptions);
							}
						}); 
					}
				});	
			}
		}
	});	
}
//Hàm sinh mã code
function genCode(){
	var code = "";
	code = code + Math.ceil(Math.random()*9) + Math.ceil(Math.random()*9) + Math.ceil(Math.random()*9);
	return code;
}
//Kích hoạt tài khoản
function active(req, res){
	console.log("Active");
	var id = req.query['id'];
	var code = req.query['code'];
	
	var queryString = "select code from userinf where id='"+id+"'";
	connection.query(queryString, function(err, rows, fields){
		if(err){		
			res.send(SYSTEM_ERROR);//Lỗi hệ thống
		}else{
			if(rows.length == 0){
				res.send(CODE_NOT_EXIST);//Không có mã code ứng với id, người dùng tự kích hoạt lấy lại code
			}else{
				if(code == rows[0].code){
					queryString = "update user set active = '1' where id = '"+id+"'";
					connection.query(queryString, function(err, results){
						if(err){		
							res.send(SYSTEM_ERROR);//Lỗi hệ thống
						}else{			
							res.send(SUCCESS);//Thành công
						}
					});
				}else{ 
					res.send(FAILD);//Sai mã code
				}
			}
		}
	});
}
//Lấy lại mã code
function getCodeFromEmail(req, res){
	console.log("Get code");
	var email = req.query['email'];
	var queryString = "select id from user where email='"+email+"'";
	connection.query(queryString, function(err, rows, fields){
		if(err){
			res.send(SYSTEM_ERROR);//Lỗi hệ thống
		}else{
			if(rows.length == 0){		
				res.send(EMAIL_NOT_EXIST);//Không tồn tại email
			}else{
				var id = rows[0].id;
				var code = genCode();
				queryString = "select code from userinf where id='"+id+"'";
				connection.query(queryString, function(err, rows, fields){
					if(err){
						res.send(SYSTEM_ERROR);//Lỗi hệ thống
					}else{
						if(rows.length == 0){
							var dateTime = new Date();
							dateTime = dateTime.getDate()+"-"+(dateTime.getMonth()+1)+"-"+dateTime.getFullYear()+" "+
									dateTime.getHours()+":"+dateTime.getMinutes()+":"+dateTime.getSeconds();								
							queryString = "insert into userinf(id, code, created_date) values('"+id+"','"+code+"','"+dateTime+"')";
							connection.query(queryString, function(err, results){
								if(err){
									res.send(SYSTEM_ERROR);//Lỗi hệ thống
								}else{
									var mailOptions={
										to: email,
										subject: "Xác thực tài khoản",
										text: "Mã code: "+code
									};
									smtpTransport.sendMail(mailOptions, function(err, inf){
										if(err){
											res.send(SYSTEM_ERROR);//Lỗi hệ thống
										}else{
											res.send(SUCCESS);//Thành công
										}
									});
								}
							});
						}else{
							var oldCode = rows[0].code;
							queryString = "update userinf set code='"+code+"' where id='"+id+"'";
							connection.query(queryString, function(err, results){
								if(err){
									code = oldCode;
								}
								var mailOptions={
									to: email,
									subject: "Xác thực tài khoản",
									text: "Mã code: "+code
								};
							
								smtpTransport.sendMail(mailOptions, function(err, inf){
									if(err){
										res.send(SYSTEM_ERROR);//Lỗi hệ thống
									}else{
										res.send(SUCCESS);//Thành công
									}
								});
							});
						}
					}
				});		
			}
		}
	});
}
//Reset password
function resetPassword(req, res){
	console.log("Reset password");
	var email = req.query['email'];
	var code = req.query['code'];
	var password = req.query['password'];
	
	var queryString = "select id from user where email='"+email+"'";
	connection.query(queryString, function(err, rows, fields){
		if(err){
			res.send(SYSTEM_ERROR); //Lỗi hệ thống
		}else{
			if(rows.length == 0){
				res.send(EMAIL_NOT_EXIST);//Không tồn tại email
			}else{
				var id = rows[0].id;
				queryString = "select code from userinf where id='"+id+"'";
				connection.query(queryString, function(err, rows, fields){
					if(err){
						res.send(SYSTEM_ERROR);//Lỗi hệ thống
					}else{
						if(rows.length == 0){
							res.send(SYSTEM_ERROR); // Không tồn tại mã code trong csdl, user tự động get lại mã code qua email
						}else{
							if(rows[0].code == code){
								queryString = "update user set password = '"+password+"' where id='"+id+"'";
								connection.query(queryString, function(err, results){
									if(err){
										res.send(SYSTEM_ERROR);//Lỗi hệ thống
									}else{
										res.send(SUCCESS);//Thành công
										queryString = "update user set active='1' where id = '"+id+"'";
										connection.query(queryString);			 
									}
								});
							}else{
								res.send(CODE_ERROR);//Mã code sai
							}
						}
					}
				});
			}
		}
	});
}
//Cập nhật thông tin người dùng
function updateUserInfo(req, res){
	console.log("Update info");
	var id = req.query['id'];
	var userName = req.query['userName'];
	var sex = req.query['sex'];
	var dateOfBirth = req.query['dateOfBirth'];
	var phoneNumber = req.query['phoneNumber'];
	var job = req.query['job'];
	var country = req.query['country'];
	var livenow = req.query['livenow'];
	var description = req.query['description'];
	var status= req.query['status'];
	var access = req.query['access'];
	var queryString = "update user set username='"+userName+"',sex='"+sex+"',dateOfBirth='"+dateOfBirth+"',phoneNumber='"+phoneNumber+"',job='"+job+"',country='"+country
		+"',livenow='"+livenow+"',description='"+description+"',status='"+status+"',access='"+access+"' where id='"+id+"'";
	
	connection.query(queryString, function(err, results){
		if(err){
			res.send(SYSTEM_ERROR);
		}else{
			res.send(SUCCESS);
		}
	});
}
//Thay đổi mật khẩu
function updatePassword(req, res){
	console.log("Update password");
	var id = req.query['id'];
	var password = req.query['password'];
	var newPassword = req.query['newPassword'];
	var queryString = "select password from user where id ='"+id+"'";
	connection.query(queryString, function(err, rows, fields){
		if(err){
			res.send(SYSTEM_ERROR);
		}else{
			if(rows.length == 0){
				res.send(FAILD);//Không tồn tại id trong csdl
			}else{
				if(rows[0].password == password){
					var queryString = "update user set password='"+newPassword+"' where id='"+id+"'";
					connection.query(queryString, function(err, results){
						if(err){
							res.send(SYSTEM_ERROR);
						}else{
							res.send(SUCCESS);
						}
					});
				}else{
					res.send(PASSWORD_ERROR);
				}
			}
		}
	});
}
//Socket 
io.sockets.on("connection", function(socket){	
	console.log("User connected: "+socket.id);
	
	socket.on("login", function(data){
		console.log("Login event: "+data.email+" "+data.password+" "+data.isDisableOnline);
		var queryString = "select * from user where email='"+data.email+"'";
		connection.query(queryString, function(err, rows, fields){
			if(err){
				socket.emit("login", { "status": SYSTEM_ERROR});//Lỗi hệ thống
			}else{
				if(rows.length == 0){
					socket.emit("login", { "status": EMAIL_NOT_EXIST});//Email không tồn tại
				}else{
					if(rows[0].password == data.password){
						var oldSocketId = map.search(rows[0].id);
						if(oldSocketId != null){
							console.log("Co thang cho nao no online day nay");
							map.remove(oldSocketId);
							socket.broadcast.to(oldSocketId).emit("friend offline", { "id":rows[0].id});
							socket.broadcast.to(rows[0].id).emit("another login"); // Đẩy thằng đăng nhập trước đó ra
							var clients = io.nsps['/'].adapter.rooms[oldSocketId];
							if(clients != undefined){
								var sIDs = Object.keys(clients);
								for(var i=0;i<sIDs.length;i++){
									var s = allSockets[sIDs[i]];
									if(s != undefined){
										s.leave(oldSocketId);
									}
								}
							}
						}else{
							oldSocketId = mapOffline.search(rows[0].id);
							if(oldSocketId != null){
								console.log("Co thang cho nao no online day nay");
								mapOffline.remove(oldSocketId);
								socket.broadcast.to(rows[0].id).emit("another login"); // Đẩy thằng đăng nhập trước đó ra
							}
						}
						socket.join(rows[0].id);
						if(data.isDisableOnline){
							mapOffline.set(socket.id, rows[0].id);
							socket.leave(socket.id);
						}else{
							map.set(socket.id, rows[0].id);
						}
						var user = 
						{
							"id"           : rows[0].id,
							"userName"     : rows[0].username,
							"phoneNumber"  : rows[0].phonenumber,
							"sex"		   : rows[0].sex,
							"dateOfBirth"  : rows[0].dateofbirth,
							"job"		   : rows[0].job,
							"country"	   : rows[0].country,
							"liveNow"	   : rows[0].livenow,
							"description"  : rows[0].description,
							"status"	   : rows[0].status,
							"active"	   : rows[0].active,
							"avatar"	   : rows[0].avatar,
							"cover" 	   : rows[0].cover,
							"access"	   : rows[0].access
						};
						
						var options = {
							host: 'api.xalovansu.com',
							port: 80,
							path: "/tuVi/tuViTronDoi/xem/gioitinh/"+((user.sex==1)?"nam":"nu")+"/namsinh/"+(user.dateOfBirth.substring(user.dateOfBirth.length-4, user.dateOfBirth.length))+"/key/tviapp@)!@",
							method: 'GET'
						};			
						var requestSend = http1.request(options, function(response){
							var buffer = new Buffer(0);
							response.on('data', function(d) {	
								buffer = Buffer.concat([buffer, d]);
							});
							response.on("end", function(){
								var text = buffer.toString();
								parseString(text, function (err, result) {
									if(err){
										sendUserInf(socket, user, null, data);
									}else{								
										var item = result.tamlinh.tuvi[0].root[0].data[0].item;
										var tuVi = 
										{
											"tongQuan": item[5].value[0],
											"cuocSong": item[6].value[0],
											"tinhDuyen": item[7].value[0],
											"suNghiep": item[8].value[0],
											"tuoiLamAn": item[9].value[0],
											"tuoiKetDuyen": item[10].value[0],
											"tuoiKy": item[11].value[0],
											"nhungNamKhoKhan": item[12].value[0],
											"ngayGioTot": item[13].value[0],
											"dienTienTungNam": item[14].value[0]
										};
										sendUserInf(socket, user, tuVi, data);			
									}
								});
							});
							response.on("error", function(err){
								sendUserInf(socket, user, null, data);
							});
						});

						requestSend.end();
						requestSend.on("error", function(err){
							sendUserInf(socket, user, null, data);
						});
						
					}else{			
						socket.emit("login", { "status": PASSWORD_ERROR});//Password sai
					}
				}
			}
		});
	});
	
	socket.on("trangthaibanbe", function(){
		//Lấy danh sách bạn bè
		var queryString = "SELECT user.id, user.avatar, user.username, status FROM user, listfriend WHERE (user.id = listfriend.sender AND listfriend.receiver='"+
							user.id+"') OR (user.id = listfriend.receiver AND listfriend.sender='"+user.id+"')";
		connection.query(queryString, function(err, rows, fields){	
			if(err){
				socket.emit("trangthaibanbe")
			}else{	
				var fri = [];
				for(var i=0;i<rows.length;i++){
					var temp = 
					{
						"id" 	   :rows[i].id,
						"userName" :rows[i].username,
						"avatar"   :rows[i].avatar,
						"status"   :rows[i].status
					};
					fri.push(temp);
				}
				for(var i=0;i<fri.length;i++){
					for(var j=0;j<fri.length;j++){
						if(i != j){
							if(fri[i].id == fri[j].id){
								fri.splice(i,1);
								i--;
								break;
							}
						}
					}
				}
			}
		});
	});
	
	socket.on("setting offline", function(){
		console.log("setting offline");
		var uID = map.get(socket.id);
		if( uID != null){
			map.remove(socket.id);
			mapOffline.set(socket.id, uID);
			socket.broadcast.to(socket.id).emit("friend offline", {"id":uID});//Unwanted
			var clients = io.nsps['/'].adapter.rooms[socket.id];
			if(clients != undefined){
				var sIDs = Object.keys(clients);
				for(var i=0;i<sIDs.length;i++){
					var s = allSockets[sIDs[i]];
					if(s != undefined){
						s.leave(socket.id);
					}
				}
			}
		}
	});
	
	socket.on("setting online", function(){
		console.log("setting online");
		var uID = mapOffline.get(socket.id);
		if( uID != null){
			var queryString = "SELECT user.id FROM user, listfriend WHERE (user.id = listfriend.sender AND listfriend.receiver='"+
							uID+"') OR (user.id = listfriend.receiver AND listfriend.sender='"+uID+"')";
		
			connection.query(queryString, function(err, rows, fields){
				if(!err){
					mapOffline.remove(socket.id);
					map.set(socket.id, uID);
					socket.join(socket.id);
					var length = rows.length;
					for(var i=0;i<length;i++){
						var sID = map.search(rows[i].id);
						if( sID != null){
							socket.broadcast.to(rows[i].id).emit("friend online", {"id":uID});
							socket.emit("friend online", {"id":rows[i].id});
							allSockets[sID].join(socket.id);
						}else{
							sID = mapOffline.search(rows[i].id);
							if(sID != null){
								allSockets[sID].join(socket.id);
							}
						}
					}
				}
			});
		}
	});
	
	socket.on("nhanthongbao", function(){
		console.log("Nhan thong bao");
		var uID = map.get(socket.id);
		if( uID == undefined){
			uID = mapOffline.get(socket.id);
		}
		if(uID != undefined){
			var queryString = "select id2, code, created_date from notification where id1='"+uID+"'";
			connection.query(queryString, function(err, rows, fields){
				if(err){
					socket.emit("nhanthongbao", {"status":FAILD});
				}else{
					var count = 0;
					var notifies = [];
					for(i=0;i<rows.length;i++){
						if(rows[i].code == 0){
							var inf = {
										"id":rows[i].id2,
										"code":rows[i].code,
										"created_date":rows[i].created_date
									  };
							notifies.push(inf);
						}else{
							count++;
						}
					}
					socket.emit("nhanthongbao", {
												  "status":SUCCESS,
												  "notifies":notifies,
												  "count":count
												});
				}
			});
		}else{
			socket.emit("nhanthongbao", {"status":FAILD});
		}
	});
	
	socket.on("daxemthongbao", function(){
		console.log("Da xem thong bao");
		var uID = map.get(socket.id);
		if( uID == undefined){
			uID = mapOffline.get(socket.id);
		}
		if(uID != undefined){
			var queryString = "delete from notification where id1='"+uID+"'";
			connection.query(queryString, function(err, results){
			});
		}
	});
	
	socket.on("guiyeucauketban", function(id){
		console.log("Send request friend");
		var uID = map.get(socket.id);
		if( uID == undefined){
			uID = mapOffline.get(socket.id);
		}
		if(uID != undefined){
			var dateTime = new Date();
			dateTime = dateTime.getFullYear()+"-"+(dateTime.getMonth()+1)+"-"+dateTime.getDate()+" "+
				dateTime.getHours()+":"+dateTime.getMinutes()+":"+dateTime.getSeconds();
			var queryString = "insert into requestfriend(sender, receiver, created_date) values('"+uID+"','"+id+"','"+dateTime+"')";
			connection.query(queryString, function(err, results){
				if(!err){
					if((map.search(id)!=null)||(mapOffline.search(id)!=null)){
						queryString = "select avatar, username, status from user where id='"+uID+"'";
						connection.query(queryString, function(err, rows, fields){
							if(!err){
								if(rows.length != 0){
									socket.broadcast.to(id).emit("nhanyeucauketbanmoi", {   
																							"id":uID,
																							"avatar":rows[0].avatar,
																							"username":rows[0].username,
																							"status":rows[0].status,
																							"dateTime":dateTime
																						});
								}
							}else{
								queryString = "insert into notification(id1, id2, code, created_date) values('"+id+"','"+uID+"','1','"+dateTime+"')";
								connection.query(queryString, function(err, results){
								});
							}
						});
					}else{
						queryString = "insert into notification(id1, id2, code, created_date) values('"+id+"','"+uID+"','1','"+dateTime+"')";
						connection.query(queryString, function(err, results){
						});
					}
				}
			});
		}
	});
	
	socket.on("huyguiyeucauketban", function(id){
		var uID = map.get(socket.id);
		if( uID == undefined){
			uID = mapOffline.get(socket.id);
		}
		if(uID != undefined){
			var queryString = "delete from requestfriend where sender='"+uID+"' and receiver='"+id+"'";
			connection.query(queryString, function(err, results){
				if(!err){
					if((map.search(id)!=null)||(mapOffline.search(id)!=null)){
						socket.broadcast.to(id).emit("huyguiyeucauketban", {"id":uID});
					}
					queryString = "delete from notification where id1='"+id+"' and id2='"+uID+"' and code='1'";
					connection.query(queryString, function(err, results){
					});
				}
			});
		}
	});
	
	socket.on("tuchoiketban", function(id){
		console.log("tuchoiketban");
		var uID = map.get(socket.id);
		if( uID == undefined){
			uID = mapOffline.get(socket.id);
		}
		if(uID != undefined){
			var queryString = "delete from requestfriend where sender='"+id+"' and receiver='"+uID+"'";
			connection.query(queryString, function(err, results){
				if(!err){
					if((map.search(id)!=null)||(mapOffline.search(id)!=null)){
						socket.broadcast.to(id).emit("tuchoiketban", {"id":uID});
					}
					queryString = "delete from notification where id1='"+uID+"' and id2='"+id+"' and code='1'";
					connection.query(queryString, function(err, results){
					});
				}
			});
		}
	});
	
	
	socket.on("huybanbe", function(id){
		console.log("Huy ket ban");
		var isOnline1 = true;
		var uID = map.get(socket.id);
		if( uID == undefined){
			uID = mapOffline.get(socket.id);
			isOnline1 = false;
		}
		if(uID != undefined){
			var queryString = "delete from listfriend where (sender='"+id+"' and receiver='"+uID+"') or (sender='"+uID+"' and receiver='"+id+"')";
			connection.query(queryString, function(err, results){
				if(!err){
					var isOnline2 = true;
					var sID = map.search(id);
					if( sID == null){
						sID = mapOffline.search(id);
						isOnline2 = false;
					}
					if(sID != null){
						socket.broadcast.to(id).emit("huybanbe", {"id":uID});
						if(isOnline1&&isOnline2){
							socket.leave(sID);
							allSockets[sID].leave(socket.id);
						}else if(!isOnline1&&isOnline2){
							socket.leave(sID);
						}else if(isOnline1&&!isOnline2){
							allSockets[sID].leave(socket.id);
						}
					}
				}else{
					var sID = map.search(id);
					if(sID != null){
						socket.leave(sID);
					}
				}
				queryString = "delete from requestfriend where (sender='"+id+"' and receiver='"+uID+"') or (sender='"+uID+"' and receiver='"+id+"')";
				connection.query(queryString, function(err, results){
				});
			});
		}
	});
	
	socket.on("chapnhanketban", function(id){
		var isOnline1 = true;
		var uID = map.get(socket.id);
		if( uID == undefined){
			uID = mapOffline.get(socket.id);
			isOnline1 = false;
		}
		if(uID != undefined){
			var dateTime = new Date();
			dateTime = dateTime.getFullYear()+"-"+(dateTime.getMonth()+1)+"-"+dateTime.getDate()+" "+
					dateTime.getHours()+":"+dateTime.getMinutes()+":"+dateTime.getSeconds();
			queryString = "insert into listfriend(sender, receiver, created_date) values('"+id+"','"+uID+"','"+dateTime+"')";
			connection.query(queryString, function(err, results){
				if(err){	
					socket.emit("ketquaxacnhanketban", {"status":FAILD, "id":id});
				}else{
					socket.emit("ketquaxacnhanketban", {"status":SUCCESS, "id":id});
					var isOnline2 = true;
					var sID = map.search(id);
					if(sID == null){
						sID = mapOffline.search(id);
						isOnline2 = false;
					}
					if(sID != null){
						queryString = "select avatar, username, status from user where id='"+uID+"'";
						connection.query(queryString, function(err, rows, fields){
							if(!err){
								if(rows.length != 0){
									socket.broadcast.to(id).emit("chapnhanketban",  { 
																						"id":uID,	
																						"avatar":rows[0].avatar,
																						"username":rows[0].username,
																						"status":rows[0].status																				
																					});
									if(isOnline1&&isOnline2){
										socket.join(sID);
										allSockets[sID].join(socket.id);
										socket.emit("friend online", {"id":uID});
										socket.broadcast.to(id).emit("friend online", {"id":id});
									}else if(!isOnline1&&isOnline2){
										socket.join(sID);
									}else if(isOnline1&&!isOnline2){
										allSockets[sID].join(socket.id);
									}
								}
							}else{
								queryString = "insert into notification(id1, id2, code, created_date) values('"+id+"','"+uID+"','0','"+dateTime+"')";
								connection.query(queryString, function(err, results){
								});
							}
						});
					}else{
						queryString = "insert into notification(id1, id2, code, created_date) values('"+id+"','"+uID+"','0','"+dateTime+"')";
						connection.query(queryString, function(err, results){
						});
					}	
					queryString = "delete from requestfriend where (sender='"+id+"' and receiver='"+uID+"') or (sender='"+uID+"' and receiver='"+id+"')";
					connection.query(queryString, function(err, results){
					});				
				}
			});
		}else{
			socket.emit("ketquachapnhanketban", {"status":FAILD, {"id":id});
		}
	});
	
	socket.on("disconnect", function(){
		console.log("Disconnected");
		var uID = map.get(socket.id);
		if(uID != undefined){
			console.log("Thang ranh con nay no dang online offline");
			map.remove(socket.id);
			socket.broadcast.to(socket.id).emit("friend offline", { "id":uID});
			var clients = io.nsps['/'].adapter.rooms[socket.id];
			if(clients != undefined){
				var sIDs = Object.keys(clients);
				for(var i=0;i<sIDs.length;i++){
					var s = allSockets[sIDs[i]];
					if(s != undefined){
						s.leave(socket.id);
					}
				}
			}
		}else{
			if(mapOffline.get(socket.id) != undefined){
				console.log("Thang ranh con nay no dang thiet lap offline roi offline");
				mapOffline.remove(socket.id);
			}else{
				console.log("Thang ranh con nay no chua lam gi da~ offline");
			}
		}
		delete users[socket.idU];
	});
	
	socket.on("update avatar", function(data){
		console.log("Image");
		var uID = map.get(socket.id);
		if( uID == null){
			uID = mapOffline.get(socket.id);
		}
		if(uID != null){
			if( (data.link == "/images/avatar/male.png") ||
				(data.link == "/images/avatar/female.png") ){
				updateAvatar(socket, 0, uID, data);
			}else{
				var version = parseInt(data.link.substring(data.link.indexOf("vn")+2, data.link.length));		
				updateAvatar(socket, version, uID, data);
			}
		}else{
			socket.emit("update avatar", {"status":FAILD});
		}
	});
	
	socket.on("update cover", function(data){
		console.log("Cover");
		var uID = map.get(socket.id);
		if( uID == null){
			uID = mapOffline.get(socket.id);
		}
		if(uID != null){
			if(data.link == "/images/cover/cover.png" ){
				updateCover(socket, 0, uID, data);
			}else{
				var version = parseInt(data.link.substring(data.link.indexOf("vn")+2, data.link.length));	
				updateCover(socket, version, uID, data);
			}
		}else{
			socket.emit("update cover", {"status":FAILD});
		}
	});
	
	socket.on("dohoptuvi", function(data){
		var nam = data.nam.split("-");
		var nu = data.nu.split("-");
		console.log(nam+" "+nu);
		
		var options = 
		{
			host: 'api.xalovansu.com',
			port: 80,
			path: "/tuVi/chamDiemCapDoi/xem/namsinhnam/"+nam[2]+"/namsinhnu/"+nu[2]+"/ngaysinh1/"+nam[0]+"/thangsinh1/"+nam[1]+"/ngaysinh2/"+nu[0]+"/thangsinh2/"+nu[1]+"/key/tviapp@)!@",
			method: 'GET'
		};	
		
		var requestSend = http1.request(options, function(response){
			var buffer = new Buffer(0);
			response.on('data', function(d) {	
				buffer = Buffer.concat([buffer, d]);
			});
			response.on("end", function(){
				var text = buffer.toString();
				parseString(text, function (err, result) {
					if(err){
						var doHopTuVi = 
						{
							"thongTinChung": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
							"cung": 20,
							"can": 20,
							"chi": 20,
							"menh": 20,
							"hoangDao":20,
							"ketLuan": "Tổng điểm: 100/100. Hệ thống đang gặp sự cố vui lòng thử lại sau!"
						};
						socket.emit("dohoptuvi", { "doHopTuVi": doHopTuVi});
					}else{								
						var item = result.tamlinh.tuvi[0].root[0].data[0].item;
						var doHopTuVi = {
										"thongTinChung": item[0].value[0],
										"cung": Number(item[1].value[0].match(/\d+/)),
										"can": Number(item[2].value[0].match(/\d+/)),
										"chi": Number(item[3].value[0].match(/\d+/)),
										"menh": Number(item[4].value[0].match(/\d+/)),
										"hoangDao": Number(item[5].value[0].match(/\d+/)),
										"ketLuan":item[6].value[0]
										};
						socket.emit("dohoptuvi", { "doHopTuVi":doHopTuVi });					
					}
				});
			});
			response.on("error", function(err){
				var doHopTuVi = 
				{
					"thongTinChung": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
					"cung": 20,
					"can": 20,
					"chi": 20,
					"menh": 20,
					"hoangDao":20,
					"ketLuan": "Tổng điểm: 100/100. Hệ thống đang gặp sự cố vui lòng thử lại sau!"
				};
				socket.emit("dohoptuvi", { "doHopTuVi": doHopTuVi});
			});
		});

		requestSend.end();
		requestSend.on("error", function(err){
			var doHopTuVi = 
			{
				"thongTinChung": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
				"cung": 20,
				"can": 20,
				"chi": 20,
				"menh": 20,
				"hoangDao":20,
				"ketLuan": "Tổng điểm: 100/100. Hệ thống đang gặp sự cố vui lòng thử lại sau!"
			};
			socket.emit("dohoptuvi", { "doHopTuVi": doHopTuVi});
		});
	});
	
	socket.on("tuvihangngay", function(data){
		console.log("tuvihangngay"+data.ngaySinh);
		var ngaySinh = data.ngaySinh.split("-");
		var dateTime = new Date();
		
		var options = {
				host: 'api.xalovansu.com',
				port: 80,
				path: "/chiemTinh/nhipSinhHoc/xem/ngaysinh/"+ngaySinh[0]+"/thangsinh/"+ngaySinh[1]+"/namsinh/"+ngaySinh[2]+"/ngayxem/"+dateTime.getDate()+"/thangxem/"+(dateTime.getMonth()+1)+"/namxem/"+dateTime.getFullYear()+"/key/tviapp@)!@",
				method: 'GET'
			};	
		console.log(options);
	    //console.log(options);
		var requestSend = http1.request(options, function(response){
			var buffer = new Buffer(0);
			response.on('data', function(d) {	
				buffer = Buffer.concat([buffer, d]);
			});
			response.on("end", function(){
				var text = buffer.toString();
				parseString(text, function (err, result) {
					if(err){
						var tuViHangNgay = 
						{
							"thongTinChung": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
							"sucKhoe": "Chỉ số: 100%.",
							"tinhCam": "Chỉ số: 100%.",
							"triTue": "Chỉ số: 100%.",
							"trucGiac": "Chỉ số: 100%.",
							"yNghia": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
							"ngayGio": tinhNgay(dateTime.getDate(), dateTime.getMonth()+1, dateTime.getFullYear())
						};				
						socket.emit("tuvihangngay", { "tuViHangNgay":tuViHangNgay });
					}else{								
						var item = result.tamlinh.tuvi[0].root[0].data[0].item;
						var tuViHangNgay = {
										"thongTinChung": item[0].value[0],
										"sucKhoe": item[1].value[0],
										"tinhCam": item[2].value[0],
										"triTue": item[3].value[0],
										"trucGiac": item[4].value[0],
										"yNghia": item[5].value[0],
										"ngayGio": tinhNgay(dateTime.getDate(), dateTime.getMonth()+1, dateTime.getFullYear())
										};
						socket.emit("tuvihangngay", { "tuViHangNgay":tuViHangNgay });					
					}
				});
			});
			response.on("error", function(err){
				var tuViHangNgay = 
				{
					"thongTinChung": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
					"sucKhoe": "Chỉ số: 100%.",
					"tinhCam": "Chỉ số: 100%.",
					"triTue": "Chỉ số: 100%.",
					"trucGiac": "Chỉ số: 100%.",
					"yNghia": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
					"ngayGio": tinhNgay(dateTime.getDate(), dateTime.getMonth()+1, dateTime.getFullYear())
				};				
				socket.emit("tuvihangngay", { "tuViHangNgay":tuViHangNgay });
			});
		});

		requestSend.end();
		requestSend.on("error", function(err){
			var tuViHangNgay = 
			{
				"thongTinChung": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
				"sucKhoe": "Chỉ số: 100%.",
				"tinhCam": "Chỉ số: 100%.",
				"triTue": "Chỉ số: 100%.",
				"trucGiac": "Chỉ số: 100%.",
				"yNghia": "Hệ thống đang gặp sự cố vui lòng thử lại sau!",
				"ngayGio": tinhNgay(dateTime.getDate(), dateTime.getMonth()+1, dateTime.getFullYear())
			};				
			socket.emit("tuvihangngay", { "tuViHangNgay":tuViHangNgay });
		});
	});
	
	socket.on("xemtrangcanhan", function(data){
		console.log("Xem trang ca nhan:"+data.id1+" "+data.id2	);
		var queryString = "select * from user where id='"+data.id2+"'";
		connection.query(queryString, function(err, rows, fields){
			if(err){
				socket.emit("xemtrangcanhan", { "status": SYSTEM_ERROR });//Không truy xuất được CSDL
			}else{
				if(rows.length == 0){
					socket.emit("xemtrangcanhan", { "status": SYSTEM_ERROR }); // Không tìm thấy user ứng với id
				}else{
					var user = 
						{
							"id"           : rows[0].id,
							"userName"     : rows[0].username,
							"phoneNumber"  : rows[0].phonenumber,
							"sex"		   : rows[0].sex,
							"dateOfBirth"  : rows[0].dateofbirth,
							"job"		   : rows[0].job,
							"country"	   : rows[0].country,
							"liveNow"	   : rows[0].livenow,
							"description"  : rows[0].description,
							"status"	   : rows[0].status,
							"active"	   : rows[0].active,
							"avatar"	   : rows[0].avatar,
							"cover" 	   : rows[0].cover,
							"access"	   : rows[0].access
						};
					var options = 
					{
						host: 'api.xalovansu.com',
						port: 80,
						path: "/tuVi/tuViTronDoi/xem/gioitinh/"+((user.sex==1)?"nam":"nu")+"/namsinh/"+(user.dateOfBirth.substring(user.dateOfBirth.length-4, user.dateOfBirth.length))+"/key/tviapp@)!@",
						method: 'GET'
						
					};			
					//console.log(options);
					var requestSend = http1.request(options, function(response){
						var buffer = new Buffer(0);
						response.on('data', function(d) {	
							buffer = Buffer.concat([buffer, d]);
						});
						response.on("end", function(){
							var text = buffer.toString();
							parseString(text, function (err, result) {
								if(err){
									userProfile(socket, user, null, data);
								}else{								
									var item = result.tamlinh.tuvi[0].root[0].data[0].item;
									var tuVi = 
									{
										"tongQuan": item[5].value[0],
										"cuocSong": item[6].value[0],
										"tinhDuyen": item[7].value[0],
										"suNghiep": item[8].value[0],
										"tuoiLamAn": item[9].value[0],
										"tuoiKetDuyen": item[10].value[0],
										"tuoiKy": item[11].value[0],
										"nhungNamKhoKhan": item[12].value[0],
										"ngayGioTot": item[13].value[0],
										"dienTienTungNam": item[14].value[0]
									};
									userProfile(socket, user, tuVi, data);		
								}
							});
						});
						response.on("error", function(err){
							userProfile(socket, user, null, data);
						});
					});

					requestSend.end();
					requestSend.on("error", function(err){
						userProfile(socket, user, null, data);
					});
				}
			}
		});
	});

	socket.on("goiybanbe", function(data){
		if(socket.idU == null || users[socket.idU]==null)
			return;
	  
	  
		var arr = [];
		var user;
		var dem =0;
		var length = 0;
		var queryString = format("Select dateofbirth,sex from user where id = '{0}'",socket.idU);
		console.log(queryString+socket.idU);
		var getUser = function(rows){
			user = rows[0];
		};
		queryFun(queryString,null,getUser,null);
		
		var sort = function(arr){
			for(var i = 0;i < arr.length;i++){
				for(var j=i+1;j<arr.length;j++){
					if(arr[i].user.username.localeCompare(arr[j].user.username)==-1){
							var str = arr[i];
							arr[i]=arr[j];
							arr[j]=str;
						}
				
				}
			}
			
			
			for(var i =0;i<arr.length;i++){
				for(var j=i+1;j<arr.length;j++){
					if(arr[i].dohop<arr[j].dohop){
						var str = arr[i];
						arr[i]=arr[j];
						arr[j]=str;
					}
				}
			}
			if(arr.length<10){
				socket.emit("goiybanbe",{data:arr,key:data.key});
				return;
			}
			
			
			if(arr.length>=10){
				var arr_str = [];
				console.log(data.index);
				for(var i=data.index;(i<arr.length&&i<data.index+10);i++){
					arr_str.push(arr[i]);
				}
				if(arr_str.length==0)
					socket.emit("goiybanbe",{data:"",key:data.key});
				else
					socket.emit("goiybanbe",{data:arr_str,key:data.key});
			}
			
		};
		var checkRequestFr = function(arr,doHopTuVi){
			var queryString = format("Select receiver from requestfriend where sender = '{0}' and receiver = '{1}'",socket.idU,doHopTuVi.user.id);
			var empty = function(){
				querySender();
			};
			var Sender = function(rows){
				doHopTuVi.ketban=1;
				querySender();
			};
			
			var querySender = function(){
				var queryString = format("Select sender from requestfriend where sender = '{0}' and receiver = '{1}'",doHopTuVi.user.id,socket.idU);
				var resultEmpty = function(){
					count(arr);
				}
				
				var Receiver = function(){
					console.log("sssssssssssssss");
					doHopTuVi.ketban=2;
					count(arr);
				}
				console.log(queryString);
				queryFun(queryString,resultEmpty,Receiver,null);
				
				
			};
			queryFun(queryString,empty,Sender,null);
			
		}
		
		var count = function(arr){
			dem++;
			console.log(dem+"--"+ length);
			if(dem == length){
				sort(arr);
			}
		};
		
		var queryString = format("Select id,cover,avatar,username,sex,dateofbirth,livenow,status,access from user where username like '%{0}%' and id != '{1}' and id not in(Select receiver from listfriend where sender = '{1}') and id not in (Select sender from listfriend where receiver = '{1}')  ",data.key,socket.idU);
		var resultEmpty = function(){
			socket.emit("goiybanbe",{data:"",key:data.key});
		};
		
		var requestTuVi = function(options){
			var requestSend = http1.request(options, function(response){
							var buffer = new Buffer(0);
							response.on('data', function(d) {	
								buffer = Buffer.concat([buffer, d]);
							});
							response.on("end", function(){
								var data = buffer.toString();
								parseString(data, function (err, result) {
									if(err){
										socket.emit("dohoptuvi", { "doHopTuVi":[] });
										var doHopTuVi = {
											"user":options.user,
											"dohop": 0,
											"ketban": 0
										};
										arr.push(doHopTuVi);
										checkRequestFr(arr,doHopTuVi);
									}else{								
										var item = result.tamlinh.tuvi[0].root[0].data[0].item;
					
										var diem = 0;
										
										
										
										if((item[6].value[0]).charAt(14)=='/')
											diem = 100;
										else{
											if((item[6].value[0]).charAt(12)=='/'){
												diem = parseInt((item[6].value[0]).charAt(11));
											}
											else{
												diem = parseInt((item[6].value[0]).charAt(11));
												diem=diem*10;
												diem +=parseInt((item[6].value[0]).charAt(12))
											}
											
										}
								
										var doHopTuVi = {
														"user":options.user,
														"dohop": diem,
														"ketban": 0
														};
										arr.push(doHopTuVi);
										checkRequestFr(arr,doHopTuVi);
									}
								});
							});
							response.on("error", function(err){
								var doHopTuVi = {
									"user":options.user,
									"dohop": 0,
									"ketban": 0
								};
								arr.push(doHopTuVi);
								checkRequestFr(arr,doHopTuVi);
							});

						});

						requestSend.end();
						requestSend.on("error", function(err){
							var doHopTuVi = {
									"user":options.user,
									"dohop": 0,
									"ketban": 0
								};
								arr.push(doHopTuVi);
								checkRequestFr(arr,doHopTuVi);
						});
		};
		
		var getTuVi = function(rows){
			length = rows.length;
			for(var i = 0; i < rows.length ; i++){
				if(user.sex == 1){
					if(rows[i].sex == 0){
						var nam = (user.dateofbirth).split("-");
						var nu = (rows[i].dateofbirth).split("-");
						var nam_am = getLunarYearFromSolar(parseInt(nam[0]), parseInt(nam[1]), parseInt(nam[2]), 7.0);
						var nu_am = getLunarYearFromSolar(parseInt(nu[0]), parseInt(nu[1]), parseInt(nu[2]), 7.0);
					
						var options = {
							host: 'api.xalovansu.com',
							port: 80,
							path: format("/tuVi/chamDiemCapDoi/xem/namsinhnam/{0}/namsinhnu/{1}/ngaysinh1/{2}/thangsinh1/{3}/ngaysinh2/{4}/thangsinh2/{5}/key/tviapp@)!@",nam_am,nu_am,nam[0],nam[1],nu[0],nu[1]),
							method: 'GET',
							user: rows[i]
						};
						requestTuVi(options);
						
					}
					else{
						var doHopTuVi = {
							"user":rows[i],
							"dohop": 0,
							"ketban": 0
							
						};
						arr.push(doHopTuVi);
						checkRequestFr(arr,doHopTuVi);
					}
					
				}
				else{
					if(rows[i].sex == 1){
						var nam = (user.dateofbirth).split("-");
						var nu = (rows[i].dateofbirth).split("-");
						nam = getLunarYearFromSolar(parseInt(nam[0]), parseInt(nam[1]), parseInt(nam[2]), 7.0);
						nu = getLunarYearFromSolar(parseInt(nu[0]), parseInt(nu[1]), parseInt(nu[2]), 7.0);
						var options = {
							host: 'api.xalovansu.com',
							port: 80,
							path: "/tuVi/luongDuyenVoChong/xem/gioitinh/nam/namsinhnam/"+nam+"/namsinhnu/"+nu+"/key/tviapp@)!@",
							method: 'GET',
							user: rows[i]
						};
						requestTuVi(options);
					}
					else{
						var doHopTuVi = {
							"user":rows[i],
							"dohop": 0,
							"ketban": 0
						};
						arr.push(doHopTuVi);
						checkRequestFr(arr,doHopTuVi);
					}
				}
					
				
				
			}
			
			
			
			
		}
		
		queryFun(queryString,resultEmpty,getTuVi,null);
	});

		socket.on('username', function(data){
		console.log("username");
	var arrChat =[] ;
	var count = 0;
	var arr =[];
    var queryString = "SELECT * FROM user where id = '"+data+"'";
	var arrUser = [];
	console.log(data);
	var countQuery = function(rows){
		count++;
		console.log(count);
		if(count == 2 * arrChat.length){
			socket.emit("data_chat",{dataChat:arrChat,dataUser:arrUser,dataLength:arr});
			return;
		}
		
	}
	
	var setArrChat = function(rows,i){
		var index = i;
		var queryAfter = function(rows){
			console.log(rows[0]);
			arrChat[i]=rows[0];
			setArr(arrChat,i);
		};
		var queryString = format("Select * from delay_message where Number = '{0}' and  ID_channel = '{1}'",rows[index].Number,rows[index].ID_channel);
		console.log(queryString);
		queryFun(queryString,null,queryAfter,null);
	}
	
	var	setArr = function(rows,i){
		var index = i;
		var resultArrUser = function(rows){
			arrUser[index] = rows[0];
			countQuery();
		}
		var resultArrUserEmpty = function(rows){
			arrUser[index] =null;
			countQuery();
		}
		var resultArrEmpty = function(rows){
			arr[index] ={Number:0};
			countQuery();
		}
		var resultArr = function(rows){
			arr[index] = {Number:rows.length};
			countQuery();
		}
		
		if(rows[index].Sender == socket.idU){
			var queryString = "SELECT username,avatar,sex FROM user where id = '"+rows[index].Receiver+"'";
			console.log(queryString);
			queryFun(queryString,resultArrUserEmpty,resultArrUser,null);
		}
		else{
			var queryString = "SELECT username,avatar,sex FROM user where id = '"+rows[index].Sender+"'";
			console.log(queryString);
			queryFun(queryString,resultArrUserEmpty,resultArrUser,null);
		}
		
		var queryString = format("Select * from delay_message where Receiver = '{1}' and Sent = 0 ",socket.idU);
		queryFun(queryString,resultArrEmpty,resultArr,null);
		
		
		
		
	}
	
	var emitHistory = function(rows){
		for(var i = 0;i < rows.length;i++){
			setArrChat(rows,i);
		}
	};
	
	var historyEmpty = function(){
			console.log("Empty");
				socket.emit("data_chat",{dataChat:[],dataUser:[],dataLength:[]});
		
		};
	var sendHistoryMessage = function(){
		var queryString = format("SELECT ID_channel,Max(Number) as Number FROM  delay_message where Sender = '{0}' or Receiver = '{0}'  GROUP BY ID_channel",socket.idU);
		queryFun(queryString,historyEmpty,emitHistory,null);
	};
	
	var sendNewMessage = function(){
		var sendMessage =function(rows){
			for(var i =0 ; i<rows.length ; i++){
				//socket.emit("new_message",{ID_channel:data.ID_channel,is_text:false,image_split_content:rows[0].Content,key_split_image:rows[0].Key_image,is_end_image:true,time:time});
				if(rows[0].Is_text == 1){
					socket.emit('new_message', {Number:rows[i].Number,message_content: rows[i].Content, sender:rows[i].Sender, ID_channel: rows[i].ID_channel,time:rows[i].Time,is_text:rows[i].Is_text});
				}
				else{
					var pathFile = format("file/'{0}'",rows[i].Content);
					fs.readFile(pathFile, function(err, data){
						if(err){ 
							console.log("Error: " + err); 
						}
						else{
							socket.emit('new_message', {Number:rows[i].Number,message_content: data, sender:rows[i].Sender, ID_channel: rows[i].ID_channel,time:rows[i].Time,is_text:rows[i].Is_text});
				
							
						}
					});
					
					
					
					
				}
			}
			
		};
		var historyEmpty = function(){
			console.log("Empty");
				socket.emit("data_chat",{dataChat:[],dataUser:[],dataLength:[]});
		
		};
		var queryString = format("Select * from delay_message where Receiver = '{0}' and Sent = 0 ",socket.idU);
		queryFun(queryString,historyEmpty,sendMessage,null);
		
	};
	
	
	var connectInfo = function(rows){1
		  socket.idU = rows[0].id;
		  console.log("Co client ket noi ten "+rows[0].username+ " id: "+socket.idU);
       
          users[socket.idU]= socket;
         
          socket.emit("new message",{connect:"ok"});
		  sendHistoryMessage();
		 
		  
	};
	queryFun(queryString,null,connectInfo,null);
    
  });
  
  
  socket.on("load_message",function(data){
	  console.log("load_message");
	  var queryString
	  if(data.index_topmessage!=0){  
		  queryString = format("Select * from delay_message where ID_channel = '{0}' and Number < '{1}' order by Number desc limit 0,15",data.id_channel,data.index_topmessage);
		  console.log(queryString);
	  }
	  else{
		  queryString = format("Select * from delay_message where ID_channel = '{0}' order by Number desc limit 0,15",data.id_channel);
		  console.log(queryString);
	  }	  
	  var sendEmpty = function(){
			socket.emit("load_message",{load_message:[]});
			var queryString = format("UPDATE delay_message SET Sent = 1 WHERE ID_channel =  '{0}' and Receiver = '{1}' ",data.id_channel,socket.idU);
			console.log(queryString);
			queryFun(queryString,null,null,null);
	  };
	  var sendHistoryMessage = function(rows){
			socket.emit("load_message",{load_message:rows});
			var queryString = format("UPDATE delay_message SET Sent = 1 WHERE ID_channel =  '{0}' and Receiver = '{1}' ",data.id_channel,socket.idU);
			console.log(queryString);
			queryFun(queryString,null,null,null);
	  };
	  queryFun(queryString,sendEmpty,sendHistoryMessage,null);
  });
			
  
  
  socket.on('Create Group',function(data){  //Thông báo tạo Chát Group từ Client gửi lên
    console.log(data);
    var queryString = "SELECT MIN(IDGroup) AS IDGroup  FROM chatGroup";
    connection.query(queryString, function(err, rows, fields) {
      if (err){
      //Lỗi hệ thống
    }else{
      console.log(rows);
      var idChanel = rows[0].IDGroup-1;           //Tạo chanel id mới cho group chat   

      //Lưu lại số thành viên vào CSDL
      var queryString = format("INSERT INTO chatGroup(IDGroup,IDUser) VALUES('{0}','{1}')",idChanel,socket.idU);
      console.log(queryString);
      connection.query(queryString);

      for(var i = 0;i<data.length;i++){
       var queryString = format("INSERT INTO chatGroup(IDGroup,IDUser) VALUES('{0}','{1}')",idChanel,nametoid[data[i]]);
       console.log(queryString);
       connection.query(queryString);
     }

     socket.emit('Create Group',idChanel);       //Gửi thông đệp tạo thành công vs thông số trả về là ID chanel của group Chat
   }
 });

  });



 


socket.on('received_message',function(data){
	console.log(data);
  var time = new Date();
  Date.masks.default = 'hh:mm:ss';
  time=time.format() ;
   var date = new Date();
  Date.masks.default = 'hh:mm:ss';
  date=date.format() ;
       console.log('received_message'+data);
      if(data>0){                //Nếu là tin nhắn từ chat 2 người 
        var idU = idChanelToidUser(data);   //Chuyển từ ID Chanel sang 2 id người nhận và người gửi
        if(idU.id1 == socket.idU){
          idU=idU.id2;
        }
        else{
          idU=idU.id1;
        }
        console.log("id"+idU);
         if(users[idU]!=null)
			users[idU].emit('received_message',{ID_channel:data,date:date,time:time});

		var queryString = format("UPDATE delay_message SET Sent = 1 WHERE ID_channel =  '{0}' ",data);
		console.log(queryString);
        queryFun(queryString,null,null,null);
		
      }
});

socket.on('notyping_message',function(data){
  var time = new Date();
  Date.masks.default = 'hh:mm:ss';
  time=time.format() ;
  var date = new Date();
  Date.masks.default = 'hh:mm:ss';
  date=date.format() ;
      console.log('notyping_message'+data);
      if(data>0){                //Nếu là tin nhắn từ chat 2 người 
        var idU = idChanelToidUser(data);   //Chuyển từ ID Chanel sang 2 id người nhận và người gửi
        if(idU.id1 == socket.idU){
          idU=idU.id2;
        }
        else{
          idU=idU.id1;
        }
        console.log("id"+idU);
         if(users[idU]!=null)
        users[idU].emit('notyping_message',{ID_channel:data,date:date,time:time});
      }
  });

socket.on('seen_message',function(data){
  var time = new Date();
  Date.masks.default = 'hh:mm:ss';
  time=time.format() ;
  var date = new Date();
  Date.masks.default = 'hh:mm:ss';
  date=date.format() ;
       console.log('seen_message'+data);
      if(data>0){                //Nếu là tin nhắn từ chat 2 người 
        var idU = idChanelToidUser(data);   //Chuyển từ ID Chanel sang 2 id người nhận và người gửi
        if(idU.id1 == socket.idU){
          idU=idU.id2;
        }
        else{
          idU=idU.id1;
        }
        console.log("id"+idU);
        if(users[idU]!=null)
        users[idU].emit('seen_message',{ID_channel:data,date:date,time:time});
      }
  });




socket.on('daNhanMotPhanHinhAnh',function(data){
	
	console.log("daNhanMotPhanHinhAnh"+data.key_split_image);
	var time = new Date();
  Date.masks.default = 'hh:mm:ss';
  time=time.format() ;
  var key = parseInt(data.key_split_image)+1;
  var queryString = format("SELECT * FROM image_message where ID_channel = {0} and Key_image = {1} ORDER BY ID DESC",data.ID_channel,key);
  console.log("key"+key+"key");
      connection.query(queryString, function(err, rows, fields) {
        if (err){
          //Lỗi CSDL
        }
        else{
			console.log(rows[[0].Key_image]);
			if(rows[0].Is_end==1){
				socket.emit("new_message",{ID_channel:data.ID_channel,is_text:false,image_split_content:rows[0].Content,key_split_image:rows[0].Key_image,is_end_image:true,time:time});
				 var queryInsert = format("DELETE FROM  image_message WHERE ID_channel =  '{0}'",data.ID_channel);
                 connection.query(queryInsert);
			}
			else{
				socket.emit("new_message",{ID_channel:data.ID_channel,is_text:false,image_split_content:rows[0].Content,key_split_image:rows[0].Key_image,is_end_image:false,time:time});
			}
        }
    });
  

});

	socket.on('new_image',function(data){
		//console.log(data);
		
		console.log("bat dau ghi");
		var pathFile = "file/sample.txt";
		fs.writeFile(pathFile,data.image_string, function(err){
			if(err){ console.log("Error: " + err); }
			else{ console.log("Successfully write");
			} 
			});
		fs.readFile("sample.txt", function(error, data){
		if(err){ 
			console.log("Error: " + err); 
		}
		else{ 
			if(data.ID_channel>0){                //Nếu là tin nhắn từ chat 2 người 
				var idU = idChanelToidUser(data.ID_channel);   //Chuyển từ ID Chanel sang 2 id người nhận và người gửi
				console.log(idU);
				if(idU.id1 == id){
				  idU=idU.id2;
				}
				else{
				  idU=idU.id1;
				}
				 if(users[idU]!=null){
					  users[idU].emit("new_message",data);
				 }
				
			}
		}
			
				
		});
});


  socket.on('typing_message',function(data){
	  console.log(data);
   var date = new Date();
	Date.masks.default = 'YYYY-MM-DD hh:mm:ss';
	date = date.format();
    var time = new Date();
    Date.masks.default = 'hh:mm:ss';
    time=time.format() ;
         console.log('typing_message'+data+" "+socket.idU);
        if(data>0){                //Nếu là tin nhắn từ chat 2 người 
          var idU = idChanelToidUser(data);   //Chuyển từ ID Chanel sang 2 id người nhận và người gửi
          console.log(idU);
          if(idU.id1 == socket.idU){
            idU=idU.id2;
          }
          else{
            idU=idU.id1;
          }
          console.log("id"+idU);
           if(users[idU]!=null)
          users[idU].emit('typing_message',{ID_channel:data,date:date,time:time});
        }
  });

  socket.on('new_message', function(data){   //Nhận thông báo có tin nhắn mới được gửi
	var datetime = new Date();
	Date.masks.default = 'YYYY-MM-DD hh:mm:ss';
	datetime = datetime.format();
    var time = new Date();
    Date.masks.default = 'hh:mm:ss';
    time=time.format() ;
	
	var date = new Date();
    Date.masks.default = 'hh:mm:ss';
    date=date.format() ;
	
   
      if(data.ID_channel>0){                //Nếu là tin nhắn từ chat 2 người 
        var idU = idChanelToidUser(data.ID_channel);   //Chuyển từ ID Chanel sang 2 id người nhận và người gửi
        console.log(idU);
        if(idU.id1 == socket.idU){
          idU=idU.id2;
        }
        else{
          idU=idU.id1;
        }
		
		var Number;
        socket.emit("sent_message",{ID_channel:data.ID_channel,date:date,time:time});
		var queryString = format("SELECT Max(Number) AS Number FROM delay_message WHERE ID_channel = '{0}'",data.ID_channel);
		console.log(queryString);
		var emptyMessage = function(){
			Number=0;
		};
		var noEmptyMessage = function(rows){
			console.log(rows[0].Number);
			Number = rows[0].Number;
			Number++;
		};
		
		
        if(data.is_text==true){
		  var insertMessage = function(){
			  var queryInsert = format("INSERT INTO delay_message(Number,ID_channel,Sender,Receiver,Content,Is_text,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}','{5}','{6}','{7}')",Number,data.ID_channel,socket.idU,idU,data.message_content,1,datetime,0);
			  queryFun(queryInsert,null,null,null);
		  };
		  console.log("loi oi la loi");
		  queryFun(queryString,emptyMessage,noEmptyMessage,insertMessage);
          if(users[idU]!=null){    //Nếu người nhận đang online thì gửi tin nhắn đến người nhận và lưu lại tin nhắn vào CSDL
			users[idU].emit('new_message', {Number:Number,message_content: data.message_content, sender:socket.idU, ID_channel: data.ID_channel,time:datetime,is_text:data.is_text});
          }
       
		}
        else{
			var insertMessage = function(){
				var file_name = format("{0}-{1}.txt",data.ID_channel,Number);
				console.log(Number);
				console.log(file_name);
				var pathFile = format("file/'{0}'",file_name);
				
				fs.writeFile(pathFile,data.message_content, function(err){
				if(err){ 
					console.log("Error: " + err); 
				}
				else{
					console.log("Successfully write");
				} 
				});
				var queryInsert = format("INSERT INTO delay_message(Number,ID_channel,Sender,Receiver,Content,Is_text,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}','{5}','{6}','{7}')",Number,data.ID_channel,socket.idU,idU,file_name,0,datetime,0);
				queryFun(queryInsert,null,null,null);
			};
			
			queryFun(queryString,emptyMessage,noEmptyMessage,insertMessage);
			
			if(users[idU]!=null){
				users[idU].emit('new_message', {Number:Number,message_content: data.message_content, sender:socket.nickname, ID_channel: data.ID_channel,time:datetime,is_text:data.is_text});
			}			
					
					
		}
			
			
        
    }
    else if (data.chanel<0){    //Nếu là tin nhắn từ group chat
      var listUser = null;
      for(var i = bufferIDGroup.length - 1 ; i >=0 ; i --){ //Kiểm tra xem ID chanel có trong buffer hay chưa
        if(data.chanel ==  bufferIDGroup[i][0]){
          listUser = bufferIDGroup[i];
        }
      }
      console.log("sssss"+listUser);
      if(listUser == null){                     //Nếu chưa có thì truy xuất CSDL để lấy ra
       console.log("sssss"+listUser);
       var queryString = format("SELECT IDUser FROM chatGroup where IDGroup = '{0}'",data.chanel);
       console.log(queryString);
       connection.query(queryString, function(err, rows, fields) {

        console.log(rows);
        if (err){

                     //Lỗi hệ thống 
                   }else{
                    listUser = [];
                    listUser.push(data.ID_channel);
                    for(var i = 0; i < rows.length; i++){   //Tạo 1 mảng lưu list user trong 1 group chat vs phần từ đầu tiên là ID Chanel
                      listUser.push(rows[i].IDUser);
                    }


                    if(bufferIDGroup.length>=bufflength){  //Nếu buffer đầu thì đẩy phần từ cuối ra khỏi buffer
                      bufferIDGroup.shift();   
                    }

                    bufferIDGroup.push(listUser);           //Đẩy list User mới vào đầu buffer

                    for(var i = 1; i< listUser.length; i++){      //Gửi tin nhắn đến các thành viên trong group và lưu vào CSDL
                      if(nicknames[listUser[i]]==socket.nickname)
                        continue;
                      if(listUser[i]!=null){
                        listUser[i].emit('new_message', {msg: data.message_content, sender:socket.nickname, chanelID: data.ID_channel});
                        var queryInsert = format("INSERT INTO  message(Sender,IDChanel,Message,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}')",socket.idU,data.chanel,data.msg,time,1);
                        connection.query(queryInsert);
                      }
                      else{
                        var queryInsert = format("INSERT INTO  message(Sender,IDChanel,Message,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}')",socket.idU,data.chanel,data.msg,time,0);
                        connection.query(queryInsert);
                      }
                    }


                  }

                });
    }
    else{
      for(var i = 1; i< listUser.length; i++){      //Nếu đã tìm đc ID chanel trong buffer thì cũng gửi và lưu tin nhắn như bình thường
       if(nicknames[listUser[i]]==socket.nickname)
        continue;
      console.log(listUser[i]);
      users[listUser[i]].emit('new_message', {msg: data.msg, sender:socket.nickname, chanelID: data.chanel});
      var queryInsert = format("INSERT INTO  message(Sender,IDChanel,Message,Time) VALUES ('{0}','{1}','{2}','{3}')",socket.idU,data.chanel,data.msg,null);
      connection.query(queryInsert);
    }
    }


    }

});
	
	
	
	

	});


function idUserToidChanel(idU1,idU2){
 var idC;
 if(idU1>idU2){
  idC = (idU1-2)*(idU1-1)/2+idU2;
  }
  else{
    idC = (idU2-2)*(idU2-1)/2+idU1;
  }
  return   idC;
  }

  
function queryFun(queryString,callback1,callback2,callback3) {
	connection.query(queryString,function(err, rows, fields){
    if (err){
		console.log("Lỗi query SQL:"+err);
		return;
		}
	else{
      if(rows.length===0){
            console.log("Không tìm đc gì trong CSDL");
			if(callback1!=null)
				callback1();
			return;
      }
      else{
		if(callback2!=null){
			callback2(rows);
		}	
      }
	  if(callback3!=null)
		  callback3(rows);
    }      
});
}

function idChanelToidUser(idC){
 var idU1;
 var idU2=idC;
 for(idU1=0;idU1<idU2;idU1++){
  idU2-=idU1;
}
idU1++;
return {id1:idU1,id2:idU2};
}	
	
	
function sendUserInf(socket, user, tuVi, data){
	if(tuVi == null){
		tuVi = 
		{
			"tongQuan": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"cuocSong": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tinhDuyen": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"suNghiep": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tuoiLamAn": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tuoiKetDuyen": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tuoiKy": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"nhungNamKhoKhan": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"ngayGioTot": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"dienTienTungNam": "Hệ thống đang gặp sự cố vui lòng thử lại sau."
		};
	}
	if(user.active == 0){			
		socket.emit("login", {	
							  "status":SUCCESS,
							  "user": user,
							  "friends":[],
							  "friReq":[],
							  "tuVi": tuVi
							});
	}else{
		//Lấy danh sách bạn bè
		var queryString = "SELECT user.id, user.avatar, user.username, status FROM user, listfriend WHERE (user.id = listfriend.sender AND listfriend.receiver='"+
							user.id+"') OR (user.id = listfriend.receiver AND listfriend.sender='"+user.id+"')";
		connection.query(queryString, function(err, rows, fields){	
			if(!err){	
				var fri = [];
				for(var i=0;i<rows.length;i++){
					var temp = 
					{
						"id" 	   :rows[i].id,
						"userName" :rows[i].username,
						"avatar"   :rows[i].avatar,
						"status"   :rows[i].status
					};
					fri.push(temp);
				}
				//Lấy danh sách yêu cầu kết bạn
				queryString = "SELECT user.id, user.avatar, user.username, user.status, requestfriend.created_date FROM user, requestfriend WHERE user.id = requestfriend.sender and requestfriend.receiver='"+user.id+"'";
				connection.query(queryString, function(err, rows, fields){
					var friReq = [];	
					if(!err){	
						for(var i=0;i<rows.length;i++){
							var temp = 
							{
								"id" 	   :rows[i].id,
								"userName" :rows[i].username,
								"avatar"   :rows[i].avatar,
								"status"   :rows[i].status,
								"dateTime" :rows[i].created_date
							};
							friReq.push(temp);
						}
					}
					for(var i=0;i<fri.length;i++){
						for(var j=0;j<fri.length;j++){
							if(i != j){
								if(fri[i].id == fri[j].id){
									fri.splice(i,1);
									i--;
									break;
								}
							}
						}
					}
					if((fri.length !=0) && (friReq.length != 0)){
						for(var i=0;i<friReq.length;i++){
							for(var j=0;j<fri.length;j++){
								if(friReq[i].id == fri[j].id){
									friReq.splice(i,1);
									i--;
									break;
								}
							}
						}
					}
						
					//Dữ liệu gửi về cho người dùng						
					socket.emit("login", {	
											"status":SUCCESS,
											"user": user,
											"friends":fri,
											"friReq":friReq,
											"tuVi": tuVi
										 });
					if(data.isDisableOnline){
						console.log("Thang nay thiet lap offline");
						for(var i=0;i<fri.length;i++){
							var friID = fri[i].id;
							var sID = map.search(friID);
							if(sID != null){
								socket.join(sID);
							}
						}
					}else{	
						console.log("Thang nay thiet lap online");
						for(var i=0;i<fri.length;i++){					
							var friID = fri[i].id;
							var sID = map.search(friID);
							if(sID != null){
								allSockets[sID].join(socket.id);
								socket.join(sID);
								socket.broadcast.to(friID).emit("friend online", {"id":user.id});
								socket.emit("friend online", {"id":friID});
							}else{
								sID = mapOffline.search(friID);
								if(sID != null){
									allSockets[sID].join(socket.id);
								}
							}
						}
						console.log("Ket thuc ham login");
					}	
				});
			}else{	
				socket.emit("login", {	
											"status":SUCCESS,
											"user": user,
											"friends":[],
											"friReq":[],
											"tuVi": tuVi
										});
			}
		});
	}
}

function updateAvatar(socket, version, uID, data){
	version++;
	
	var writerStream = fs.createWriteStream("public/images/avatar/"+uID+"vn"+version+".jpg");
	writerStream.write(data.data);
	writerStream.end();
			
	writerStream.on("finish", function(){
		var link = "/images/avatar/"+uID+"vn"+version+".jpg";
		var queryString = "update user set avatar='"+link+"' where id='"+uID+"'";
		connection.query(queryString, function(err, results){
			if(err){
				socket.emit("update avatar", {"status":FAILD});
			}else{
				socket.emit("update avatar", {"status":SUCCESS,
											  "link":link});
				if(version != 1){
					console.log("Xoa anh dai dien cu~ di");
				}
				socket.broadcast.to(socket.id).emit("newavatar", {"id":uID, "link":link});
			}
		});
	});
			
	writerStream.on("error", function(err){
		socket.emit("update avatar", {"status":FAILD});
	});
}

function updateCover(socket, version, uID, data){
	version++;
	
	var writerStream = fs.createWriteStream("public/images/cover/"+uID+"vn"+version+".jpg");
	writerStream.write(data.data);
	writerStream.end();
			
	writerStream.on("finish", function(){
		var link = "/images/cover/"+uID+"vn"+version+".jpg";
		var queryString = "update user set cover='"+link+"' where id='"+uID+"'";
		connection.query(queryString, function(err, results){
			if(err){
				socket.emit("update cover", {"status":FAILD});
			}else{
				socket.emit("update cover", {"status":SUCCESS,
											 "link":link});
				if(version != 1){
					console.log("Xoa anh bia cu~ di");
				}
			}
		});
	});
			
	writerStream.on("error", function(err){
		socket.emit("update cover", {"status":FAILD});
	});
}

function userProfile(socket, user, tuVi, data){
	if(tuVi == null){
	    tuVi = 
		{
			"tongQuan": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"cuocSong": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tinhDuyen": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"suNghiep": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tuoiLamAn": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tuoiKetDuyen": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"tuoiKy": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"nhungNamKhoKhan": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"ngayGioTot": "Hệ thống đang gặp sự cố vui lòng thử lại sau.",
			"dienTienTungNam": "Hệ thống đang gặp sự cố vui lòng thử lại sau."
		};
	}
	var queryString = "select sender from listfriend where sender='"+data.id1+"' and receiver='"+data.id2+
						"' union all select sender from listfriend where sender='"+data.id2+"' and receiver='"+data.id1+"'";
						
	connection.query(queryString, function(err, rows, fields){
		if(err){
			socket.emit("xemtrangcanhan", {
											"status": SUCCESS,
											"user": user,
											"tuVi": tuVi,
											"relation":0
										   });
		}else{
			if(rows.length == 0){
				queryString = "select sender from requestfriend where sender='"+data.id1+"' and receiver='"+data.id2+
						"' union all select sender from requestfriend where sender='"+data.id2+"' and receiver='"+data.id1+"'";
				connection.query(queryString, function(err, rows, fields){
					if(err){
						socket.emit("xemtrangcanhan", {
														"status": SUCCESS,
														"user": user,
														"tuVi": tuVi,
														"relation":0
														});
					}else{
						if(rows.length == 0){
							socket.emit("xemtrangcanhan", {
															"status": SUCCESS,
															"user": user,
															"tuVi": tuVi,
															"relation":1
															});
						}else{
							queryString = "select sender from requestfriend where sender='"+data.id2+"' and receiver='"+data.id1+"'";
							connection.query(queryString, function(err, rows, fields){
								if(err){
									socket.emit("xemtrangcanhan", {
																	"status": SUCCESS,
																	"user": user,
																	"tuVi": tuVi,
																	"relation":0
																	});
								}else{
									if(rows.length == 0){
										socket.emit("xemtrangcanhan", {
																	"status": SUCCESS,
																	"user": user,
																	"tuVi": tuVi,
																	"relation":3
																	});
									}else{
										socket.emit("xemtrangcanhan", {
																	"status": SUCCESS,
																	"user": user,
																	"tuVi": tuVi,
																	"relation":4
																	});
									}
								}
							});
						}
					}
				});
			}else{
				//Trường hợp có friend
				socket.emit("xemtrangcanhan", {
												"status": SUCCESS,
												"user": user,
												"tuVi": tuVi,			
												"relation": 2
											   });
					
			}
		}
	});
}

//Lịch âm dương 
/*
 * Copyright (c) 2006 Ho Ngoc Duc. All Rights Reserved.
 * Astronomical algorithms from the book "Astronomical Algorithms" by Jean Meeus, 1998
 *
 * Permission to use, copy, modify, and redistribute this software and its
 * documentation for personal, non-commercial use is hereby granted provided that
 * this copyright notice and appropriate documentation appears in all copies.
 */
var PI = Math.PI;

/* Discard the fractional part of a number, e.g., INT(3.2) = 3 */
function INT(d) {
	return Math.floor(d);
}

/* Compute the (integral) Julian day number of day dd/mm/yyyy, i.e., the number 
 * of days between 1/1/4713 BC (Julian calendar) and dd/mm/yyyy. 
 * Formula from 
To view links or images in this forum your post count must be 10 or greater. You currently have 0 posts.
*/
function jdFromDate(dd, mm, yy) {
	var a, y, m, jd;
	a = INT((14 - mm) / 12);
	y = yy+4800-a;
	m = mm+12*a-3;
	jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - INT(y/100) + INT(y/400) - 32045;
	if (jd < 2299161) {
		jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - 32083;
	}
	return jd;
}

/* Convert a Julian day number to day/month/year. Parameter jd is an integer */
function jdToDate(jd) {
	var a, b, c, d, e, m, day, month, year;
	if (jd > 2299160) { // After 5/10/1582, Gregorian calendar
		a = jd + 32044;
		b = INT((4*a+3)/146097);
		c = a - INT((b*146097)/4);
	} else {
		b = 0;
		c = jd + 32082;
	}
	d = INT((4*c+3)/1461);
	e = c - INT((1461*d)/4);
	m = INT((5*e+2)/153);
	day = e - INT((153*m+2)/5) + 1;
	month = m + 3 - 12*INT(m/10);
	year = b*100 + d - 4800 + INT(m/10);
	return new Array(day, month, year);
}

/* Compute the time of the k-th new moon after the new moon of 1/1/1900 13:52 UCT 
 * (measured as the number of days since 1/1/4713 BC noon UCT, e.g., 2451545.125 is 1/1/2000 15:00 UTC).
 * Returns a floating number, e.g., 2415079.9758617813 for k=2 or 2414961.935157746 for k=-2
 * Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
 */
function NewMoon(k) {
	var T, T2, T3, dr, Jd1, M, Mpr, F, C1, deltat, JdNew;
	T = k/1236.85; // Time in Julian centuries from 1900 January 0.5
	T2 = T * T;
	T3 = T2 * T;
	dr = PI/180;
	Jd1 = 2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3;
	Jd1 = Jd1 + 0.00033*Math.sin((166.56 + 132.87*T - 0.009173*T2)*dr); // Mean new moon
	M = 359.2242 + 29.10535608*k - 0.0000333*T2 - 0.00000347*T3; // Sun's mean anomaly
	Mpr = 306.0253 + 385.81691806*k + 0.0107306*T2 + 0.00001236*T3; // Moon's mean anomaly
	F = 21.2964 + 390.67050646*k - 0.0016528*T2 - 0.00000239*T3; // Moon's argument of latitude
	C1=(0.1734 - 0.000393*T)*Math.sin(M*dr) + 0.0021*Math.sin(2*dr*M);
	C1 = C1 - 0.4068*Math.sin(Mpr*dr) + 0.0161*Math.sin(dr*2*Mpr);
	C1 = C1 - 0.0004*Math.sin(dr*3*Mpr);
	C1 = C1 + 0.0104*Math.sin(dr*2*F) - 0.0051*Math.sin(dr*(M+Mpr));
	C1 = C1 - 0.0074*Math.sin(dr*(M-Mpr)) + 0.0004*Math.sin(dr*(2*F+M));
	C1 = C1 - 0.0004*Math.sin(dr*(2*F-M)) - 0.0006*Math.sin(dr*(2*F+Mpr));
	C1 = C1 + 0.0010*Math.sin(dr*(2*F-Mpr)) + 0.0005*Math.sin(dr*(2*Mpr+M));
	if (T < -11) {
		deltat= 0.001 + 0.000839*T + 0.0002261*T2 - 0.00000845*T3 - 0.000000081*T*T3;
	} else {
		deltat= -0.000278 + 0.000265*T + 0.000262*T2;
	};
	JdNew = Jd1 + C1 - deltat;
	return JdNew;
}

/* Compute the longitude of the sun at any time. 
 * Parameter: floating number jdn, the number of days since 1/1/4713 BC noon
 * Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
 */
function SunLongitude(jdn) {
	var T, T2, dr, M, L0, DL, L;
	T = (jdn - 2451545.0 ) / 36525; // Time in Julian centuries from 2000-01-01 12:00:00 GMT
	T2 = T*T;
	dr = PI/180; // degree to radian
	M = 357.52910 + 35999.05030*T - 0.0001559*T2 - 0.00000048*T*T2; // mean anomaly, degree
	L0 = 280.46645 + 36000.76983*T + 0.0003032*T2; // mean longitude, degree
	DL = (1.914600 - 0.004817*T - 0.000014*T2)*Math.sin(dr*M);
	DL = DL + (0.019993 - 0.000101*T)*Math.sin(dr*2*M) + 0.000290*Math.sin(dr*3*M);
	L = L0 + DL; // true longitude, degree
	L = L*dr;
	L = L - PI*2*(INT(L/(PI*2))); // Normalize to (0, 2*PI)
	return L;
}

/* Compute sun position at midnight of the day with the given Julian day number. 
 * The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00.
 * The function returns a number between 0 and 11. 
 * From the day after March equinox and the 1st major term after March equinox, 0 is returned. 
 * After that, return 1, 2, 3 ... 
 */
function getSunLongitude(dayNumber, timeZone) {
	return INT(SunLongitude(dayNumber - 0.5 - timeZone/24)/PI*6);
}

/* Compute the day of the k-th new moon in the given time zone.
 * The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00
 */
function getNewMoonDay(k, timeZone) {
	return INT(NewMoon(k) + 0.5 + timeZone/24);
}

/* Find the day that starts the luner month 11 of the given year for the given time zone */
function getLunarMonth11(yy, timeZone) {
	var k, off, nm, sunLong;
	//off = jdFromDate(31, 12, yy) - 2415021.076998695;
	off = jdFromDate(31, 12, yy) - 2415021;
	k = INT(off / 29.530588853);
	nm = getNewMoonDay(k, timeZone);
	sunLong = getSunLongitude(nm, timeZone); // sun longitude at local midnight
	if (sunLong >= 9) {
		nm = getNewMoonDay(k-1, timeZone);
	}
	return nm;
}

/* Find the index of the leap month after the month starting on the day a11. */
function getLeapMonthOffset(a11, timeZone) {
	var k, last, arc, i;
	k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
	last = 0;
	i = 1; // We start with the month following lunar month 11
	arc = getSunLongitude(getNewMoonDay(k+i, timeZone), timeZone);
	do {
		last = arc;
		i++;
		arc = getSunLongitude(getNewMoonDay(k+i, timeZone), timeZone);
	} while (arc != last && i < 14);
	return i-1;
}

/* Comvert solar date dd/mm/yyyy to the corresponding lunar date */
function convertSolar2Lunar(dd, mm, yy, timeZone) {
	var k, dayNumber, monthStart, a11, b11, lunarDay, lunarMonth, lunarYear, lunarLeap;
	dayNumber = jdFromDate(dd, mm, yy);
	k = INT((dayNumber - 2415021.076998695) / 29.530588853);
	monthStart = getNewMoonDay(k+1, timeZone);
	if (monthStart > dayNumber) {
		monthStart = getNewMoonDay(k, timeZone);
	}
	//alert(dayNumber+" -> "+monthStart);
	a11 = getLunarMonth11(yy, timeZone);
	b11 = a11;
	if (a11 >= monthStart) {
		lunarYear = yy;
		a11 = getLunarMonth11(yy-1, timeZone);
	} else {
		lunarYear = yy+1;
		b11 = getLunarMonth11(yy+1, timeZone);
	}
	lunarDay = dayNumber-monthStart+1;
	diff = INT((monthStart - a11)/29);
	lunarLeap = 0;
	lunarMonth = diff+11;
	if (b11 - a11 > 365) {
		leapMonthDiff = getLeapMonthOffset(a11, timeZone);
		if (diff >= leapMonthDiff) {
			lunarMonth = diff + 10;
			if (diff == leapMonthDiff) {
				lunarLeap = 1;
			}
		}
	}
	if (lunarMonth > 12) {
		lunarMonth = lunarMonth - 12;
	}
	if (lunarMonth >= 11 && diff < 4) {
		lunarYear -= 1;
	}
	return new Array(lunarDay, lunarMonth, lunarYear, lunarLeap);
}

/* Convert a lunar date to the corresponding solar date */
function convertLunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap, timeZone) {
	var k, a11, b11, off, leapOff, leapMonth, monthStart;
	if (lunarMonth < 11) {
		a11 = getLunarMonth11(lunarYear-1, timeZone);
		b11 = getLunarMonth11(lunarYear, timeZone);
	} else {
		a11 = getLunarMonth11(lunarYear, timeZone);
		b11 = getLunarMonth11(lunarYear+1, timeZone);
	}
	k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
	off = lunarMonth - 11;
	if (off < 0) {
		off += 12;
	}
	if (b11 - a11 > 365) {
		leapOff = getLeapMonthOffset(a11, timeZone);
		leapMonth = leapOff - 2;
		if (leapMonth < 0) {
			leapMonth += 12;
		}
		if (lunarLeap != 0 && lunarMonth != leapMonth) {
			return new Array(0, 0, 0);
		} else if (lunarLeap != 0 || off >= leapOff) {
			off += 1;
		}
	}
	monthStart = getNewMoonDay(k+off, timeZone);
	return jdToDate(monthStart+lunarDay-1);
}
function convertSolar2Lunar(dd, mm, yy, timeZone){
	var k, dayNumber, monthStart, a11, b11, lunarDay, lunarMonth, lunarYear, lunarLeap;
	dayNumber = jdFromDate(dd, mm, yy);
	k = INT((dayNumber - 2415021.076998695) / 29.530588853);
	monthStart = getNewMoonDay(k+1, timeZone);
	if (monthStart > dayNumber) {
		monthStart = getNewMoonDay(k, timeZone);
	}
	a11 = getLunarMonth11(yy, timeZone);
	b11 = a11;
	if (a11 >= monthStart) {
		lunarYear = yy;
		a11 = getLunarMonth11(yy-1, timeZone);
	} else {
		lunarYear = yy+1;
		b11 = getLunarMonth11(yy+1, timeZone);
	}
	lunarDay = dayNumber-monthStart+1;
	diff = INT((monthStart - a11)/29);
	lunarLeap = 0;
	lunarMonth = diff+11;
	if (b11 - a11 > 365) {
		leapMonthDiff = getLeapMonthOffset(a11, timeZone);
		if (diff >= leapMonthDiff) {
			lunarMonth = diff + 10;
			if (diff == leapMonthDiff) {
				lunarLeap = 1;
			}
		}
	}
	if (lunarMonth > 12) {
		lunarMonth = lunarMonth - 12;
	}
	if (lunarMonth >= 11 && diff < 4) {
		lunarYear -= 1;
	}
	return [lunarDay, lunarMonth, lunarYear];
}

function getLunarYearFromSolar(dd, mm, yy, timeZone){
	var k, dayNumber, monthStart, a11, b11, lunarDay, lunarMonth, lunarYear, lunarLeap;
	dayNumber = jdFromDate(dd, mm, yy);
	k = INT((dayNumber - 2415021.076998695) / 29.530588853);
	monthStart = getNewMoonDay(k+1, timeZone);
	if (monthStart > dayNumber) {
		monthStart = getNewMoonDay(k, timeZone);
	}
	a11 = getLunarMonth11(yy, timeZone);
	b11 = a11;
	if (a11 >= monthStart) {
		lunarYear = yy;
		a11 = getLunarMonth11(yy-1, timeZone);
	} else {
		lunarYear = yy+1;
		b11 = getLunarMonth11(yy+1, timeZone);
	}
	lunarDay = dayNumber-monthStart+1;
	diff = INT((monthStart - a11)/29);
	lunarLeap = 0;
	lunarMonth = diff+11;
	if (b11 - a11 > 365) {
		leapMonthDiff = getLeapMonthOffset(a11, timeZone);
		if (diff >= leapMonthDiff) {
			lunarMonth = diff + 10;
			if (diff == leapMonthDiff) {
				lunarLeap = 1;
			}
		}
	}
	if (lunarMonth > 12) {
		lunarMonth = lunarMonth - 12;
	}
	if (lunarMonth >= 11 && diff < 4) {
		lunarYear -= 1;
	}
	return lunarYear;
}

function tinhNgay(ngay, thang, nam){
	var dayNumber, thu, tenNgay, tenThang, tenNam, gioHoangDao, gioHacDao;
	
	dayNumber = jdFromDate(ngay, thang, nam);
	switch(dayNumber%7){
		case 0: thu = "Thứ Hai";
				break;
		case 1: thu = "Thứ Ba";
				break;
		case 2: thu = "Thứ Tư";
				break;
		case 3: thu = "Thứ Năm";
				break;
		case 4: thu = "Thứ Sáu";
				break;
		case 5: thu = "Thứ Bảy";
				break;
		case 6: thu = "Chủ Nhật";
				break;
	}
	
	switch((dayNumber+9)%10){
		case 0: tenNgay = "Ngày Giáp ";
				break;
		case 1: tenNgay = "Ngày Ất ";
				break;
		case 2: tenNgay = "Ngày Bính ";
				break;
		case 3: tenNgay = "Ngày Đinh ";
				break;
		case 4: tenNgay = "Ngày Mậu ";
				break;
		case 5: tenNgay = "Ngày Kỷ ";
				break;
		case 6: tenNgay = "Ngày Canh ";
				break;
		case 7: tenNgay = "Ngày Tân ";
				break;
		case 8: tenNgay = "Ngày Nhâm ";
				break;
		case 9: tenNgay = "Ngày Quý ";
				break;
	}
	
	switch((dayNumber+1)%12){
		case 0: tenNgay += "Tý";
				gioHoangDao = "Tý (23h-01h), Sửu (01h-03h), Mão (05h-07h), Ngọ (11h-13h), Thân (15h-17h), Dậu (17h-19h)";
				gioHacDao = "Dần (03h-05h), Thìn (07h-09h), Tỵ (09h-11h), Mùi (13h-15h), Tuất (19h-21h), Hợi (21h-23h)";
				break;
		case 1: tenNgay += "Sửu";
				gioHoangDao = "Dần(03h-05h), Mão (05h-07h), Tỵ (09h-11h), Thân (15h-17h), Tuất (19h-21h), Hợi (21h-23h)";
				gioHacDao = "Tý (23h-01h), Sửu (01h-03h), Thìn (07h-09h), Ngọ (11h-13h), Mùi (13h-15h), Dậu (17h-19h)";
				break;
		case 2: tenNgay += "Dần";
				gioHoangDao = "Tý (23h-01h), Sửu (01h-03h), Thìn (07h-09h), Tỵ (09h-11h), Mùi (13h-15h), Tuất (19h-21h)";
				gioHacDao = "Dần (03h-05h), Mão (05h-07h), Ngọ (11h-13h), Thân (15h-17h), Dậu (17h-19h), Hợi (21h-23h)";
				break;
		case 3: tenNgay += "Mão";
				gioHoangDao = "Tý (23h-01h), Dần (03h-05h), Mão (05h-07h), Ngọ (11h-13h), Mùi (13h-15h), Dậu (17h-19h)";
				gioHacDao = "Sửu (01h-03h), Thìn (07h-09h), Tỵ (09h-11h), Thân (15h-17h), Tuất (19h-21h), Hợi (21h-23h)";
				break;
		case 4: tenNgay += "Thìn";
				gioHoangDao = "Dần (03h-05h), Thìn (07h-09h), Tỵ (09h-11h), Thân (15h-17h), Dậu (17h-19h), Hợi (21h-23h)";
				gioHacDao = "Tý (23h-01h), Sửu (01h-03h), Mão (05h-07h), Ngọ (11h-13h), Mùi (13h-15h), Tuất (19h-21h)";
				break;
		case 5: tenNgay += "Tỵ";
				gioHoangDao = "Sửu (01h-03h), Thìn (07h-09h), Ngọ (11h-13h), Mùi (13h-15h), Tuất (19h-21h), Hợi (21h-23h)";
				gioHacDao = "Tý (23h-01h), Dần (03h-05h), Mão (05h-07h), Tỵ (09h-11h), Thân (15h-17h), Dậu (17h-19h)";
				break;
		case 6: tenNgay += "Ngọ";
				gioHoangDao = "Tý (23h-01h), Sửu (01h-03h), Mão (05h-07h), Ngọ (11h-13h), Thân (15h-17h), Dậu (17h-19h)";
				gioHacDao = "Dần (03h-05h), Thìn (07h-09h), Tỵ (09h-11h), Mùi (13h-15h), Tuất (19h-21h), Hợi (21h-23h)";
				break;
		case 7: tenNgay += "Mùi";
				gioHoangDao = "Dần(03h-05h), Mão (05h-07h), Tỵ (09h-11h), Thân (15h-17h), Tuất (19h-21h), Hợi (21h-23h)";
				gioHacDao = "Tý (23h-01h), Sửu (01h-03h), Thìn (07h-09h), Ngọ (11h-13h), Mùi (13h-15h), Dậu (17h-19h)";
				break;
		case 8: tenNgay += "Thân";
				gioHoangDao = "Tý (23h-01h), Sửu (01h-03h), Thìn (07h-09h), Tỵ (09h-11h), Mùi (13h-15h), Tuất (19h-21h)";
				gioHacDao = "Dần (03h-05h), Mão (05h-07h), Ngọ (11h-13h), Thân (15h-17h), Dậu (17h-19h), Hợi (21h-23h)";
				break;
		case 9: tenNgay += "Dậu";
				gioHoangDao = "Tý (23h-01h), Dần (03h-05h), Mão (05h-07h), Ngọ (11h-13h), Mùi (13h-15h), Dậu (17h-19h)";
				gioHacDao = "Sửu (01h-03h), Thìn (07h-09h), Tỵ (09h-11h), Thân (15h-17h), Tuất (19h-21h), Hợi (21h-23h)";
				break;
		case 10: tenNgay += "Tuất";
				gioHoangDao = "Dần (03h-05h), Thìn (07h-09h), Tỵ (09h-11h), Thân (15h-17h), Dậu (17h-19h), Hợi (21h-23h)";
				gioHacDao = "Tý (23h-01h), Sửu (01h-03h), Mão (05h-07h), Ngọ (11h-13h), Mùi (13h-15h), Tuất (19h-21h)";
				break;
		case 11: tenNgay += "Hợi";
				gioHoangDao = "Sửu (01h-03h), Thìn (07h-09h), Ngọ (11h-13h), Mùi (13h-15h), Tuất (19h-21h), Hợi (21h-23h)";
				gioHacDao = "Tý (23h-01h), Dần (03h-05h), Mão (05h-07h), Tỵ (09h-11h), Thân (15h-17h), Dậu (17h-19h)";
				break;
	}
	
	var amLich = convertSolar2Lunar(ngay, thang, nam, 7.0);
	
	switch((amLich[2]+6)%10){
		case 0: tenNam = "Năm Giáp ";
				break;
		case 1: tenNam = "Năm Ất ";
				break;
		case 2: tenNam = "Năm Bính ";
				break;
		case 3: tenNam = "Năm Đinh ";
				break;
		case 4: tenNam = "Năm Mậu ";
				break;
		case 5: tenNam = "Năm Kỷ ";
				break;
		case 6: tenNam = "Năm Canh ";
				break;
		case 7: tenNam = "Năm Tân ";
				break;
		case 8: tenNam = "Năm Nhâm ";
				break;
		case 9: tenNam = "Năm Quý ";
				break;
	}
	
	switch((amLich[2]+8)%12){
		case 0: tenNam += "Tý";
				break;
		case 1: tenNam += "Sửu";
				break;
		case 2: tenNam += "Dần";
				break;
		case 3: tenNam += "Mão";
				break;
		case 4: tenNam += "Thìn";
				break;
		case 5: tenNam += "Tỵ";
				break;
		case 6: tenNam += "Ngọ";
				break;
		case 7: tenNam += "Mùi";
				break;
		case 8: tenNam += "Thân";
				break;
		case 9: tenNam += "Dậu";
				break;
		case 10: tenNam += "Tuất";
				break;
		case 11: tenNam += "Hợi";
				break;
	}
	
	switch((amLich[2]*12+amLich[1]+3)%10){
		case 0: tenThang = "Tháng Giáp ";
				break;
		case 1: tenThang = "Tháng Ất ";
				break;
		case 2: tenThang = "Tháng Bính ";
				break;
		case 3: tenThang = "Tháng Đinh ";
				break;
		case 4: tenThang = "Tháng Mậu ";
				break;
		case 5: tenThang = "Tháng Kỷ ";
				break;
		case 6: tenThang = "Tháng Canh ";
				break;
		case 7: tenThang = "Tháng Tân ";
				break;
		case 8: tenThang = "Tháng Nhâm ";
				break;
		case 9: tenThang = "Tháng Quý ";
				break;
	}
	
	switch(amLich[1]-1){
		case 0: tenThang += "Dần";
				break;
		case 1: tenThang += "Mão";
				break;
		case 2: tenThang += "Thìn";
				break;
		case 3: tenThang += "Tỵ";
				break;
		case 4: tenThang += "Ngọ";
				break;
		case 5: tenThang += "Mùi";
				break;
		case 6: tenThang += "Thân";
				break;
		case 7: tenThang += "Dậu";
				break;
		case 8: tenThang += "Tuất";
				break;
		case 9: tenThang += "Hợi";
				break;
		case 10: tenThang += "Tý";
				break;
		case 11: tenThang += "Sửu";
				break;
	}
	
	return { "thu": thu,
			 "ngayDuong":ngay,
			 "thangDuong":thang,
			 "namDuong":nam,
			 "ngayAm":amLich[0],
			 "thangAm":amLich[1],
			 "namAm":amLich[2],
			 "tenNgay":tenNgay,
			 "tenThang":tenThang,
			 "tenNam":tenNam,
			 "gioHoangDao": gioHoangDao,
			 "gioHacDao": gioHacDao
			};
	
}


