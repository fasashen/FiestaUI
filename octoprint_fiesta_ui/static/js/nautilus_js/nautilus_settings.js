function syntaxHighlight(json) {
	//https://stackoverflow.com/questions/4810841/how-can-i-pretty-print-json-using-javascript
	json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
		var cls = 'setting_error';
		if (/^"/.test(match)) {
			if (/:$/.test(match)) {
				cls = 'setting_key';
			} else {
				//console.log(match);
				if (match != "\"M117 Command configuration error.\"") {
					cls = 'setting_string';
				}
			}
		}
		return '<span class="' + cls + '">' + match + '</span>';
	});
}

$(function() {
	function NautilusSettingsViewModel(parameters) {
			var self = this;

			self.global_settings = parameters[0];
			self.notify = ko.observable("-1");
			
			self.notify_info = ko.observable(true);
			self.notify_warning = ko.observable(true);
			self.notify_error = ko.observable(true);
			
			self.gcode_results = ko.observable("");
			self.show_results = ko.observable(false);
			
      self.onBeforeBinding = function () {
          self.settings = self.global_settings.settings.plugins.nautilus;
      };
			
			self.onSettingsShown = function() {
				self.show_results(false);
				OctoPrint.get("plugin/nautilus/check_notification_server").done(function(result){
					self.notify(result);
					if (self.notify() == "2") console.log("Notification server is available.");
					if (self.notify() == "1") console.log("Notification server is available. But no devices are registered.");
					if (self.notify() == "0") console.log("Notification server is not available.");
					if (self.notify() == "-1") console.log("Notification server not available. Connection problem ?");
				});
			}

			self.send_notification = function(notification) {
				OctoPrint.get("plugin/nautilus/notify/"+notification).done(
					function(result){
						if (result == "1") {
							if (notification == "info") self.notify_info(false);
							if (notification == "warning") self.notify_warning(false);
							if (notification == "error") self.notify_error(false);
						} else {
							alert("Error");
						}
					});
			}

			self.test_settings = function() {
				OctoPrint.post("plugin/nautilus/test_settings", {data:$("#settings_gcodes")[0].value} ).done(
					function(result){
						self.gcode_results(syntaxHighlight(JSON.stringify(result, undefined, 2)));
						self.show_results(true);
					});
			}

			self.hide_results = function() {
				self.show_results(false);
			}
	
	}
	
		OCTOPRINT_VIEWMODELS.push({
			construct: NautilusSettingsViewModel,
			dependencies: ["settingsViewModel"],
			elements: ["#settings_plugin_nautilus"]
    });
});