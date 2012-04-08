var config = require('./config').config;
var stats = require('./stats').stats;
var helper = require('./helper');
var async = require('async');
var mapnik = require('mapnik');

var fs = require('fs');


// open http connections waiting for being rendered
var pending_requests = {};

// incremental counter used to generate unique request ids
var req_id = 0;

// very simple, unweighted queue
var thequeue = async.queue(worker, config.concurrency);

// mapnik map objects for the configured maps
var mapnikmaps = {};
config.maps.each(function(name, mapconf)
{
	console.log('loading style for map', name);
	
	var map = new mapnik.Map(8*256, 8*256);
	map.load(mapconf.style, function(err, map) {
		if(err) {
			console.log('error loading style', mapconf.style, 'for map', name, ':', err.message);
		}
		else {
			console.log('finished loading style', name);
		}
		
		mapnikmaps[name] = map;
	});
});

// SphericalMercator projection
var proj4 = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
var mercator = new mapnik.Projection(proj4);

// send to the render queue and call back when the tile is finished
//  if(cb) cb(success)
exports.enqueue = function(map, z, x, y, cb)
{
	// the request-id
	var reqid = 'nodets-' + process.pid + '-' + (req_id++);
	
	// store the callback under this id
	if(cb)
	{
		pending_requests[reqid] = cb;
		stats.pending_requests++;
	}

	// reduce the coordinates to metatile coordinates	
	var task = {
		map: map,
		z: z,
		mx: x - x%8,
		my: y - y%8,
		cb: cb
	};
	
	// TODO: queuing logic
	thequeue.push(task);
	
	// set the timeout to cancel the request
	setTimeout(function()
	{
		// if the request is already answered, don't bug around
		if(!pending_requests[reqid])
			return;
		
		// delete the pending request
		delete pending_requests[reqid];
		stats.pending_requests--;
		
		// count a timeout
		stats.maps[map].zooms[z].tiles_rendered_timeouted++;
		
		// call back with negative result
		if(task.cb) task.cb(false);
		task.cb = null;
		
	}, config.timeout);
	
	// return the reqid
	return reqid;
}

function worker(task)
{
	// bbox = min Longitude (y), min Latitude (x), max Longitude (y), max Latitude (x)
	
	var w = Math.pow(2, task.z)-1;
	var tilebox = [
		task.my,
		task.mx,
		task.my+8 > w ? w+1 : task.my+8,
		task.mx+8 > w ? w+1 : task.mx+8
	];
	
	var tiles = [tilebox[2] - tilebox[0], tilebox[3] - tilebox[1]];
	
	var bbox = [
		helper.tile2long(tilebox[0], task.z),
		helper.tile2lat(tilebox[1], task.z),
		helper.tile2long(tilebox[2], task.z),
		helper.tile2lat(tilebox[3], task.z)
	];
	
	console.log('rendering metatile containing tilebox', tilebox, 'which covers this number of tiles', tiles, 'and contains that bbox', bbox);
	
	var map = mapnikmaps[task.map];
	var im = new mapnik.Image(tiles[0]*256, tiles[1]*256);
	
	map.resize(tiles[0]*256, tiles[1]*256);
	map.extent = mercator.forward(bbox);
	map.render(im, function(err, im)
	{
		if(err)
		{
			res.end(err.message);
		}
		else {
			im.encode('png', function(err, buffer)
			{
				if(err) {
					//res.end(err.message);
					console.log('error', err);
				}
				else
				{
					console.log('success');
					//res.end(buffer);
					var stream = fs.createWriteStream('test.png');
					stream.write(buffer);
					stream.end();
				}
			});
		}
	});
}
