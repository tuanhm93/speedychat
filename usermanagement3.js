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

var bufflength = 100; //Phải test length thấp

var format = require('stringformat');
var mysql = require('mysql');
var moment = require('moment');

var nicknames = {},
users = {},
nametoid = {},
bufferIDGroup = [],
result;
require("date-format-lite");
var fs = require("fs");

var flagSendImg = -1;
var buffImg = [];
var resultSQl;



var port = 3001;
http.listen(port, function(){
	console.log("Server's running on port "+port);
});

//Cấu hình database
var mysql = require('mysql');

var db_config = {
  host     : 'localhost',
  user     : 'root',
  password : '123456',
  database : 'test'
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

/* Hàm login qua http
function login(req, res){
	console.log("Login");
	var email = req.query['email'];
	var password = req.query['password'];
	
	var queryString = "select avatar, cover, phonenumber, active, password, id, username, sex, date_format(dateofbirth, '%d-%m-%Y') as dateofbirth, job, country, livenow, description, status from user where email = '" + email +"'";
	connection.query(queryString, function(err, rows, fields) {
		if (err){
			//Lỗi hệ thống
			res.send(SYSTEM_ERROR);
		}else{
			if(rows.length != 0){
				if(password == rows[0].password){
				    var inf;
					if(rows[0].active == 0){
						inf =
						{
							"id"           : rows[0].id,
							"active"	   : 0
						};
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
							"livenow"	   : rows[0].livenow,
							"description"  : rows[0].description,
							"status"	   : rows[0].status,
							"active"	   : 1,
							"avatar"	   : rows[0].avatar,
							"cover" 	   : rows[0].cover	
						};
						//Lấy danh sách bạn bè	
						var queryString = "SELECT id, avatar, username FROM user WHERE id in (SELECT sender FROM listfriend WHERE receiver='"
								+user.id+"' UNION SELECT receiver FROM listfriend WHERE sender='"+user.id+"')";
						connection.query(queryString, function(err, rows, fields){
							var fri = [];	
							if(!err){	
								for(var i=0;i<rows.length;i++){
									var temp = {
										"id" 	   :rows[i].id,
										"userName" :rows[i].username,
										"avatar"   :rows[i].avatar
									};
									fri.push(temp);
								}
							}
							//Lấy danh sách yêu cầu kết bạn
							queryString = "SELECT id, avatar, username FROM user WHERE id in (SELECT sender FROM requestfriend WHERE receiver='"
										+user.id+"' UNION SELECT receiver FROM requestfriend WHERE sender='"+user.id+"')";
							connection.query(queryString, function(err, rows, fields){
								var friReq = [];	
								if(!err){	
									for(var i=0;i<rows.length;i++){
										var temp = {
											"id" 	   :rows[i].id,
											"userName" :rows[i].username,
											"avatar"   :rows[i].avatar
										};
										friReq.push(temp);
									}
								}
								//Dữ liệu gửi về cho người dùng
								var output = {
									"user": user,
									"friends":fri,
									"requestFriends":friReq
								};
							});
				}else{
					//Password sai
					res.send(PASSWORD_ERROR);
				}
			}else{
				//Email không tồn tại
				res.send(EMAIL_NOT_EXIST);
			}
		}
	});
}*/

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
	console.log("User connected");
	
	socket.on("login", function(data){
		console.log("Login event");
		var queryString = "select * from user where email='"+data.email+"'";
		connection.query(queryString, function(err, rows, fields){
			if(err){
				socket.emit("login", { "status": SYSTEM_ERROR});//Lỗi hệ thống
			}else{
				if(rows.length == 0){
					socket.emit("login", { "status": EMAIL_NOT_EXIST});//Email không tồn tại
				}else{
					if(rows[0].password == data.password){	
						map.set(rows[0].id, socket.id);//Ánh xạ id user sang id socket
						console.log(rows[0].id+" "+socket.id+" "+typeof socket.id);
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
						//console.log(options);
						var requestSend = http1.request(options, function(response){
							var buffer = new Buffer(0);
							response.on('data', function(d) {	
								buffer = Buffer.concat([buffer, d]);
							});
							response.on("end", function(){
								var data = buffer.toString();
								parseString(data, function (err, result) {
									if(err){
										sendUserInf(socket, user, null);
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
										sendUserInf(socket, user, tuVi);			
									}
								});
							});
							response.on("error", function(err){
								sendUserInf(socket, user, null);
							});
						});

						requestSend.end();
						requestSend.on("error", function(err){
							sendUserInf(socket, user, null);
						});
						
					}else{			
						socket.emit("login", { "status": PASSWORD_ERROR});//Password sai
					}
				}
			}
		});
	});
	
	socket.on("setting offline", function(data){
		map.remove(data.id);
		socket.broadcast.to(data.id).emit("friend offline", { "id":data.id});
	});
	
	socket.on("setting online", function(data){
		map.set(data.id, socket.id);
		var fri = data.fri;
		var length = fri.length;
		//Gửi thông tin online tới bạn bè đang online						
		for(var i=0;i<length;i++){
			var sID = map.get(fri[i].id);
			if(sID != undefined){
				socket.broadcast.to(sID).emit("friend online", {"id":data.id});
				socket.emit("friend online", {"id":fri[i].id}); 
			}
		}
	});
	
	socket.on("friend online", function(data){
		socket.join(data.id);
	});
	
	socket.on("friend offline", function(data){
		socket.leave(data.id);
	});
	
	socket.on("friend request", function(data){
		var dateTime = new Date();
		dateTime = dateTime.getDate()+"-"+(dateTime.getMonth()+1)+"-"+dateTime.getFullYear()+" "+
			dateTime.getHours()+":"+dateTime.getMinutes()+":"+dateTime.getSeconds();
		var queryString = "select sender from requestfriend where sender='"+data.receiver+"' and receiver='"+data.sender+"'";
		connection.query(queryString, function(err, rows, length){
			if((!err) && (rows.length == 0)){
				queryString = "insert into requestfriend(sender, receiver, created_date) values('"+data.sender+"','"+data.receiver+"','"+dateTime+"')";
				connection.query(queryString, function(err, results){
					if(!err){
						var socketIdReceiver = map.get(data.receiver);
						if(socketIdReceiver != undefined){
							socket.broadcast.to(socketIdReceiver).emit("friend request", { "id":data.sender});
						}
						queryString = "delete from requestfriend where sender='"+data.receiver+"' and receiver='"+data.sender+"'";
						connection.query(queryString);
					}
				});
			}
		});
	});
	
	socket.on("accept friend", function(data){
		var queryString = "select sender from listfriend where sender='"+data.sender+"' and receiver='"+data.receiver+
						"' union all select sender from listfriend where sender='"+data.receiver+"' and receiver='"+data.sender+"'";
		connection.query(queryString, function(err, rows, length){
			if(!err){
				if(rows.length == 0){
					queryString  = "select created_date from requestfriend where sender='"+data.sender+"' and receiver='"+data.receiver+"'";
					connection.query(queryString, function(err, rows, fields){
						if((!err) && (rows.length != 0)){
							queryString = "insert into listfriend(sender, receiver, created_date) values('"+data.sender+"','"+data.receiver+"','"+rows[0].created_date+"')";
							connection.query(queryString, function(err, results){
								if(!err){
									queryString = "delete from requestfriend where sender ='"+data.sender+"' and receiver='"+data.receiver+"'";
									connection.query(queryString, function(err, results){
										if(err){
											queryString = "delete from listfriend where sender='"+data.sender+"' and receiver='"+data.receiver+"'";
											connection.query(queryString);
										}else{
											queryString = "delete from requestfriend where sender ='"+data.receiver+"' and receiver='"+data.sender+"'";
											connection.query(queryString);
										}
									});
								}
							});
						}
					});
				}else{
					queryString = "delete from requestfriend where sender ='"+data.sender+"' and receiver='"+data.receiver+"'";
					connection.query(queryString, function(err, results){
						queryString = "delete from requestfriend where sender ='"+data.receiver+"' and receiver='"+data.sender+"'";
						connection.query(queryString, function(err, results){
							if(rows.length == 2){
								queryString = "delete from listfriend where sender='"+data.receiver+"' and receiver='"+data.sender+"'";
								connection.query(queryString);
							}
						});
					});
				}
			}
		});
	});
	
	socket.on("reject friend", function(data){
		var queryString = "delete from requestfriend where sender='"+data.sender+"' and receiver='"+data.receiver+"'";
		connection.query(queryString, function(err, results){
			queryString = "delete from requestfriend where sender='"+data.receiver+"' and receiver='"+data.sender+"'";
			connection.query(queryString);
		});
	});
	
	socket.on("disconnect", function(){
		console.log("Disconnected");
		var idOffline = map.search(""+socket.id);
		console.log(socket.idU+" "+typeof socket.id);
		map.remove(idOffline);
		socket.broadcast.to(idOffline).emit("friend offline", { "id":idOffline});
		 if(!socket.nickname) return;
  //nicknames.splice(nicknames.indexOf(socket.nickname), 1);
		  delete users[socket.idU];
		  delete nametoid[socket.nickname];
	});
	
	socket.on("update avatar", function(data){
		console.log("Image");
		//console.log(data.id+" "+data.link);
		if( (data.link == "/images/avatar/male.png") ||
			(data.link == "/images/avatar/female.png") ){
			
			updateAvatar(socket, 0, data);
		}else{
			var version = parseInt(data.link.substring(data.link.indexOf("vn")+2, data.link.length));		
			updateAvatar(socket, version, data);
		}
	});
	
	socket.on("update cover", function(data){
		console.log("Cover");
		
		if(data.link == "/images/cover/cover.png" ){
			updateCover(socket, 0, data);
		}else{
			var version = parseInt(data.link.substring(data.link.indexOf("vn")+2, data.link.length));	
			updateCover(socket, version, data);
		}
	});
	
	socket.on("dohoptuvi", function(data){
		var nam = data.nam.split("-");
		var nu = data.nu.split("-");
		console.log(nam+" "+nu);
		nam = getLunarYearFromSolar(parseInt(nam[0]), parseInt(nam[1]), parseInt(nam[2]), 7.0);
		nu = getLunarYearFromSolar(parseInt(nu[0]), parseInt(nu[1]), parseInt(nu[2]), 7.0);
		console.log(nam+" "+nu);
		
		var options = {
				host: 'api.xalovansu.com',
				port: 80,
				path: "/tuVi/luongDuyenVoChong/xem/gioitinh/nam/namsinhnam/"+nam+"/namsinhnu/"+nu+"/key/tviapp@)!@",
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
				var data = buffer.toString();
				parseString(data, function (err, result) {
					if(err){
						socket.emit("dohoptuvi", { "doHopTuVi":[] });
					}else{								
						var item = result.tamlinh.tuvi[0].root[0].data[0].item;
						var doHopTuVi = {
										"thongTinChung": item[0].value[0],
										"cung": item[1].value[0],
										"can": item[2].value[0],
										"chi": item[3].value[0],
										"menh": item[4].value[0],
										"ketLuan": item[5].value[0]
										};
						socket.emit("dohoptuvi", { "doHopTuVi":doHopTuVi });					
					}
				});
			});
			response.on("error", function(err){
				socket.emit("dohoptuvi", { "doHopTuVi":[] });
			});
		});

		requestSend.end();
		requestSend.on("error", function(err){
			socket.emit("dohoptuvi", { "doHopTuVi":[] });
		});
	});
	
	socket.on("tuvihangngay", function(data){
		console.log(data.abc);
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
				var data = buffer.toString();
				parseString(data, function (err, result) {
					if(err){
						socket.emit("tuvihangngay", { "tuViHangNgay":[] });
					}else{								
						var item = result.tamlinh.tuvi[0].root[0].data[0].item;
						var tuViHangNgay = {
										"thongTinChung": item[0].value[0],
										"sucKhoe": item[1].value[0],
										"tinhCam": item[2].value[0],
										"triTue": item[3].value[0],
										"trucGiac": item[4].value[0],
										"yNghia": item[5].value[0]
										};
						socket.emit("tuvihangngay", { "tuViHangNgay":tuViHangNgay });					
					}
				});
			});
			response.on("error", function(err){
				socket.emit("tuvihangngay", { "tuViHangNgay":[] });
			});
		});

		requestSend.end();
		requestSend.on("error", function(err){
			socket.emit("tuvihangngay", { "tuViHangNgay":[] });
		});
	});
	
	//Tìm kiếm user
	
	

	
	socket.on("xemtrangcanhan", function(data){
		var queryString = "select * from user where id='"+data.id+"'";
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
							var data = buffer.toString();
							parseString(data, function (err, result) {
								if(err){
									socket.emit("xemtrangcanhan", { 
																  "status": SUCCESS,
																  "user": user,
																  "tuVi": []
																});
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
									socket.emit("xemtrangcanhan", { 
																  "status": SUCCESS,
																  "user": user,
																  "tuVi": tuVi 
																});			
								}
								});
							});
						response.on("error", function(err){
							socket.emit("xemtrangcanhan", { 
															"status": SUCCESS,
															"user": user,
															"tuVi": [] 
														});	
						});
					});

					requestSend.end();
					requestSend.on("error", function(err){
						socket.emit("xemtrangcanhan", { 
														"status": SUCCESS, 
													    "user": user, 
														"tuVi": [] 
													});	
					});
				}
			}
		});
	});

		socket.on('username', function(data){
	var arr;
	var count = 0;
    var queryString = "SELECT * FROM user where id = '"+data+"'";
	var arrUser = [];
	console.log(data);
	var countQuery = function(rows){
		arrUser.push(rows[0]);
		count++;
		if(count == arr.length){
			socket.emit("data_chat",{dataChat:arr,dataUser:arrUser});
			return;
		}
		
	}
	
	var emitHistory = function(rows){
		var dataUser = [];
		arr = rows;
		for(var i = 0;i < rows.length;i++){
			console.log(rows[i].Time);
			if(rows[i].Sender == socket.idU){
				
				var queryString = "SELECT username,avatar,sex FROM user where id = '"+rows[i].Receiver+"'";
				console.log(queryString);
				queryFun(queryString,null,countQuery,null);
			}
			else{
				var queryString = "SELECT username,avatar,sex FROM user where id = '"+rows[i].Sender+"'";
				console.log(queryString);
				queryFun(queryString,null,countQuery,null);
			}
		}
		
		
		
		
	};
	
	
	var sendHistoryMessage = function(){
		var queryString = format("Select * from delay_message where Sender = '{0}' or Receiver = '{0}'  group by ID_channel",socket.idU);
		queryFun(queryString,null,emitHistory,null);
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
		var queryString = format("Select * from delay_message where Receiver = '{0}' and Sent = 0 ",socket.idU);
		queryFun(queryString,null,sendMessage,null);
		
	};
	
	
	var connectInfo = function(rows){
		
		  socket.nickname = rows[0].username;
		  socket.idU = rows[0].id;
		  console.log("Co client ket noi ten "+rows[0].username+ " id: "+socket.idU);
       
          users[socket.idU]= socket;
          nametoid[socket.nickname]=socket.idU;
          nicknames[socket.idU]=socket.nickname;
          socket.emit("new message",{connect:"ok"});
		  sendHistoryMessage();
		  sendNewMessage();
		  
	};
	queryFun(queryString,null,connectInfo,null);
    
  });
  
  socket.on("goiybanbe", function(data){
	  console.log("goiybanbe");
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
			
			
			if(arr.length>10){
				var arr_str = [];
				for(var i=data.index;(i<arr.length&&i<data.index+10);i++){
					arr_str.push(arr[i]);
					console.log(arr_str.length);
				}
			
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
			console.log(dem+" "+ length);
			if(dem == length){
				sort(arr);
			}
		};
		
		var queryString = format("Select * from user where username like '%{0}%' and id not in(Select receiver from listfriend where sender = '{1}') and id not in (Select sender from listfriend where receiver = '{1}') ",data.key,socket.idU);
		console.log(queryString);
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
										console.log(item[5].value[0]);
										var diem = 0;
										if((item[5].value[0]).charAt(12)!='/')
											diem = 10;
										else
											diem = parseInt((item[5].value[0]).charAt(11));
										console.log(diem);
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
  
  socket.on("ketban", function(data){
		var dateTime = new Date();
		dateTime = dateTime.getDate()+"-"+(dateTime.getMonth()+1)+"-"+dateTime.getFullYear()+" "+
			dateTime.getHours()+":"+dateTime.getMinutes()+":"+dateTime.getSeconds();
		var queryString = "insert into requestfriend(sender, receiver, created_date) values('"+socket.idU+"','"+data+"','"+dateTime+"')";
		connection.query(queryString, function(err, results){
			if(!err){
				socket.broadcast.to(data).emit("friend request", {"id":socket.idU});
			}
		});
	});
  
  
  socket.on("dataChatOneOne",function(data){
	  var queryString = format("Select * from delay_message where ID_channel = '{0}' order by Number desc limit {1},10",data.ID_channel,10*data.Index);
	  var sendHistoryMessage = function(rows){
			socket.emit("dataChatOneOne",{dataChat:rows,dataIndex:data.dataIndex});
	  };
	  queryFun(queryString,null,sendHistoryMessage,null);
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
      var queryString = format("INSERT INTO chatGroup(IDGroup,IDUser) VALUES('{0}','{1}')",idChanel,nametoid[socket.nickname]);
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
			  var queryInsert = format("INSERT INTO delay_message(Number,ID_channel,Sender,Receiver,Content,Is_text,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}','{5}','{6}','{7}')",Number,data.ID_channel,nametoid[socket.nickname],idU,data.message_content,1,datetime,0);
			  queryFun(queryInsert,null,null,null);
		  };
		  console.log("loi oi la loi");
		  queryFun(queryString,emptyMessage,noEmptyMessage,insertMessage);
          if(users[idU]!=null){    //Nếu người nhận đang online thì gửi tin nhắn đến người nhận và lưu lại tin nhắn vào CSDL
			users[idU].emit('new_message', {Number:Number,message_content: data.message_content, sender:nametoid[socket.nickname], ID_channel: data.ID_channel,time:time,is_text:data.is_text});
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
				var queryInsert = format("INSERT INTO delay_message(Number,ID_channel,Sender,Receiver,Content,Is_text,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}','{5}','{6}','{7}')",Number,data.ID_channel,nametoid[socket.nickname],idU,file_name,0,datetime,0);
				queryFun(queryInsert,null,null,null);
			};
			
			queryFun(queryString,emptyMessage,noEmptyMessage,insertMessage);
			
			if(users[idU]!=null){
				users[idU].emit('new_message', {Number:Number,message_content: data.message_content, sender:socket.nickname, ID_channel: data.ID_channel,time:time,is_text:data.is_text});
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
                        var queryInsert = format("INSERT INTO  message(Sender,IDChanel,Message,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}')",nametoid[socket.nickname],data.chanel,data.msg,time,1);
                        connection.query(queryInsert);
                      }
                      else{
                        var queryInsert = format("INSERT INTO  message(Sender,IDChanel,Message,Time,Sent) VALUES ('{0}','{1}','{2}','{3}','{4}')",nametoid[socket.nickname],data.chanel,data.msg,time,0);
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
      var queryInsert = format("INSERT INTO  message(Sender,IDChanel,Message,Time) VALUES ('{0}','{1}','{2}','{3}')",nametoid[socket.nickname],data.chanel,data.msg,null);
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
			if(callback1!=null)
				callback1();
			return;
      }
      else{
		if(callback2!=null){
			callback2(rows);
		}	
      }
	  if(callback3!=null){
		 
		  callback3(rows);
	  }
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
	
	
function sendUserInf(socket, user, tuVi){
	if(user.active == 0){			
		socket.emit("login", {	
							  "status":SUCCESS,
							  "user": user,
							  "friends":[],
							  "requestFriends":[],
							  "tuVi": tuVi==null?[]:tuVi
							});
	}else{
	//Lấy danh sách bạn bè	
		var queryString = "SELECT id, avatar, username, status FROM user WHERE id in (SELECT sender FROM listfriend WHERE receiver='"
							+user.id+"' UNION ALL SELECT receiver FROM listfriend WHERE sender='"+user.id+"')";
		connection.query(queryString, function(err, rows, fields){
			var fri = [];	
			if(!err){	
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
			}
			//Lấy danh sách yêu cầu kết bạn
			queryString = "SELECT id, avatar, username, status FROM user WHERE id in (SELECT sender FROM requestfriend WHERE receiver='"
							+user.id+"' UNION ALL SELECT receiver FROM requestfriend WHERE sender='"+user.id+"')";
			connection.query(queryString, function(err, rows, fields){
				var friReq = [];	
				if(!err){	
					for(var i=0;i<rows.length;i++){
						var temp = 
						{
							"id" 	   :rows[i].id,
							"userName" :rows[i].username,
							"avatar"   :rows[i].avatar,
							"status"   :rows[i].status
						};
						friReq.push(temp);
					}
				}
				//Dữ liệu gửi về cho người dùng						
				socket.emit("login", {	
										"status":SUCCESS,
										"user": user,
										"friends":fri,
										"requestFriends":friReq,
										"tuVi": tuVi==null?[]:tuVi
									});
				//Gửi thông tin online tới bạn bè đang online						
				for(var i=0;i<fri.length;i++){
					console.log("Dang send thong tin online");
					var sID = map.get(fri[i].id);
					if(sID != undefined){
						console.log(fri[i].id);
						socket.broadcast.to(sID).emit("friend online", {"id":user.id});
						socket.emit("friend online", {"id":fri[i].id}); 
					}
				}
			});
		});
	}
}

function updateAvatar(socket, version, data){
	version++;
	
	var writerStream = fs.createWriteStream("public/images/avatar/"+data.id+"vn"+version+".jpg");
	writerStream.write(data.data);
	writerStream.end();
			
	writerStream.on("finish", function(){
		var link = "/images/avatar/"+data.id+"vn"+version+".jpg";
		var queryString = "update user set avatar='"+link+"' where id='"+data.id+"'";
		connection.query(queryString, function(err, results){
			if(err){
				socket.emit("update avatar", {"status":FAILD});
			}else{
				socket.emit("update avatar", {"status":SUCCESS,
											  "link":link});
				if(version != 1){
					console.log("Xoa anh dai dien cu~ di");
				}
			}
		});
	});
			
	writerStream.on("error", function(err){
		socket.emit("update avatar", {"status":FAILD});
	});
}

function updateCover(socket, version, data){
	version++;
	
	var writerStream = fs.createWriteStream("public/images/cover/"+data.id+"vn"+version+".jpg");
	writerStream.write(data.data);
	writerStream.end();
			
	writerStream.on("finish", function(){
		var link = "/images/cover/"+data.id+"vn"+version+".jpg";
		var queryString = "update user set cover='"+link+"' where id='"+data.id+"'";
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