/**
 * This file belongs to the zipTime.js Library
 * @link https://github.com/Pamblam/zipTime.js/blob/master/zipTime.js
 * @license MIT
 * @author Rob Parham
 */

/**
 * When the main thread spawns this script as a worker it will attempt to find 
 * the zip coed provided, or else the nearest one to it.
 */
onmessage = function(e){	
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function () {
		if (this.readyState != 4 || this.status != 200) return;
		var data = JSON.parse(this.responseText);
		
		if(data.hasOwnProperty(e.data.zip)){
			// If the requested zip exists, return it's data to the main thread
			data[e.data.zip].zip = e.data.zip;
			postMessage(data[e.data.zip]);
			close();
		}else{
			// If the requested zip does not exist, attempt to find the closest zip
			var u = parseInt(e.data.zip);
			var d = parseInt(e.data.zip);
			while(u<100000 || d>0){
				if(u<100000){
					u++;
					var uzip = ("00000"+u).slice(-5);
					if(data.hasOwnProperty(uzip)){
						data[uzip].zip = uzip;
						postMessage(data[uzip]);
						close();
						break;
					}
				}
				if(d>0){
					d--;
					var dzip = ("00000"+d).slice(-5);
					if(data.hasOwnProperty(dzip)){
						data[dzip].zip = dzip;
						postMessage(data[dzip]);
						close();
						break;
					}
				}
			}
			// If no zips were found return false to the main thread
			postMessage(false);
			close();
		}
	};
	// Load the zip data into memory
	xhttp.open("GET", e.data.path+"zipTime.data.json", true);
	xhttp.send();
};
