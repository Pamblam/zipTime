/**
 * This file belongs to the zipTime.js Library
 * @link https://github.com/Pamblam/zipTime.js/blob/master/zipTime.js
 * @license MIT
 * @author Rob Parham
 */

/**
 * Exposes a function which returns a promise that provides a zipTime object
 * @type Function
 */
;var makeZipTime = (function(){
	
	/**
	 * The base path to the location where the scripts are kept
	 * @type String
	 */
	var scriptsPath = getScriptsPath();
	
	////////////////////////////////////////////////////////////////////////////
	// zipTime Definition //////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	/**
	 * Private zipTime constructor
	 * @param {string|undefined} zip - The zipcode to use, or undefined 
	 *		to use local client date info.
	 * @param {function} promise
	 * @returns {zipTimemakeZipTime.zipTime}
	 */
	function zipTime(zip, promise){
		this.zip = sanitizeZip(zip);
		this.dst = true;
		this.utc = -5;
		this.clock = false;
		
		var self = this;
		getOffsets(this.zip).then(function(offsets){
			if(offsets !== false){
				self.zip = offsets.zip;
				self.dst = offsets.dst;
				self.utc = offsets.utc;
			}else{
				self.zip = false;
				self.dst = isLocalDst();
				self.utc = (new Date().getTimezoneOffset()/60)*-1;
				if(self.isDST()) --self.utc;
			}
			promise(self);
		});
	}
	
	/**
	 * Start a clock on the given HTML element
	 * @param {HTMLElement} ele - The HTMLElement on which to show the clock
	 * @param {String} format - The format shorthand to use
	 * @returns {undefined}
	 */
	zipTime.prototype.startClock = function(ele, format){
		if(this.clock !== false) return;
		var self = this;
		this.clock = setInterval(function(){
			ele.innerHTML = self.format(format);
		}, 1000);
	};
	
	/**
	 * Stop the existing clock that was started with startClock()
	 * @returns {undefined}
	 */
	zipTime.prototype.stopClock = function(){
		if(this.clock === false) return;
		clearInterval(this.clock);
	};
	
	/**
	 * Is the date object currently observing DST?
	 * @param {Date} date - The date object to check, if not provided, the 
	 *		zipTime date is used.
	 * @returns {Boolean}
	 */
	zipTime.prototype.isDST = function(date){
		// As of 2007 DST...
		// - begins at 2:00 a.m. on the second Sunday of March and
		// - ends at 2:00 a.m. on the first Sunday of November
		
		if(!this.dst) return false;
		if(undefined === date) date = this.Date();
		
		var month = date.getMonth();
		var day = date.getDate();
		var hour = date.getHours();
		
		var s = 0, d = 1;
		var secondSunMarDate = new Date(date.getFullYear(), 2, d);
		while(s < 2){
			if(secondSunMarDate.getDay()==0) s++;
			if(s==2){
				secondSunMarDate = secondSunMarDate.getDate();
				break;
			}
			secondSunMarDate.setDate(secondSunMarDate.getDate()+1);
		}		
		var After2ndSunMar2am = month > 2 || 
			month == 2 && day > secondSunMarDate ||
			month == 2 && day == secondSunMarDate && hour > 2;

		var d = 1;
		var firstSunNovDate = new Date(date.getFullYear(), 10, d);
		while(d<7){
			if(firstSunNovDate.getDay()==0){
				firstSunNovDate = firstSunNovDate.getDate();
				break;
			}
			firstSunNovDate.setDate(firstSunNovDate.getDate()+1);
		}
		var before1stSunNov2am = month < 10 || 
			month == 10 && day < firstSunNovDate ||
			month == 10 && day == firstSunNovDate && hour < 2;
		
		return After2ndSunMar2am && before1stSunNov2am; 
	};
	
	/**
	 * Get a Javascript date object from the provided locale
	 * @returns {Date}
	 */
	zipTime.prototype.Date = function(){
		var now = new Date(...arguments);		
		var hours = now.getHours();
		var offset = Math.floor(now.getTimezoneOffset()/60) + this.utc;
		hours += offset;
		now.setHours(hours);
		var isDST = this.isDST(now);
		if(isDST) now.setHours(++hours);
		var self = this;
		now.getTimezoneOffset = function(){
			return (self.utc+isDST)*-60;
		};
		now.toString = function(){
			var ofs = now.getTimezoneOffset()/60;
			var tz = "\\E\\D\\T";
			if(self.utc+self.dst == -5) tz = "\\C\\D\\T";
			if(self.utc+self.dst == -6) tz = "\\M\\D\\T";
			// Could be either pacific or mountain
			if(self.utc+self.dst == -7) tz = "\\P\\D\\T/\\M\\S\\T";
			if(self.utc+self.dst == -8) tz = "\\A\\K\\D\\T";
			if(self.utc+self.dst == -9) tz = "\\H\\A\\D\\T";
			if(self.utc+self.dst == -10) tz = "\\H\\A\\S\\T";
			return formatDate(now, "D M n Y H:i:s \\G\\M\\T-0"+ofs+"00 ("+tz+")");
		};
		return now; 
	};
	
	/**
	 * Get a string representing the date and time at the provided zip
	 * @param {String} format - The format to display the date/time
	 * @returns {String}
	 */
	zipTime.prototype.format = function(format){
		if(typeof format != "string") format = "D M n Y H:i:s";
		return formatDate(this.Date(), format);
	};
	
	////////////////////////////////////////////////////////////////////////////
	// Private helper methods //////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	/**
	 * Sanitize and normalize the provided zip or return false if not valid
	 * @param {String} zip
	 * @returns {String|Boolean}
	 */
	function sanitizeZip(zip){
		zip = zip.replace(/\D/g,'');
		if(zip.length < 3 || zip.length > 9) return false;
		if(zip.length <= 5) return ("00000" + zip).slice(-5);
		return ("0000000000" + zip).slice(-9).slice(0,5);
	}
	
	/**
	 * Get the path to the script files
	 * @returns {String}
	 */
	function getScriptsPath(){
		// This needs to be invoked as soon as this script is **loaded**
		// After other scripts have loaded this function will no longer work, 
		// So it must be invoked and the result stored in a variable immediately.
		var scripts = document.getElementsByTagName("script");
		var scripts_pieces = scripts[scripts.length-1].src.split("/");
		scripts_pieces.pop();
		return scripts_pieces.join('/')+"/";
	}
	
	/**
	 * Get the zip code offsets (or best guess) from the webworker and data 
	 * @param {String|false} zip - The zip to get data for
	 * @returns {Promise}
	 */
	function getOffsets(zip){
		return new Promise(function(done){
			if(!zip) return done(false);
			var worker = new Worker(scriptsPath+"zipTime.worker.js");
			worker.onmessage = function(e){
				worker.terminate();
				done(e.data);
			};
			worker.postMessage({path:scriptsPath, zip:zip});
		});
	}
	
	/**
	 * Does the currently running computer observe DST
	 * @returns {Boolean}
	 */
	function isLocalDst() {
		var now = new Date();
		var jan = new Date(now.getFullYear(), 0, 1);
		var jul = new Date(now.getFullYear(), 6, 1);
		return jan.getTimezoneOffset() != jul.getTimezoneOffset();
	}
	
	/**
	 * Format a date using PHP date shorthand
	 * @url https://gist.github.com/Pamblam/4d33935d712903da10c7366c20157d21
	 * @param {Date} date - A Javascript Date object
	 * @param {String} format - The format of the outputted date
	 * @returns {String} - The formatted date
	 */
	function formatDate(date, format) {
		if (isNaN(date.getTime())) return "Invalid Date";
		var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

		var buffer = []; 
		for(var i=0; i<format.length; i++){
			switch(format[i]){
				// If the current char is a "\" then skip it and add then next literal char
				case "\\": buffer.push(format[++i]); break;

				// Symbols that represent numbers
				case "Y": buffer.push("" + date.getFullYear()); break;
				case "y": buffer.push(("" + date.getFullYear()).substring(2)); break;
				case "m": buffer.push(("0" + (date.getMonth() + 1)).substr(-2, 2)); break;
				case "n": buffer.push("" + (date.getMonth() + 1)); break;
				case "t": buffer.push("" + new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()); break; 
				case "d": buffer.push(("0" + date.getDate()).substr(-2, 2)); break;
				case "j": buffer.push(date.getDate() + ""); break;
				case "w": buffer.push(date.getDay()); break;
				case "g": buffer.push("" + (date.getHours() > 12 ? date.getHours() - 12 : date.getHours())); break;
				case "G": buffer.push("" + date.getHours()); break;
				case "h": buffer.push(("0" + (date.getHours() > 12 ? date.getHours() - 12 : date.getHours())).substr(-2, 2)); break;
				case "H": buffer.push(("0" + (date.getHours()+"")).substr(-2, 2)); break;
				case "i": buffer.push(("0" + date.getMinutes()).substr(-2, 2)); break;
				case "s": buffer.push(("0" + date.getSeconds()).substr(-2, 2)); break;
				case "N": buffer.push(date.getDay()==0?7:date.getDay()); break;
				case "L": buffer.push((date.getFullYear() % 4 == 0 && date.getFullYear() % 100 != 0) || date.getFullYear() % 400 == 0 ? "1" : "0"); break;
				case "o": buffer.push(date.getMonth()==0&&date.getDate()<6&&date.getDay()<4?date.getFullYear()-1:date.getFullYear()); break;
				case "B": buffer.push(Math.floor((((date.getUTCHours() + 1) % 24) + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) * 1000 / 24)); break;
				case "v": buffer.push((date.getTime()+"").substr(-3)); break;
				case "Z": buffer.push(date.getTimezoneOffset()*60); break;
				case "U": buffer.push(Math.floor(date.getTime()/1000)); break;

				// Symbols that represent text
				case "a": buffer.push(date.getHours() > 11 ? "pm" : "am"); break;
				case "A": buffer.push(date.getHours() > 11 ? "PM" : "AM"); break;
				case "l": buffer.push(days[date.getDay()]); break;
				case "D": buffer.push(days[date.getDay()].substr(0, 3)); break;
				case "F": buffer.push(months[date.getMonth()]); break;
				case "M": buffer.push(months[date.getMonth()].substring(0, 3)); break;
				case "c": buffer.push(date.toISOString()); break;

				// Ordinal suffix
				case "S":
					var suffix = false;
					var ones = buffer[buffer.length-1];
					var tens = buffer[buffer.length-2];
					if(ones == "1") suffix = "st";
					if(ones == "2") suffix = "nd";
					if(ones == "3") suffix = "rd";
					if(tens == "1" || !suffix) suffix = "th";
					buffer.push(suffix);
					break;

				// ISO-8601 Week number
				case "W":
					var startDate = new Date(date.getFullYear(), 0);
					var endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
					while(endDate.getDay() < 6) endDate.setDate(endDate.getDate()+1);
					endDate = endDate.getTime();
					var weekNo = 0;
					while(startDate.getTime() < endDate){
						if(startDate.getDay() == 4) weekNo++;
						startDate.setDate(startDate.getDate()+1);
					}
					buffer.push(weekNo);
					break;

				// Day of the year
				case "z":
					var startDate = new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
					var dayNo = 0;
					while(startDate.getTime() < date.getTime()){
						dayNo++;
						startDate.setDate(startDate.getDate()+1);
					}
					buffer.push(dayNo);
					break;

				default: buffer.push(format[i]); break;
			}
		}
		return buffer.join('');
	}
	
	/**
	 * The function that actually generates the object
	 * @param {String|undefined} zip - The zip to generate a zipTime object for
	 * @returns {Promise}
	 */
	return function(zip){
		return new Promise(function(done){
			new zipTime(zip, done);
		});
	};
	
})();

