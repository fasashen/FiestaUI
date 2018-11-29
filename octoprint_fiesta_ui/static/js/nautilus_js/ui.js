var currentView;
var currentPanel;

var pressTimer;
var show_terminal = false;

function switchView(view) {
	if ( currentView != view ){
		if (view == "main") {
			switchPanel("status");
		}
		$(".view").hide();
		$("#"+view+"_view").show();
		currentView = view;
	}
}

function switchPanel(panel){
	if ( currentPanel != panel ){		

		$(".sidebar-nav-selected").removeClass("sidebar-nav-selected");
		$("#"+panel+"_btn").addClass("sidebar-nav-selected");

		$(".panel").hide();
		$("#"+panel+"_panel").show();
		
		if (currentPanel == "camera") {
			stop_camera(false); //stop streaming, but not imediate
		} 
		currentPanel = panel;
	}
}

// tab menu buttons
if (TERMINAL) {

	document.getElementById("status_btn").ontouchend = function(){
	  clearTimeout(pressTimer);
		$("#terminal").hide();
		if (!show_terminal){
			switchPanel("status");
		}
		show_terminal = false;	  
	  return false;
	}
	
	document.getElementById("status_btn").ontouchstart = function(){
	  pressTimer = window.setTimeout(function() {
			//since we don't update when hidden
			_logs.value = latest_log.join("\n");

			$("#terminal").show();
			show_terminal = true;
		},800);
	  return false; 
	}
	
} else {
	$("#status_btn").click(function() {
		switchPanel("status");
	});
}

$("#printer_btn").click(function() {
	if ( currentPanel == "printer" ){
		//reset all sliders to default values
		action.extruder0_slider_value(0);
		action.extruder1_slider_value(0);
		action.bed_slider_value(0);

		action.extruder0_flow_value(100);
		action.extruder1_flow_value(100);
		action.feed_rate_value(100);
		
		action.show_flow(!action.show_flow());
	} else {
		switchPanel("printer");
	}
});


$("#movement_btn").click(function() {
	if (printer.acceptsCommands()){
		switchPanel("movement");
	}
});

$("#offset_btn").click(function() {
	if (printer.acceptsCommands()){
		switchPanel("offset");
		offset.update(); //update z and z offset values
	}
});

$("#camera_btn").click(function() {
	if (currentPanel != "camera") {
		start_camera();
	}
});


$("#tool_select").bootstrapSwitch({
		onText: "left",
		onColor: "success",
		offColor: "success",
		offText: "right",
		labelText: "extruder",
		handleWidth: 12,
		labelWidth: 18,
		size: "large",
		disabled: true,
		animate: false,

		onSwitchChange: function(event, state){
			if(state){
				sendCommand('T'+action.getLeftTool() );
			} else {
				sendCommand('T'+action.getRightTool() );
			}
		}
	});

function generateSliderOptions(temp){
	var step = parseInt(100/temp.length)
	var ticks_positions = []
	for (i=0; i <= 100-step; i += step){
		ticks_positions.push(i);
	}
	ticks_positions.push(100);

	return {
		ticks: Array.apply(null, {length: temp.length+1}).map(Number.call, Number), 
		ticks_labels: ['Off']. concat ( temp ), 
		ticks_positions: ticks_positions,
		min: 0, 
		max: temp.length, 
		step: 1,
		tooltip: 'hide',
		value: 0
	}
}

function createHotendSliders(temp) {
	options = generateSliderOptions(temp);
	$("#hotend0_slider").slider(options).on('change', function(val){action.extruder0_slider_value(val.value.newValue);});	
	$("#hotend1_slider").slider(options).on('change', function(val){action.extruder1_slider_value(val.value.newValue);});
}

function createBedSliders(temp) {
	options = generateSliderOptions(temp);
	$("#bed_slider").slider(options).on('change', function(val){action.bed_slider_value(val.value.newValue);});	
}

function generateFlowOptions(adjustment_percentage){
	const min = 100 - adjustment_percentage;
	const max = 100 + adjustment_percentage;
	return {
		id: "FR",
		ticks: [min, 100, max], 
		ticks_labels: [min, 100, max], 
		ticks_positions: [0, 50, 100], 
		min: min, 
		max: max, 
		step: 1,
		tooltip: 'hide',
		value: 100
	}
}

function createFlowSliders(adjustment_percentage) {	
	
	$("#hotend0_flow").slider( generateFlowOptions(adjustment_percentage) ).on('change', function(val){action.extruder0_flow_value(val.value.newValue);});
	$("#hotend1_flow").slider( generateFlowOptions(adjustment_percentage) ).on('change', function(val){action.extruder1_flow_value(val.value.newValue);});		
}

function createFeedSliders(adjustment_percentage) {	
	$("#feed_slider").slider( generateFlowOptions(adjustment_percentage) ).on('change', function(val){action.feed_rate_value(val.value.newValue);});	
}

var touch_start;
function camera_setup(fullscreen) {
	if (fullscreen){
		if (v1) {	
				document.ontouchmove = function(event){
					return true;
				};
		}	
		var vp = document.getElementById('vp');
		vp.content = "width=device-width, initial-scale=1, maximum-scale=3, user-scalable=yes";
		
		$("#main_view").append($("#camera_panel").remove());
		$("#wrapper").hide();
		$("#webcam").css({"height": "auto", "width": SCREEN_WIDTH});
	} else {
		if (v1) {
			document.ontouchstart = function(event) {
					if ( $(event.target).hasClass("bootbox-body") ) {
						touch_start = event.touches[0].clientY;
					}
				}

			document.ontouchmove = function(event){
				if ( $(event.target).hasClass("bootbox-body") ) {
					var t = $(event.target);
					if (touch_start > event.changedTouches[0].clientY) {
						//scrool down
						return t.scrollTop() < t.get(0).scrollHeight - t.get(0).offsetHeight;
					} else {
						//scrool up
						if ( t.scrollTop() == 0 ) {
							return false;
						} else {
							return true;
						}
					}
				} else {
					return false;
				}
			};
		} //end v1
		var vp = document.getElementById('vp');
		vp.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
		$("#webcam").css({"height": SCREEN_HEIGHT, "width": "100%"});
		$("#main").append($("#camera_panel").remove());
		$("#wrapper").show();
		window.scrollTo(0,0);
	}
	setup_camera_click();
}


//remap click after add/remove html element
function setup_camera_click() {
    // Remove handler from existing elements
    $("#webcam").off(); 

    // Re-add event handler for all matching elements
    $("#webcam").on("click", function() {
        printer.cameraAction();
				return false;
    });
}
