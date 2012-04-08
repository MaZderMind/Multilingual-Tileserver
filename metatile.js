var config = require('./config').config;
var queue = require('./queue');

var fs = require('fs');
var path = require('path');

// size in bytes of metatile header
var metatile_header_size = 20 + 8 * 64;

// convert map, z, x, y to a metafile
function zxy_to_metafile(map, z, x, y)
{
	// reduce tile-coords to metatile-coords
	var mx = x - x%8;
	var my = y - y%8;
	
	// do some bit-shifting magic...
	var limit = 1 << z;
	if (x < 0 || x >= limit || y < 0 || y >= limit)
		return;
	
	// and even more...
	var path_components = [], i, v;
	for (i=0; i <= 4; i++) {
		v = mx & 0x0f;
		v <<= 4;
		v |= (my & 0x0f);
		mx >>= 4;
		my >>= 4;
		path_components.unshift(v);
	}
	
	// add the zoom to the left of the path
	path_components.unshift(z);
	
	// now join the tiledir and the calculated path
	return path.join(
		config.maps[map].tiledir, 
		path_components.join('/') + '.meta'
	);
}

exports.dirty = function(map, z, x, y, cb)
{
	// convert z/x/y to a metafile-path
	var metafile = zxy_to_metafile(map, z, x, y);
	
	// if the path could not be constructed
	if(!metafile)
	{
		// return without response
		return cb();
	}
	
	// if this node version does not have a utimes call
	if(!fs.utimes)
		return cb({status: 'no-utimes-call'});
	
	if(!config.dirtyRefTime)
		return cb({status: 'unknown'});
	
	// check if the file exists
	return fs.stat(metafile, function(err, stats)
	{
		// not found
		if(err)
			return cb({status: 'not yet rendered'});
		
		// alter the fs-times
		return fs.utimes(metafile, config.dirtyRefTime, config.dirtyRefTime, function()
		{
			// and return the callback
			return cb({status: 'dirty'});
		});
	});
}

// fetch the tile status
//  cb(status)
exports.fetchStatus = function(map, z, x, y, cb)
{
	// convert z/x/y to a metafile-path
	var metafile = zxy_to_metafile(map, z, x, y);
	
	// if the path could not be constructed
	if(!metafile)
	{
		// return without response
		return cb();
	}
	
	// fetch the stats
	return fs.stat(metafile, function(err, stats)
	{
		// callback
		if(err)
		{
			return cb({
				'status': 'not found'
			});
		}
		
		// if this server has a dirty-reference time
		if(config.dirtyRefTime)
		{
			// return if the tile is clean
			return cb({
				'status': config.dirtyRefTime >= stats.mtime ? 'dirty' : 'clean', 
				'refTime': config.dirtyRefTime, 
				'lastRendered': stats.mtime, 
				'metafile': metafile
			});
		}
		
		// without a referenct time
		else
		{
			// the tile is neither clean nor dirty
			return cb({
				'status': 'unknown', 
				'lastRendered': stats.mtime, 
				'metafile': metafile
			});
		}
	});
}

// fetch the tile
//  if(cb) cb(buffer)
exports.fetch = function(map, z, x, y, cb)
{
	// convert z/x/y to a metafile-path
	var metafile = zxy_to_metafile(map, z, x, y);
	
	// if the file did not exists
	if(!metafile)
	{
		if(cb) cb();
		return;
	}
	
	// try to fetch tile stats
	return fs.stat(metafile, function(err, stats)
	{
		// error stat'ing the file, call back without result
		if(err)
		{
			if(cb) cb();
			return;
		}
		
		// if a dirty time is configured and the tile is older
		if(config.dirtyRefTime && config.dirtyRefTime >= stats.mtime)
		{
			// send the tile to tirex
			queue.enqueue(map, z, x, y);
		}
		
		// try to open the file
		return fs.open(metafile, 'r', null, function(err, fd)
		{
			// error opening the file, call back without result
			if(err)
			{
				if(cb) cb();
				return;
			}
			
			// create a buffer fo the metatile header
			var buffer = new Buffer(metatile_header_size);
		
			// try to read the metatile header from disk
			return fs.read(fd, buffer, 0, metatile_header_size, 0, function(err, bytesRead)
			{
				// the metatile header could not be read, call back without result
				if (err || bytesRead !== metatile_header_size)
				{
					// close file descriptor
					fs.close(fs);
				
					// call back without result
					if(cb) cb();
					return;
				}
			
				// offset into lookup table in header
				var pib = 20 + ((y%8) * 8) + ((x%8) * 64);
			
				// read file offset and size of the real tile from the header
				var offset = buffer.getLong(pib);
				var size   = buffer.getLong(pib+4);
			
				// create a buffer for the png data
				var png = new Buffer(size);
			
				// read the png from disk
				return fs.read(fd, png, 0, size, offset, function(err, bytesRead)
				{
					// the png could not be read
					if (err || bytesRead !== size)
					{
						// close file descriptor
						fs.close(fs);
					
						// call back without result
						if(cb) cb();
						return;
					}
				
					// close file descriptor
					fs.close(fd);
				
					// call back with png
					if(cb) cb(png);
					return;
				});
			});
		});
	});
}
