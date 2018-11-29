var re851 = /echo:Z Offset : ([-.\d]*)/;

var app_hash;

var latest_log = [];
var _logs  = document.getElementById("logs");

function onReceivedData(data){
	if (typeof(data) === "string") {
		data = JSON.parse(data);
	}

	if(typeof(data.connected) !== "undefined"){
		onConnectedData(data.connected);
	} 
  
	if(typeof(data.current) !== "undefined"){
		onCurrentData(data.current);
	} 
	
	if (typeof(data.history) !== "undefined"){
		onHistoryData(data.history);
	}
	
	if(typeof(data.event) !== "undefined"){
		onEventData(data.event.type, data.event.payload);
	}
	
	if(typeof(data.plugin) !== "undefined"){
		onPluginData(data.plugin.plugin, data.plugin.data);
	}	
}

function onConnectedData(data){	
	if ( app_hash != undefined ) {
		if ( app_hash != data.config_hash +"-"+ data.plugin_hash) {
			window.location.reload();
		}
	} else {
		app_hash = data.config_hash +"-"+ data.plugin_hash;
	}
}

function onHistoryData(history){
	updateFlasgs(history.state);	
	if (TERMINAL) { 
		latest_log = [];
		onLogs(history.logs);
	}
}

function terminal_filter(o) {
	return o == "Send: M105" || o.startsWith("Recv: ok T") || o.startsWith("Recv: echo:busy") || o == "Recv: wait";
}

function onLogs(logs){
	latest_log  = _.chain(latest_log)
						.concat(logs)
						.map(function(o) { if ( terminal_filter(o) ) { return "[...]"; } else { return o; } })
					  .reject(function (o, i, v) { if (o === "[...]") {return i > 0 && v[i - 1] === o;} })
						.takeRight(20)
						.value();

	//only update if visible. improved performance ?
	if (show_terminal) {
		_logs.value = latest_log.join("\n");
	}
}

function onCurrentData(current){
	// uppdate printer status	
	updateFlasgs(current.state);
	if (TERMINAL) onLogs(current.logs);
  
  if ( printer.error() || printer.closedOrError() ) {
	  printer.fileToPrint(null);
  } else {
    printer.fileToPrint(current.job.file.path);
  }
  
	onMessageData(current.messages);
	
	if(typeof(current.temps[0]) !== "undefined"){
		printer.bed_actual(current.temps[0].bed.actual);
		printer.bed_target(current.temps[0].bed.target);
		printer.extruder0_actual(current.temps[0].tool0.actual);
		printer.extruder0_target(current.temps[0].tool0.target);
		if ( current.temps[0].tool1 == undefined) {
			printer.extruder1_actual(0);
			printer.extruder1_target(0);
		} else {
			printer.extruder1_actual(current.temps[0].tool1.actual);
			printer.extruder1_target(current.temps[0].tool1.target);
		}
	}
		
	if(printer.printing() || printer.paused()){
		//console.log(formatSeconds(current.progress.printTimeLeft));
		printer.progress(parseFloat(current.progress.completion));
		printer.time_elapsed(parseInt(current.progress.printTime));
		
	  if(current.progress.printTimeLeft != null){
			printer.time_left(parseInt(current.progress.printTimeLeft));
		} 
    printer.printTimeLeftOrigin(current.progress.printTimeLeftOrigin);
	}
}

function updateFlasgs(state){

	//whether the printer is currently connected and responding
	printer.operational(state.flags.operational);
	//whether the printer is currently printing>
	printer.printing(state.flags.printing);
	//whether the printer is currently disconnected and/or in an error state	
	printer.closedOrError(state.flags.closedOrError);
	//whether the printer is currently in an error state
	printer.error(state.flags.error);
	//whether the printer is currently paused
	printer.paused(state.flags.paused);
	//whether the printer is operational and ready for jobs
	printer.ready(state.flags.ready);
  printer.status(state.text);
}

function onMessageData(messages){
	//console.log(currentPanel);
	if (currentPanel == "offset") {
		var m;
		if ((m = re851.exec(messages)) !== null) {
			offset.offset(m[1]);
		} 
	}
}

function onEventData(type, payload) {
	//console.log("Event '"+type + "': ", payload);
	switch (type) {
		case "Connected":
			printer.port(payload.port);
			bootbox.hideAll();
			break;
		case "PositionUpdate":
			if ( offset.prepared() ) {
				offset.current_z(   (parseFloat(payload.z) + parseFloat(settings.profile.max_m851)).toFixed(2) );
			} else {
				offset.current_z(payload.z);	
			}
			break;
		case "UpdatedFiles":
			if (payload.type == "printables" ) {
				files.allfiles = null;
				files.reload();
			}
			break;
	}
}


function onPluginData(name, data){
	//console.log("Plugin '"+ name + "': ", data);
	switch (name) {	
		 case "switch":
				printer.power(JSON.parse(data.power)); //convert to boolean
				buttons.lights(JSON.parse(data.lights));
				buttons.mute(JSON.parse(data.mute));
				buttons.unload(JSON.parse(data.unload));
				buttons.poweroff(JSON.parse(data.poweroff));
				break;
		case "nautilus":
			if ( typeof(data.message) !== "undefined") {
				message(data.message);
			} 
			if ( typeof(data.action) !== "undefined") {
				switch (data.action) {
					case "settings":
						getSettings();
						break;
				}
			} 
			if ( typeof(data.zchange) !== "undefined") {
				if (data.zchange == "") {
					printer.zchange("");
				} else {
					printer.zchange(data.zchange);
				}
			} 
			if ( typeof(data.port) !== "undefined") { 
				printer.port(data.port);
			}
			if ( typeof(data.tool) !== "undefined") { 
				printer.active_tool(data.tool);
				if (data.tool == "0"){
					$("#tool_select").bootstrapSwitch('state', true, true);
				} else {
					$("#tool_select").bootstrapSwitch('state', false, true);
				}
			}
			
			if ( typeof(data.extruders) !== "undefined") { 
				if (data.extruders == 1){
					printer.dual_extruder(false);
				} else {
					printer.dual_extruder(true);
				}
			}
			
			if ( typeof(data.nozzles) !== "undefined") { 
				if (data.nozzles == 1){
					printer.dual_nozzle(false);
				} else {
					printer.dual_nozzle(true);
				}
			}

			if ( typeof(data.nozzle_size) !== "undefined") { 
					printer.nozzle_size(data.nozzle_size);
			}

			if ( typeof(data.nozzle_name) !== "undefined") { 
					printer.nozzle_name(data.nozzle_name);
			}	

			break;
	}
}
