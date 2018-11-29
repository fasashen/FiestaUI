
function FilesModel(){
	var self = this;	

	self.allfiles = null;
	
	self.show_files = ko.observableArray();

	self.stack = [];	
	
	self.previous = ko.observable(null);
	self.current = ko.observable(null);
	
	self.sorting_criteria = $.cookie('sorting_criteria'); 
	if (self.sorting_criteria == undefined) self.sorting_criteria = "date"
	
	self.sorting_order = $.cookie('sorting_order'); 
	if (self.sorting_order == undefined) {
			self.sorting_order = "false"
	}
	self.sorting_order  = JSON.parse(self.sorting_order);
	
	self.sorting_criteria = ko.observable(self.sorting_criteria);
	self.sorting_order = ko.observable(self.sorting_order);
	
	self.open = function(){
		$(".view").hide();
		$("#files_view").show();	
		if (self.allfiles == null) {
			self.reload()
	  }
	}
	
	self.close = function(){
		$(".view").hide();
		$("#main_view").show();
	}
	
	
	self.reload = function(){
		$("#folder_loading").show();
		getGcodeFiles(function(result){
			self.stack = [];	
			self.current('root');
			self.previous(null);
			
			self.allfiles = result.files;
			self.refresh(self.allfiles);
			
			$("#folder_loading").hide();
		});		
	}
	
	self.refresh = function(currentfiles){
			self.currentfiles = currentfiles;
			if ( self.sorting_order() ) {
				self.currentfiles = _.sortBy(currentfiles, self.sorting_criteria());
			} else {
				self.currentfiles = _.sortBy(currentfiles, self.sorting_criteria()).reverse();
			}
		
			html = [];
			_.each(self.currentfiles, function(file) {
				if ( file.type == "folder" && file.children.length > 0 ) {
					f = {}
					f.template = "files_template_folder";
					f.name = file.name;
					f.path = file.path;
					if ( file.children.length == 1) {
						f.file_count = "1 file";	
					} else {
						f.file_count = file.children.length + " files";
					}
					
					html.push(f);
				}
			 });
			_.each(self.currentfiles, function(file) {
				if ( file.type == "machinecode") {
					f = {}
					f.template = "files_template_machinecode";
					f.name = file.name;
					f.uploaded = " uploaded " + formatTimeAgo(file.date);
					f.size = formatSize(file.size);
					f.path = file.path;
					f.failures = 0;
					f.last_success = false;
				
					if ( typeof file.prints != "undefined" ) { 
						f.failures = file.prints.failure;
						f.last_success = file.prints.last.success;
					}
					if ( typeof file.gcodeAnalysis != "undefined" ) { 
						f.estimatedPrintTime = ", estimated printing time: "+formatFuzzyPrintTime(file.gcodeAnalysis.estimatedPrintTime);
					} else {
					    f.estimatedPrintTime = ", printing time unknown";
					}
					html.push(f);
				}
			 });
             console.log(html);
			 self.show_files(html);
	}
	
	self.go_back = function(){
			self.current(self.stack.pop());
			self.previous(_.last(self.stack));
			if (self.current() == "root") {
				self.refresh( self.allfiles );
			} else {
				self.refresh( self.find_folder_by_path(self.current()) );
			}
	}
		
	self.show_folder = function(name){
		self.previous(self.current());
		self.stack.push(self.previous());
		self.current(name);
		
		self.refresh( self.find_folder_by_path(self.current()) );
	}
	
	self.load_file = function(path){
		sendLoadFile(path);
		self.close();
	}
	
	self.find_folder_by_path = function(path){
			var recursiveSearch = function(location, elements) {
							if (location.length == 0) {
								return elements;
							}
							var name = location.shift();
							t = _.find(elements, function(o){return o.type == "folder" && o.name == name;});
							if (t != undefined ) {
								return recursiveSearch(location, t.children);
							} 
			}
			return recursiveSearch(path.split("/"), self.allfiles);
	}

	self.sort_by = function(criteria){
		if ( criteria === self.sorting_criteria() ) {
			self.sorting_order( ! self.sorting_order() ) ;
			$.cookie('sorting_order', self.sorting_order() );
		} else {
			self.sorting_criteria(criteria);
			$.cookie('sorting_criteria', criteria);
		}
		self.refresh(self.currentfiles);
	}

}


function ActionModel(){

	var self = this;
		
	self.extruder0_slider_value = ko.observable(0);
	self.extruder1_slider_value = ko.observable(0);
	self.bed_slider_value = ko.observable(0);

	self.show_flow = ko.observable(false);
	
	self.show_flow.subscribe(function(value){
		if ( value ) {	
			if ( printer.dual_extruder() ) {
				$(".slider-row").css({"height": "15vh"});
			} else {
				$(".slider-row").css({"height": "20vh"});
			}
		} else {
			if ( printer.dual_nozzle() ) {
				$(".slider-row").css({"height": "15vh"});
			} else {
				$(".slider-row").css({"height": "20vh"});
			}
		}
	});
	
		
	self.extruder0_flow_value = ko.observable(100);
	self.extruder1_flow_value = ko.observable(100);
	self.feed_rate_value = ko.observable(100);
	
	self.config_extruder0_temp = ko.computed(function(){
		if (self.extruder0_slider_value() == 0) {
			$("#hotend0_slider").slider('setValue', 0);
		}
		return settings.printer.nozzle_temperatures[self.extruder0_slider_value() - 1];
	});

	self.config_extruder1_temp = ko.computed(function(){
		if (self.extruder1_slider_value() == 0) {
			$("#hotend1_slider").slider('setValue', 0);
		}
		return settings.printer.nozzle_temperatures[self.extruder1_slider_value() - 1];
	});

	self.config_bed_temp = ko.computed(function(){
		if (self.bed_slider_value() == 0) {
			$("#bed_slider").slider('setValue', 0);
		}
		return settings.printer.bed_temperatures[self.bed_slider_value() - 1];
	});

	self.extruder0_flow_value.subscribe(function(value) {
		$("#hotend0_flow").slider('setValue', value);
	});
	
	self.extruder1_flow_value.subscribe(function(value) {
		$("#hotend1_flow").slider('setValue', value);
	});
	
	self.feed_rate_value.subscribe(function(value) {
		$("#feed_slider").slider('setValue', value);
	});

	self.fan_slider_value = ko.observable(0);

	self.enable = ko.computed(function(){
		if (printer.acceptsCommands() && printer.power()){
			return true;
		} else {
			return false;
		}
	});
	
	self.canStartPrinting = ko.computed(function(){
		if (printer.operational() && printer.isFileLoaded() && ! (printer.printing() || printer.paused() )){
			return true;
		} else {
			return false;
		}
	});

	self.bed_temp = ko.computed(function(){
		if (printer.bed_target() == 0) {
			return sprintf(" %0.1f%s", printer.bed_actual(), settings.printer.temperature_scale);
		} else {
			if (printer.bed_actual() > printer.bed_target()) {
				return sprintf(" %0.1f%s &seArr; %s%s", printer.bed_actual(), settings.printer.temperature_scale, printer.bed_target(), settings.printer.temperature_scale);
			} else {
				return sprintf(" %0.1f%s &neArr; %s%s", printer.bed_actual(), settings.printer.temperature_scale,  printer.bed_target(), settings.printer.temperature_scale);
			}
		}		
	});
	
	self.extruder_temp = ko.computed(function(){
		var temp = " ";
		if (printer.inProgress()) {
				if (printer.extruder0_target() != 0) {
					if (printer.extruder0_actual() > printer.extruder0_target()) {
						temp += sprintf("%0.1f%s &seArr; %s%s", printer.extruder0_actual(), settings.printer.temperature_scale,  printer.extruder0_target(), settings.printer.temperature_scale);
					}	else {
						temp += sprintf("%0.1f%s &neArr; %s%s", printer.extruder0_actual(), settings.printer.temperature_scale,  printer.extruder0_target(), settings.printer.temperature_scale);
					}
				}
				if (printer.extruder1_target() != 0) {
					if (temp != " ") temp += " | ";
					if (printer.extruder1_actual() > printer.extruder1_target()) {
						temp += sprintf("%0.1f%s &seArr; %s%s", printer.extruder1_actual(), settings.printer.temperature_scale,  printer.extruder1_target(), settings.printer.temperature_scale);
					}	else {
						temp += sprintf("%0.1f%s &neArr; %s%s", printer.extruder1_actual(), settings.printer.temperature_scale,  printer.extruder1_target(), settings.printer.temperature_scale);
					}
				}
				if (temp == " ") {
					temp += sprintf("%0.1f%s", printer.extruder0_actual(), settings.printer.temperature_scale);
					if ( printer.dual_nozzle() ) {
						temp += sprintf(" | %0.1f%s", printer.extruder1_actual(), settings.printer.temperature_scale);	
					}
				}
		} else {
			if (printer.extruder0_target() == 0) {
				temp += sprintf("%0.1f%s", printer.extruder0_actual(), settings.printer.temperature_scale);
			} else {
				if (printer.extruder0_actual() > printer.extruder0_target()) {
					temp += sprintf("%0.1f%s &seArr; %s%s", printer.extruder0_actual(), settings.printer.temperature_scale,  printer.extruder0_target(), settings.printer.temperature_scale);
				}	else {
					temp += sprintf("%0.1f%s &neArr; %s%s", printer.extruder0_actual(), settings.printer.temperature_scale,  printer.extruder0_target(), settings.printer.temperature_scale);
				}
			}
			if ( printer.dual_nozzle() ) {
				temp += " | ";
				if (printer.extruder1_target() == 0) {
					temp += sprintf("%0.1f%s", printer.extruder1_actual(), settings.printer.temperature_scale);
				} else {
					if (printer.extruder1_actual() > printer.extruder1_target()) {
						temp += sprintf("%0.1f%s &seArr; %s%s", printer.extruder1_actual(), settings.printer.temperature_scale,  printer.extruder1_target(), settings.printer.temperature_scale);
					}	else {
						temp += sprintf("%0.1f%s &neArr; %s%s", printer.extruder1_actual(), settings.printer.temperature_scale,  printer.extruder1_target(), settings.printer.temperature_scale);
					}
				}
			}
		}
		return temp;
	});
	
	self.temp_visible = ko.computed(function() {
		return printer.extruder0_actual() > 0 || printer.extruder1_actual() > 0 ;
	});
	
	self.startPrint = function(){
		bootbox.confirm({ closeButton: false, message: "Start printing ?", callback: function(result) {
		  if (result) {
			sendJobCommand("start");
		  }
		}});
	}

	self.deselectFile = function(){
		unselect();
	}
	
	self.loadLatestFile = function(){
		getGcodeFiles(function(result){
			if(result.files.length > 0) {
				sendLoadFile(_.last(_.sortBy(_.filter(result.files, function(f){return f.type=="machinecode";}), "date")).name);
			}
		});
	}

	self.loadLastPrintedFile = function(){
		getGcodeFiles(function(result){
			if(result.files.length > 0) {
				sendLoadFile(_.last(_.sortBy(_.filter(result.files, function(f){return (f.type=="machinecode" && typeof f.prints == 'object');}), "prints.last.date")).name);
			}
		});
	}

	self.loadFiles = function(){
			files.open();
	}

	
	self.showInfo = function(){
		var data = printer.fileInfo();
		var message = "Material : " + data.material +"<br/>Hotend : " + data.hotend +"<br/>Nozzle : " + data.nozzle +" mm<br/>Layer height : " +data.layer+" mm<br/>Extrusion width : " +data.width+" mm<br/>Speed : " + data.speed +" mm/min"
		info( message );
	}

	self.pausePrint = function(){
		sendJobCommand("pause");
	}

	self.cancelPrint = function(){
		bootbox.confirm({ closeButton: false, message: "Cancel printing ?", callback: function(result) {
		  if (result) {
			sendJobCommand("cancel");
		  }
		}});
	}
	
	self.sendRelativeG1 = function(data){
		sendCommand(["G91", "G1 " + data, "G90"],  true);
	}

	self.sendAbsoluteG1 = function(data){
		sendCommand("G1 "+data);
	}
	
	self.getLeftTool = function(){
			if (settings.printer.mirrored_tool == "yes") {
				return "1";
			} else {
				return "0";
			}
	}

	self.getRightTool = function(){
			if (settings.printer.mirrored_tool == "yes") {
				return "0";
			} else {
				return "1";
			}
	}
	
	self.sendExtruder0Temperature = function(){
		if (self.extruder0_slider_value() == 0) {
			sendCommand( settings.printer.nozzle_heater_off.replace("%tool", self.getLeftTool() ).split(",") );
		} else {
			sendCommand( settings.printer.nozzle_heater_on.replace("%tool", self.getLeftTool() ).replace("%temp", self.config_extruder0_temp()).split(",") );
			self.extruder0_slider_value(0);
			switchPanel("status");
		}
	}

	self.sendExtruder1Temperature = function(){
		if (self.extruder1_slider_value() == 0) {
			sendCommand( settings.printer.nozzle_heater_off.replace("%tool", self.getRightTool() ).split(",") );
		} else {
			sendCommand( settings.printer.nozzle_heater_on.replace("%tool", self.getRightTool() ).replace("%temp", self.config_extruder1_temp()).split(",") );
			self.extruder1_slider_value(0);
			switchPanel("status");
		}
	}

	self.sendBedTemperature = function(){
		if (self.bed_slider_value() == 0) {
			sendCommand( settings.printer.bed_heater_off.split(",") );
		} else {
			sendCommand( settings.printer.bed_heater_on.replace("%temp", self.config_bed_temp()).split(",") );
			self.bed_slider_value(0);
			switchPanel("status");
		}
	}
	
	self.setFanSpeed = function(){
		if (self.fan_slider_value() == 0) {
			sendCommand( settings.printer.fan_off.split(",") );
		} else {
			sendCommand( settings.printer.fan_on.replace("%speed", Math.floor(255 * self.fan_slider_value()/100) ).split(","));
			self.fan_slider_value(0);
		}
	}
	
	self.sendFlow0 = function(){
			sendCommand( settings.printer.flow_adjustment.replace("%tool", self.getLeftTool() ).replace("%flow", self.extruder0_flow_value()).split(",") );
			self.extruder0_flow_value(100);
	}

	self.sendFlow1 = function(){
			sendCommand( settings.printer.flow_adjustment.replace("%tool", self.getRightTool()).replace("%flow", self.extruder1_flow_value()).split(",") );
			self.extruder1_flow_value(100);
	}
	
	self.sendFeed = function(){
			sendCommand( settings.printer.feed_adjustment.replace("%feed", self.feed_rate_value()).split(",") );
			self.feed_rate_value(100);
	}
	
	self.load_filament = function(){
		 sendCommandByName('load_filament');
	}

	self.unload_filament = function(){
		sendCommandByName('unload_filament');
	}
}

function OffsetModel() {
	
	var self = this;

	self.current_z = ko.observable();	
	self.offset = ko.observable();
		
	self.prepared = ko.observable(false);
	
	self.m1 = ko.observable();
	self.m2 = ko.observable();
	self.m3 = ko.observable();
  self.m4 = ko.observable();
	
	self.update = function(){
		if (!self.prepared()) {
			self.current_z("reading...");	
			self.offset("reading...");
			sendCommand(["M114", "M851"]);
		}
	}

	self.prepareOffset = function(){
		sendCommand( settings.offset.prepare_offset.split(",") );
		self.prepared(true);
	}
	
	self.saveOffset = function(){
		sendCommand( settings.offset.save_offset.replace("%z", self.current_z()).split(","));
		self.prepared(false);
	}


	self.showMacro = function (){
		var message = "";
		if (settings.offset.macro_1 != "") {
			message += "M1 :<br/>&nbsp;&nbsp;&nbsp;" + settings.offset.macro_1.split(",").join("<br/>&nbsp;&nbsp;&nbsp;")+"<br/>";
		}
		if (settings.offset.macro_2 != "") {
			message += "M2 :<br/>&nbsp;&nbsp;&nbsp;" + settings.offset.macro_2.split(",").join("<br/>&nbsp;&nbsp;&nbsp;")+"<br/>";
		}
		if (settings.offset.macro_3 != "") {
			message += "M3 :<br/>&nbsp;&nbsp;&nbsp;" + settings.offset.macro_3.split(",").join("<br/>&nbsp;&nbsp;&nbsp;")+"<br/>";
		}
		if (settings.offset.macro_4 != "") {
			message += "M4 :<br/>&nbsp;&nbsp;&nbsp;" + settings.offset.macro_4.split(",").join("<br/>&nbsp;&nbsp;&nbsp;")+"<br/>";
		}
		
		info( message );
	}
	
	self.macro1 = function(){
		sendCommand( settings.offset.macro_1.split(","));
	}
	self.macro2 = function(){
		sendCommand( settings.offset.macro_2.split(","));
	}
	self.macro3 = function(){
		sendCommand( settings.offset.macro_3.split(","));
	}

	self.macro4 = function(){
		sendCommand( settings.offset.macro_4.split(","));
	}


	self.offsetDone = function(){
		sendCommand( settings.offset.offset_done.split(",") );
	}
	
	self.findZero = function(){
		sendCommand( settings.offset.find_reference.split(",") );
	}

	self.backLeft = function(){
		sendCommand( settings.offset.back_left.split(",") );
	}

	self.frontMiddle = function(){
		sendCommand( settings.offset.front_middle.split(",") );
	}

	self.backRight = function(){
		sendCommand( settings.offset.back_right.split(",") );
	}
	
	self.sendOffsetAdjustment = function(z){
		if (self.prepared()){
			sendCommand( settings.offset.send_relative_z.replace("%z", z).split(","), true );
		} else {
			sendCommand( settings.offset.save_offset.replace( "%z", ( parseFloat(self.offset()) + parseFloat(z) ) ).split(",") 
			.concat(  settings.offset.send_relative_z.replace("%z", z).split(",")  ), true  );
		}
	}	
}


function PrinterModel(){
	var self = this;
	
	self.port = ko.observable("");
	self.version = ko.observable("");
	self.status =  ko.observable("Offline");	
	self.power = ko.observable(true);
	
	self.status.subscribe(function(value) {
		if (self.error() || self.closedOrError() && value != "Offline"){
			$(".status_bar").css({"line-height": "20vh"});
			self.operational(false);
		} else {
			if ( self.printing() ) {
				$(".status_bar").css({"height": "20vh", "line-height": "20vh"});
			} else {
				$(".status_bar").css({"line-height": $(".status_bar").css("height")});
			}
		}
	});
	
	self.zoom =  ko.observable(false);
	
	self.zchange =  ko.observable("");
	
	self.progress = ko.observable(0);
	self.time_elapsed = ko.observable(0);
	self.time_left =  ko.observable(0);
	
	self.aprox_time_left =  ko.computed(function(){
		if (self.time_left() > 0) {
			return formatFuzzyPrintTime(self.time_left());
		} else {
			//aproximate based on percentage
			//return self.time_elapsed() * 100 / self.progress() - self.time_elapsed();
			return "Still stabilizing...";
		}
	});
  
	self.printTimeLeftOrigin = ko.observable(undefined);
   
	self.printTimeLeftOriginString = ko.pureComputed(function() {
      var value = self.printTimeLeftOrigin();
      switch (value) {
          case "linear": {
              return "Based on a linear approximation (very low accuracy, especially at the beginning of the print)";
          }
          case "analysis": {
              return "Based on the estimate from analysis of file (medium accuracy)";
          }
          case "mixed-analysis": {
              return "Based on a mix of estimate from analysis and calculation (medium accuracy)";
          }
          case "average": {
              return "Based on the average total of past prints of this model with the same printer profile (usually good accuracy)";
          }
          case "mixed-average": {
              return "Based on a mix of average total from past prints and calculation (usually good accuracy)";
          }
          case "estimate": {
              return "Based on the calculated estimate (best accuracy)";
          }
          default: {
              return "";
          }
      }
  });
  
  self.printTimeLeftOriginClass = ko.pureComputed(function() {
      var value = self.printTimeLeftOrigin();
      switch (value) {
          default:
          case "linear": {
              return "#f0555e";
          }
          case "analysis":
          case "mixed-analysis": {
              return "#ee404a";
          }
          case "average":
          case "mixed-average":
          case "estimate": {
              return "#ed2b36";
          }
      }
  });
	
	//whether the printer is currently connected and responding
	self.operational = ko.observable(null);
	//whether the printer is currently printing>
	self.printing = ko.observable(null);
	//whether the printer is currently disconnected and/or in an error state	
	self.closedOrError = ko.observable(null);
	//whether the printer is currently in an error state
	self.error = ko.observable(null);
	//whether the printer is currently paused
	self.paused = ko.observable(null);
	//whether the printer is operational and ready for jobs
	self.ready = ko.observable(null);


	self.bed_actual = ko.observable(0);
	self.bed_target = ko.observable(0);
	self.extruder0_actual = ko.observable(0);
	self.extruder0_target = ko.observable(0);
	self.extruder1_actual = ko.observable(0);
	self.extruder1_target = ko.observable(0);
	
	self.slicer_config = ko.observable(null);
	
	//hotend config
	self.dual_extruder =  ko.observable(false);
	self.dual_nozzle =  ko.observable(false);
	self.nozzle_size =  ko.observable(null);
	self.nozzle_name =  ko.observable(null);
		
	self.active_tool =  ko.observable(0);	
	
	self.fileToPrint = ko.observable(null);
	self.fileToPrint.subscribe(function(value) {
		if (value == null) {
			self.fileInfo(null);
			self.slicer_config(null)
		} else {
			getFileInfo(value);
		}
	});
	
	self.fileInfo = ko.observable(null);
	self.fileInfo.subscribe(function(value) {
		if (value != null) {
			//TODO: alert user if there is a mismatch between slicer profile and current hotend
			self.slicer_config(value.material +" on "+ value.nozzle + "mm "+ value.hotend);
		}
	});
	
	self.isFileLoaded = ko.computed(function(){
		if ( self.fileToPrint() == null){
			return false;
		} else {
			return true;
		}
	});
		
	self.acceptsCommands = ko.computed(function(){
		if (!self.power()) return false;
		if ( self.printing() ) {
			return false;
		} else {
			if (self.ready() ) {
				return true;
			} else {
				return false;
			}
		}
	});

	self.alwaysAcceptsCommands = ko.computed(function(){
		if ( self.power() && self.ready() ) {
			return true;
		} else {
			return false;
		}
	});
	
	//self.alwaysAcceptsCommands.extend({ notify: 'always' }); 
	
	self.operational.subscribe(function(value) {
		if (!value) {
			action.extruder0_slider_value(0);
			action.extruder1_slider_value(0);
			action.bed_slider_value(0);
			
			action.extruder0_flow_value(100);
			action.extruder1_flow_value(100);
			action.feed_rate_value(100);
			
			self.zchange("");
			$(".status_bar").css({"height": "100vh", "line-height": "100vh"});
		} else {
			$(".status_bar").css({"height": "33.34vh", "line-height": "33.34vh"});	
		}
	});
	
	self.inProgress = ko.computed(function(){
		if ( self.printing() || self.paused() ){
			return true;
		} else {
			return false;
		}
	});

	self.inProgress.subscribe(function(value) {
		if (value) {
			$(".status_bar").css({"height": "20vh", "line-height": "20vh"});
			if ( ! self.paused() ) {
				self.progress(0.1); //make sure the colors change	
			}
		} else {
			$(".status_bar").css({"height": "33.34vh", "line-height": "33.34vh"});
			printer.zoom(false);
			self.progress(0); 
		}
	});
	
	//self.acceptsCommands.extend({ notify: 'always' }); 
	
	self.acceptsCommands.subscribe(function(value) {
		if (value) {
			
			$("input.temp_slider").slider('enable');
			
			if (! self.dual_nozzle() ) {
				$("input.temp_slider_dual").slider('disable');
				if ( ! action.show_flow() ) {
					$(".slider-row").css({"height": "20vh"});
				}
			} else {
				if (self.dual_nozzle()){
					$("input.temp_slider_dual").slider('enable');
				} else  {
					$("input.temp_slider_dual").slider('disable');
				}
				if ( ! action.show_flow() ) {
					$(".slider-row").css({"height": "15vh"});	
				}				
			}
			$("#tool_select").bootstrapSwitch('disabled', false );

			if ( ! self.inProgress() ) {
				$(".status_bar").css({"height": "33.34vh", "line-height": "33.34vh"});
				self.progress(0);
			}
		} else {
			action.extruder0_slider_value(0);
			action.extruder1_slider_value(0);
			action.bed_slider_value(0);
						
			$("input.temp_slider").slider('disable');

			if (currentPanel == 'movement' || currentPanel == 'offset') switchPanel("status");
		}
	});

	self.dual_extruder.subscribe(function(value) {
		if (value) {
			if (self.acceptsCommands()) { 
				$("#tool_select").bootstrapSwitch('disabled', false);
				$("input.flow_slider_dual").slider('enable');
			} else {
				$("input.flow_slider_dual").slider('disable');
			}
			if ( action.show_flow() ) {
				$(".slider-row").css({"height": "15vh"});	
			}			
		} else {
			$("#tool_select").bootstrapSwitch('disabled', true);
			$("input.flow_slider_dual").slider('disable');
			if ( action.show_flow() ) {
				$(".slider-row").css({"height": "20vh"});
			}
		}
	});

	self.dual_nozzle.subscribe(function(value) {
		if (value) {
			if (self.acceptsCommands()) {
				$("input.temp_slider_dual").slider('enable');
			} else {
				$("input.temp_slider_dual").slider('disable');
			}
			if ( ! action.show_flow() ) {
				$(".slider-row").css({"height": "15vh"});
			}
		} else  {
			$("input.temp_slider_dual").slider('disable');
			if ( ! action.show_flow() ) {
				$(".slider-row").css({"height": "20vh"});
			}
		}
	});
	
	self.alwaysAcceptsCommands.subscribe(function(value) {
		if (value) {
			$("input.fan_slider").slider('enable');
			$("input.flow_slider").slider('enable');
		} else {
			$("input.fan_slider").slider('disable');
			$("input.flow_slider").slider('disable');
			action.fan_slider_value(0);
			action.extruder0_flow_value(100);
			action.extruder1_flow_value(100);
			action.feed_rate_value(100);
		}
	});
	
	self.cameraAction = function(){
		self.zoom( !self.zoom() );
	}
	
	self.zoom.subscribe(function(value){
		if (value) {
			camera_setup(true);
		} else {
			if (document.documentElement.clientWidth == window.innerWidth || document.documentElement.scrollWidth == window.innerWidth) { //no "pinch zoom"
				camera_setup(false);
			}
		}
	});
	
  // generic connect / disconnect (check for dif button types)
	self.printerConnect = function(){
		sendConnectionCommand("connect");
		switchPanel("status");
		self.getDefaultProfile();
	}

	self.printerDisconnect = function (){
		bootbox.confirm({closeButton: false, message: "Disconnect?", callback: function(result) {
		  if (result) {
				if (has_switch_plugin()) {
			  	sendSwitch({"command":"power", "status":false}, 
					function(){
							sendSwitchCommand("status");
							sendConnectionCommand("disconnect");
						}
					);
				} else {
					sendConnectionCommand("disconnect");
				}
		 }
		}});
	}

	self.getDefaultProfile = function() {
		getExtruderCountFromProfile(function(data){		
			current_profile_name = _.compact(_.map(data.profiles, function(obj) { if (obj.current) return obj.id; } ))[0];
			self.current_profile = data.profiles[current_profile_name];
			if (self.current_profile.extruder.count == 1){
				self.dual_extruder(false);
			} else {
				self.dual_extruder(true);
			}
			
		});
	}

	self.hotend_config = ko.computed(function(){
		return self.nozzle_size() + "mm " + self.nozzle_name();
	});

	self.percentage = ko.computed(function(){
		if ( self.printing() ) {
			return "Printing (" + (Math.round(printer.progress() * 100) / 100) + "%)"
		} else {
			return self.status();	
		}		
	});

	self.getDefaultProfile();
	
}

function SwitchPluginModel(){
	
	var self = this;
	
	self.lights = ko.observable(false);
	self.mute = ko.observable(true);
	self.unload = ko.observable(false);
	self.poweroff = ko.observable(false);
	
	self.toggleLights = function(){
		sendSwitchCommand("lights",!self.lights());
	}

	self.togglePower = function(){
		sendSwitchCommand("power",!printer.power());
	}

	self.toggleUnload = function(){
		sendSwitchCommand("unload",!self.unload());
	}

	self.togglePowerOff = function(){
		sendSwitchCommand("poweroff",!self.poweroff());
	}

	self.resetPrinter = function(){
		bootbox.confirm({closeButton: false, message: "Reset printer board?", callback: function(result) {
		  if (result) {
			 sendSwitch({"command":"power", "status":false}, function(){
				message("This will take around 30 seconds. Please be patient.");
				sendSwitchCommand("status");
				sendSwitchCommand("reset");
				switchPanel("status");
  			});
		  }
		}});
	}

	self.emergencyStop = function(){
		bootbox.confirm({closeButton: false, message: "STOP ?", callback: function(result) {
		  if (result) {
			sendSwitchCommand("reset");
			switchPanel("status");
		  }
		}});
	}

	self.toggleMute = function (){
		sendSwitchCommand("mute",!self.mute());
	}
	
}

function PowerButtonsModel(){
	var self = this;

	self.powerOn = function(){
		bootbox.confirm({closeButton: false, message: confirm_on, callback: function(result) {
		  if (result) {
 			 sendPowerOnButton();
		  }
		}});
	}

	self.powerOff = function(){
		bootbox.confirm({closeButton: false, message: confirm_off, callback: function(result) {
		  if (result) {
			 sendPowerOffButton();
		  }
		}});
	}

}

function DeviceModel(){
	var self = this;
	self.leftNotch = ko.observable();
	self.rightNotch = ko.observable();
}

var printer;
var action;
var offset;
var files;
var buttons;
var device;

function applyBindings(){
	if (printer != undefined) {
		return;
	}
	
	printer = new PrinterModel();
	offset = new OffsetModel();
	action = new ActionModel();
	files = new FilesModel();
	device = new DeviceModel();
	
	if ( has_switch_plugin() ) buttons = new SwitchPluginModel();	
	if ( has_power_buttons() ) buttons = new PowerButtonsModel();
	
	ko.applyBindings(action, document.getElementById("status_panel"));
	ko.applyBindings(action, document.getElementById("printer_panel"));
	ko.applyBindings(action, document.getElementById("movement_panel"));
	ko.applyBindings(printer,document.getElementById("camera_panel"));
	ko.applyBindings(printer,document.getElementById("sidebar"));
	ko.applyBindings(offset, document.getElementById("offset_panel"));
	ko.applyBindings(printer, document.getElementById("disconnected_view"));
	ko.applyBindings(files, document.getElementById("files_view"));
	
}


	
