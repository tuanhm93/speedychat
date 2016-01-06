//CONSTANTS
var SYSTEM_ERROR = "1";
var PASSWORD_ERROR = "2";
var EMAIL_NOT_EXIST = "3";
var EMAIL_EXIST = "-3";
var SUCCESS = "4";
var FAILD = "-4";
var CODE_ERROR = "5";
var CODE_NOT_EXIST = "6";

//HTTPS
/*
var fs = require('fs');
var key = fs.readFileSync('./ssl/private.key');
var cert = fs.readFileSync('./ssl/certificate.crt');
var https_options = {
    key: key,
    cert: cert
};
https = require("https").createServer(https_options, app).listen(3000);
*/
//Cấu hình server
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

//Cấu hình database
var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '123456',
  database : 'test'
});
connection.connect();

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
					
						console.log(rows[0].id + " " + socket.id + " " + typeof socket.id);
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
		/*var dateTime = new Date();
		dateTime = dateTime.getDate()+"-"+(dateTime.getMonth()+1)+"-"+dateTime.getFullYear()+" "+
			dateTime.getHours()+":"+dateTime.getMinutes()+":"+dateTime.getSeconds();
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
		});*/
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
			}else{
				//Thông báo tới người dùng
			}
		});
	});
	
	socket.on("reject friend", function(data){
		var queryString = "delete from requestfriend where sender='"+data.sender+"' and receiver='"+data.receiver+"'";
		connection.query(queryString, function(err, results){
			queryString = "delete from requestfriend where sender='"+data.receiver+"' and receiver='"+data.sender+"'";
			connection.query(queryString, function(err, results){
				queryString "delete from listfriend where sender='"+data.sender+"' and receiver='"+data.receiver+"'";
				connection.query(queryString, function(err, results){
					queryString "delete from listfriend where sender='"+data.receiver+"' and receiver='"+data.sender+"'";
					connection.query(queryString);
				});
			});
		});
	});
	
	socket.on("huyketban", function(data){
	});
	
	socket.on("disconnect", function(){
		console.log("Disconnected");
		var idOffline = map.search(socket.id);
		map.remove(idOffline);
		socket.broadcast.to(idOffline).emit("friend offline", { "id":idOffline});
	});
	
	socket.on("update avatar", function(data){
		console.log("Image");
		
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
				var text = buffer.toString();
				parseString(text, function (err, result) {
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
										"yNghia": item[5].value[0],
										"ngayGio": tinhNgay(dateTime.getDate(), dateTime.getMonth()+1, dateTime.getFullYear())
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
	
	socket.on("xemtrangcanhan", function(data){
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
});

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

function userProfile(socket, user, tuVi, data){
	console.log(data);
	var queryString = "select sender from requestfriend where sender='"+data.id1+"' and receiver='"+data.id2+
						"' union all select sender from requestfriend where sender='"+data.id2+"' and receiver='"+data.id1+"'";
						
	connection.query(queryString, function(err, rows, fields){
		if(err){
			socket.emit("xemtrangcanhan", {
											"status": SUCCESS,
											"user": user,
											"tuVi": (tuVi == null)?[]:tuVi,
											"isFriend": -1,
											"isRequest": -1
										});
			
			
		
		
			/*queryString = "select sender from listfriend where sender='"+data.id1+"' and receiver='"+data.id2+
						"' union all select sender from listfriend where sender='"+data.id2+"' and receiver='"+data.id1+"'";
			connection.query(queryString, function(err, rows, fields){
				if(err){
					socket.emit("xemtrangcanhan", {
													"status": SUCCESS,
													"user": user,
													"tuVi": (tuVi == null)?[]:tuVi,
													"isFriend": -1,
													"isRequest": -1
													});
				}else{
					if(rows.length == 0){
						socket.emit("xemtrangcanhan", {
														"status": SUCCESS,
														"user": user,
														"tuVi": (tuVi == null)?[]:tuVi,
														"isFriend": -1,
														"isRequest": -1
														});
					}else{
						socket.emit("xemtrangcanhan", {
														"status": SUCCESS,
														"user": user,
														"tuVi": (tuVi == null)?[]:tuVi,
														"isFriend": 1,
														"isRequest": 0
														});
					}
				}
			});*/
		}else{
			if(rows.length == 0){
				
				queryString = "select sender from listfriend where sender='"+data.id1+"' and receiver='"+data.id2+
						"' union all select sender from listfriend where sender='"+data.id2+"' and receiver='"+data.id1+"'";
				
				connection.query(queryString, function(err, rows, fields){
					if(err){
						socket.emit("xemtrangcanhan", {
														"status": SUCCESS,
														"user": user,
														"tuVi": (tuVi == null)?[]:tuVi,
														"isFriend": -1,
														"isRequest": -1
														});
					}else{
						if(rows.length == 0){
							
							socket.emit("xemtrangcanhan", {
															"status": SUCCESS,
															"user": user,
															"tuVi": (tuVi == null)?[]:tuVi,
															"isFriend": 0,
															"isRequest": 0
															});
						}else{
							socket.emit("xemtrangcanhan", {
															"status": SUCCESS,
															"user": user,
															"tuVi": (tuVi == null)?[]:tuVi,
															"isFriend": 1,
															"isRequest": 0
															});
						}
					}
				});
			}else{
				//Trường hợp có request friend
				queryString = "select sender from requestfriend where sender='"+data.id1+"' and receiver='"+data.id2+"'";
				connection.query(queryString, function(err, rows, length){
					if(err){
						socket.emit("xemtrangcanhan", {
														"status": SUCCESS,
														"user": user,
														"tuVi": (tuVi == null)?[]:tuVi,
														"isFriend": -1,
														"isRequest": -1
														});
					}else{
						if(rows.length==0){
							socket.emit("xemtrangcanhan", {
															"status": SUCCESS,
															"user": user,
															"tuVi": (tuVi == null)?[]:tuVi,
															"isFriend": 0,
															"isRequest": 2
															});
						}else{
							socket.emit("xemtrangcanhan", {
															"status": SUCCESS,
															"user": user,
															"tuVi": (tuVi == null)?[]:tuVi,
															"isFriend": 0,
															"isRequest": 1
															});
						}
					}
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