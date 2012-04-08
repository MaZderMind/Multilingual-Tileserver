var http = require('http');
var mime = require('mime');
var url = require('url');
var fs = require('fs');
var path = require('path');
var util = require('util');

var config = require('./config').config;

Object.prototype.each = function(block)
{
	var keys = Object.keys(this);
	for(var i = 0, l = keys.length; i < l; i++)
	{
		block(keys[i], this[keys[i]]);
	}
}

// get long value at offset from buffer
Buffer.prototype.getLong = function(offset)
{
	return ((this[offset+3] * 256 + this[offset+2]) * 256 + this[offset+1]) * 256 + this[offset];
}

// end with code 200 OK and JSON data
http.ServerResponse.prototype.endJson = function(data) 
{
	this.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
	this.end(JSON.stringify(data));
}

// end with and server error
http.ServerResponse.prototype.endError = function(code, desc, headers)
{
	desc = desc || '';
	
	headers = headers || {};
	headers['Content-Type'] = headers['Content-Type'] || 'text/plain';
	headers['X-Error'] = desc
	
	this.writeHead(code, headers);
	this.end(desc);
}

// end with a tile
http.ServerResponse.prototype.endTile = function(png, map, z, x, y)
{
	// iterate over all cache settings
	for(var i=0; i<config.cache.length; i++)
	{
		// one cache setting
		var cache = config.cache[i];
		
		// check if we're inside the min/max range
		if(cache.minz && cache.minz > z)
			continue;
		
		if(cache.maxz && cache.maxz < z)
			continue;
		
		// yep, we are, use this cache config
		break;
	}
	
	var now = new Date();
	var expires = new Date(now.getTime() + cache.seconds*1000);
	
	this.writeHead(200, {
		
		'Server': config.serverString, 
		'Content-Type': 'image/png', 
		'Content-Length': png.length, 
		
		'Date': now.toGMTString(), 
		'Expires': expires.toGMTString(), 
		'Cache-Control': 'max-age='+cache.seconds, 
		
		'X-Map': map, 
		'X-Coord': z+'/'+x+'/'+y, 
		'X-License': 'OpenStreetMap und Mitwirkende, CC-BY-SA 2.0'
	});
	
	this.end(png);
}

// log an request to the console
http.IncomingMessage.prototype.log = function(usage, comment)
{
	// numeric resonses should be enhanced with status strings
	if(typeof usage == 'number')
		usage = usage + ' ' + http.STATUS_CODES[usage];
	
	if(comment)
		usage += ' ('+comment+')';
	
	// print the message
	console.log('%s %s -> %s', this.method, this.url, usage);
}


// try to serve the file from disc
exports.handleStatic = function(req, res, cb)
{
	// parse url
	var pathname = url.parse(req.url).pathname;
	
	// directory index
	if(pathname == '/')
		pathname = '/index.html';
	
	// check for directory traversal attacks
	if(pathname.indexOf('/.') != -1)
		cb(false);
	
	// url to file path mapping
	var file = config.staticFolder+pathname;
	
	// check if the file exists on disk
	fs.stat(file, function(err, stats) {
		
		// stat callback
		if(stats && stats.isFile())
		{
			// it exists and it is a file (symlinks are resolved)
			
			// generate filename & mimetype
			var filename = path.basename(file), 
				extension = path.extname(file), 
				mimetype = mime.lookup(extension);
			
			var now = new Date();
			var expires = new Date(now.getTime() + config.cacheStatic*1000);
			
			// TODO: gz compression w/ cache
			
			// write header line
			res.writeHead(200, {
				'Server': config.serverString, 
				'Content-Type': mimetype, 
		
				'Date': now.toGMTString(), 
				'Expires': expires.toGMTString(), 
				'Cache-Control': 'max-age='+config.cacheStatic, 
			});
			
			// the file was found and the request method is ok, go on and serve the file's content
			var stream = fs.createReadStream(file);
			
			// pump from input stream to response
			util.pump(stream, res, function(err) {
				
				// the pump operation has ended (with or without error), so close the client connection
				res.end();
				
				// callback with found message
				return cb(true);
			});
		}
		
		// there is no such file -> not found
		else return cb(false);
	});
}

// Formulas from http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
exports.long2tile = function(lon, zoom)
{
	return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}
exports.lat2tile = function(lat, zoom)
{
	return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,zoom)));
}
	 
exports.tile2long = function(x, z)
{
	return (x/Math.pow(2,z)*360-180);
}

exports.tile2lat = function(y, z)
{
	var n = Math.PI-2*Math.PI*y/Math.pow(2,z);
	return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}
