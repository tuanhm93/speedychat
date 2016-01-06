

function cungHoangDao(str){
	var cungHoangDao = "";
	
	if(("01-20"<=str)&&(str<="02-18")){
		cungHoangDao = "Bạch Dương";
	}else if(("02-19"<=str)&&(str<="03-20")){
		cungHoangDao = "Bạch Dương";
	}else if(("03-21"<=str)&&(str<="04-19")){
		cungHoangDao = "Bạch Dương";
	}else if(("04-20"<=str)&&(str<="05-20")){
		cungHoangDao = "Kim Ngưu";
	}if(("05-21"<=str)&&(str<="06-21")){
		cungHoangDao = "Song Tử";
	}if(("06-22"<=str)&&(str<="07-22")){
		cungHoangDao = "Song Tử";
	}if(("07-23"<=str)&&(str<="08-22")){
		cungHoangDao = "Song Tử";
	}if(("08-23"<=str)&&(str<="09-22")){
		cungHoangDao = "Song Tử";
	}if(("09-23"<=str)&&(str<="10-23")){
		cungHoangDao = "Song Tử";
	}if(("10-24"<=str)&&(str<="11-21")){
		cungHoangDao = "Song Tử";
	}if(("11-22"<=str)&&(str<="12-21")){
		cungHoangDao = "Song Tử";
	}else{
		cungHoangDao = "Ma Kết";
	}
	
	return cungHoangDao;
}

console.log("12345".substring(1,1));