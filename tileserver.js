/*
 * Multilingual Tileserver
 * Licensed by Peter Körner under the BSD License
 */

var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var util = require('util');

var config = require('./config').config;
var stats = require('./stats').stats;
var helper = require('./helper');
var metatile = require('./metatile');
var queue = require('./queue');

// the http server
var server = http.createServer(function(req, res)
{
	// count the request
	stats.recieved_requests++;
	
	// only GET requests are acceptable
	if(req.method != 'GET')
	{
		res.endError(405, 'only GET requests are handled');
		return req.log(405, 'only GET requests are handled');
	}
	
	// analyze the path
	var path = url.parse(req.url).pathname.split('/');
	
	// the first part of the url decides what route we'll take
	switch(path[1] || '')
	{
		// GET /maps -> list the maps
		case 'maps':
		{
			var maps = {};
			for(name in config.maps)
			{
				maps[name] = {
					// minimal zoom
					minz: config.maps[name].minz, 
					
					// maximal zoom
					maxz: config.maps[name].maxz,
					
					// possible languages on this map-style
					languages: config.maps[name].languages
				}
			}
			
			// count a meta-request
			stats.meta_delivered++;
			
			res.endJson(maps);
			return req.log('maps');
		}
		
		// GET /stats -> get statistics
		case 'stats':
		{
			// count a meta-request
			stats.meta_delivered++;
			
			res.endJson(stats.get());
			return req.log('stats');
		}
		
		// GET /tiles... -> sth with tiles
		case 'tiles':
		{
			// need to have at least 5 path segments:
			//   /tiles/map/z/x/y.png
			//      1    2  3 4 5
			if(path.length < 6)
			{
				res.endError(404, 'invalid tile path');
				return req.log(404, 'invalid tile path');
			}
			
			// split call
			var map = path[2],  
				z = parseInt(path[3]), 
				x = parseInt(path[4]), 
				y = parseInt(path[5]);
			
			// check if the map-name is known
			if(!config.maps[map])
			{
				res.endError(404, 'unknown map');
				return req.log(404, 'unknown map');
			}
			
			// check that the zoom is inside the renderer-range
			if(z < config.maps[map].minz || z > config.maps[map].maxz)
			{
				res.endError(404, 'z out of range');
				return req.log(404, 'z out of range');
			}
			
			// check that the x & y is inside the range
			var w = Math.pow(2, z)-1;
			if(x > w || x < 0)
			{
				res.endError(404, 'x out of range');
				return req.log(404, 'x out of range');
			}
			
			if(y > w || y < 0)
			{
				res.endError(404, 'y out of range');
				return req.log(404, 'y out of range');
			}
			
			// TODO: box check
			
			// switch by action field
			switch(path[6] || '')
			{
				// render
				case 'dirty':
					
					// try to dirty the tile
					return metatile.dirty(map, z, x, y, function(result)
					{
						// send response
						res.endJson(result);
						
						// print the request to the log
						return req.log('dirty');
					});
					
				// render
				case 'render':
					
					// TODO: throtteling
					
					// count a render-request
					stats.maps[map].zooms[z].tiles_rendered++;
					
					// send the request to the render queue, don't call back when finished
					var reqid = queue.enqueue(map, z, x, y);
					
					// send response to the client
					res.endJson({
						'status': 'sent to render queue', 
						'reqid': reqid
					});
					
					// print the request to the log
					return req.log('dirty');
				
				
				
				// status
				case 'status':
					
					// count a meta-request
					stats.meta_delivered++;
					
					// fetch the status of the log, call back when finished
					return metatile.fetchStatus(map, z, x, y, function(status)
					{
						// send the status to the client
						res.endJson(status);
						
						// print the request to the log
						return req.log('status');
					});
				
				
				
				// fetch tile
				case '':
					
					// try to fetch the tile
					return metatile.fetch(map, z, x, y, function(png)
					{
						// no tile found
						if(!png)
						{
							// TODO: throtteling
							
							// count a render-request
							stats.maps[map].zooms[z].tiles_rendered++;
							
							// send the request to the render queue
							return queue.enqueue(map, z, x, y, function(success)
							{
								// if the rendering did not complete in time
								if(!success)
								{
									// send an server error
									res.endError(404, 'not yet on disk');
									
									// print the request to the log
									return req.log(404, 'not yet on disk');
								}
								
								// tile rendered, re-read it from disk
								return metatile.fetch(map, z, x, y, function(png, meta)
								{
									// still not on disk? damn!
									if(!png)
									{
										// send an server error
										res.endError(500, 'tile fetch error');
										
										// print the request to the log
										return req.log(500, 'tile fetch error');
									}
									
									// count a delivery-request
									stats.maps[map].zooms[z].tiles_delivered++;
									
									// tile rendered, send it to client
									res.endTile(png, map, z, x, y);
									
									// print the request to the log
									return req.log('tile from renderer');
								});
							});
							
						}
						
						// count a delivery-request
						stats.maps[map].zooms[z].tiles_delivered++;
						
						// tile found, send it to client
						res.endTile(png, map, z, x, y);
						
						// print the request to the log
						return req.log('tile from cache');
					});
				
				
				
				// unknown action
				default:
				
					// send an 400 Bad Request to the client
					res.endError(400, 'unknown action');
					
					// print the request to the log
					return req.log(400, 'unknown action');
			}
		}
		
		// other requests
		default:
		{
			// try to serve as static file
			return helper.handleStatic(req, res, function(handled) {
				
				// the file was found
				if(handled)
				{
					// count a delivery-request
					stats.static_delivered++;
					
					// print the request to the log
					return req.log('static');
				}
				
				// the file was not found
				req.log(404, 'file not found');
				return res.endError(404, 'file not found');
			});
		}
		
	}
});

// log exceptions
server.on('clientError', function(exception)
{
	console.log("exception:", exception);
});

// start server
server.listen(config.port, '0.0.0.0');
console.log('http server listening on port', config.port);
