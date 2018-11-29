$(document).ready(function() {
	switchView("loading");
});

function load() {
	if ( home ) {
		camera_setup(false);
		
		getConnectionStatus(function(data) {
			printer.port(data.current.port);
		 });

		 connect();
		 
		 //hack to fix camera size. not sure why this works :D
		 printer.zoom(false);
		 printer.zoom(true);
		 printer.zoom(false);
		 
	} else {
		if (v1) {
			// allow scrolling
			document.ontouchmove = function(event){
				return true;
			};
		}
		var vp = document.getElementById('vp');
		vp.content = "width=device-width, maximum-scale=10,user-scalable=yes";
		
		start_camera(true);
	}
}

$("#reconnect").click(function(){
	connect();
});

function start_camera(alone){
	d = new Date();
	var p = "?";
	if (WEBCAM_URL.indexOf("?") !== -1)  {
		p = "&";
	}
	if (alone) {
		switchView("camera");
		$("#webcam_alone").error(function(){$(this).attr("src", MOBILE_URL+"/static/img/no_camera.png");}).attr("src", WEBCAM_URL+p+d.getTime());
	} else {
		switchPanel("camera");
		if ( clearCameraTimeout() ) {
			$("#webcam").error(function(){$(this).attr("src", MOBILE_URL+"/static/img/no_camera.png");}).attr("src", WEBCAM_URL+p+d.getTime());	
		} 
	}
}

function stop_camera(imediate){
	if (imediate) {
		clearCameraTimeout();
		window.stop();		
	} else {
		setCameraTimeout(); 
	}
}

var camera_timeout;

function clearCameraTimeout(){
	if (camera_timeout == undefined) return true;
	clearTimeout(camera_timeout);
	camera_timeout = undefined;
	//console.log("cleared");
	return false;
}

function setCameraTimeout(){
	//console.log("set");
	camera_timeout = setTimeout(function(){
		//console.log("triggered");
		camera_timeout = undefined; 
		window.stop();
	}, 10000); //stop after X seconds
} 

//called by ios app 
function initialize(apikey){
	$.ajaxSetup({
		headers: { 'X-Api-Key': apikey },
		timeout: 10000,
		contentType: "application/json"
	});
	applyBindings();
	
	updateOrientation();
	
	checkHome(function(data){
		home = data.home;
		load();
	});
}

function onForeground(){
	checkHome(function(data){
		if ( home == data.home) { //didn't change location
			clearCameraTimeout()
			currentPanel = undefined; 
			if ( home ) {
				connect();
			} else {
				start_camera(true); //camera in full screen mode
			}
		} else { //we moved in or out the house, reload
			window.location.reload();
		}
	});
}

//called by ios app 
function onBackground(){
	if (home) {
		camera_setup(false);
		bootbox.hideAll();
		disconnect();
	} else {
		stop_camera(true); //stop camera immediately
	}
}


