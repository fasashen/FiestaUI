function formatSeconds(s){
    var date = new Date(1970, 0, 1);
    date.setSeconds(s);
    return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
}

const reInvertX = /(G1.*)(X)\s?(-?)(\d*)/g;
const reInvertY = /(G1.*)(Y)\s?(-?)(\d*)/g;
const reInvertZ = /(G1.*)(Z)\s?(-?)(\d*)/g;
const reMinus = '\$1\$2-\$4';
const rePlus = '\$1\$2\$4';

function invertAxes(gcode){
	//console.log('GCODE before invert: ', gcode);
	if (invertedX) gcode = invertXYZ(reInvertX, gcode)	
	if (invertedY) gcode = invertXYZ(reInvertY, gcode)
	if (invertedZ) gcode = invertXYZ(reInvertZ, gcode)
	//console.log('GCODE after invert: ', gcode);
	return gcode;
}

function invertXYZ(regex, gcode){
	const f = regex.exec(gcode);
	if (f !== null) {
		if (_.trim(f[3]) == "-") {
			return gcode.replace(regex, rePlus);	
		} else {
			return gcode.replace(regex, reMinus);
		}
	} else {
		return gcode;
	}
}

// from OctoPrint's "helpers.js"
function formatFuzzyPrintTime(totalSeconds) {
    /**
     * Formats a print time estimate in a very fuzzy way.
     *
     * Accuracy decreases the higher the estimation is:
     *
     *   * less than 30s: "a couple of seconds"
     *   * 30s to a minute: "less than a minute"
     *   * 1 to 30min: rounded to full minutes, above 30s is minute + 1 ("27 minutes", "2 minutes")
     *   * 30min to 40min: "40 minutes"
     *   * 40min to 50min: "50 minutes"
     *   * 50min to 1h: "1 hour"
     *   * 1 to 12h: rounded to half hours, 15min to 45min is ".5", above that hour + 1 ("4 hours", "2.5 hours")
     *   * 12 to 24h: rounded to full hours, above 30min is hour + 1, over 23.5h is "1 day"
     *   * Over a day: rounded to half days, 8h to 16h is ".5", above that days + 1 ("1 day", "4 days", "2.5 days")
     */

    if (!totalSeconds || totalSeconds < 1) return "-";

    var d = moment.duration(totalSeconds, "seconds");

    var seconds = d.seconds();
    var minutes = d.minutes();
    var hours = d.hours();
    var days = d.asDays();

    var replacements = {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        totalSeconds: totalSeconds
    };

    var text = "-";

    if (days >= 1) {
        // days
        if (hours >= 16) {
            replacements.days += 1;
            text = "%(days)d days";
        } else if (hours >= 8 && hours < 16) {
            text = "%(days)d.5 days";
        } else {
            if (days == 1) {
                text = "%(days)d day";
            } else {
                text = "%(days)d days";
            }
        }
    } else if (hours >= 1) {
        // only hours
        if (hours < 12) {
            if (minutes < 15) {
                // less than .15 => .0
                if (hours == 1) {
                    text = "%(hours)d hour";
                } else {
                    text = "%(hours)d hours";
                }
            } else if (minutes >= 15 && minutes < 45) {
                // between .25 and .75 => .5
                text = "%(hours)d.5 hours";
            } else {
                // over .75 => hours + 1
                replacements.hours += 1;
                text = "%(hours)d hours";
            }
        } else {
            if (hours == 23 && minutes > 30) {
                // over 23.5 hours => 1 day
                text = "1 day";
            } else {
                if (minutes > 30) {
                    // over .5 => hours + 1
                    replacements.hours += 1;
                }
                text = "%(hours)d hours";
            }
        }
    } else if (minutes >= 1) {
        // only minutes
        if (minutes < 2) {
            if (seconds < 30) {
                text = "a minute";
            } else {
                text = "2 minutes";
            }
        } else if (minutes < 30) {
            if (seconds > 30) {
                replacements.minutes += 1;
            }
            text = "%(minutes)d minutes";
        } else if (minutes <= 40) {
            text = "about 40 minutes";
        } else if (minutes <= 50) {
            text = "about 50 minutes";
        } else {
            text = "1 hour";
        }
    } else {
        // only seconds
        if (seconds < 30) {
            text = "a couple of seconds";
        } else {
            text = "less than a minute";
        }
    }

    return sprintf(text, replacements);
}

function formatSize(bytes) {
    if (!bytes) return "-";

    var units = ["bytes", "KB", "MB", "GB"];
    for (var i = 0; i < units.length; i++) {
        if (bytes < 1024) {
            return sprintf("%3.1f%s", bytes, units[i]);
        }
        bytes /= 1024;
    }
    return sprintf("%.1f%s", bytes, "TB");
}

function formatTimeAgo(unixTimestamp) {
    if (!unixTimestamp) return "-";
    return moment.unix(unixTimestamp).fromNow();
}

function message(message){
	bootbox.alert({ closeButton: false, className: "bootbox-message", message: message});
}

function info(message){
	bootbox.alert({ closeButton: false, className: "bootbox-info", message: message});
}

ko.bindingHandlers.leftTruncatedText = {
    update: function (element, valueAccessor, allBindingsAccessor) {
				originalText  = "";
				if ( valueAccessor() != undefined) originalText = valueAccessor();
				length = ko.utils.unwrapObservable(allBindingsAccessor().maxTextLength) || 20 ;
			 	truncatedText = originalText.length > length ? "..." + originalText.substring(originalText.length - length) : originalText;
				ko.bindingHandlers.text.update(element, function () {
					return truncatedText; 
				});
			}
};
