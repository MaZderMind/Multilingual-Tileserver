var config = require('./config').config;

// statistics
exports.stats = 
{
	// when the server was started
	started: new Date(), 
	
	// number of recieved requests
	recieved_requests: 0, 
	
	// number of currently pending requests
	pending_requests: 0, 
	
	// number of delivered static files
	static_delivered: 0, 
	
	// number of delivered meta information
	meta_delivered: 0, 
	
	// overall number of tiles delivered (accumulated from the per-maps-per-zoom numbers)
	tiles_delivered: 0, 
		
	// overall number of tiles sent to the render queue (accumulated from the per-maps-per-zoom numbers)
	tiles_rendered: 0, 
	
	// overall number of tiles that hit the timeout before returning from the renderer (accumulated from the per-maps-per-zoom numbers)
	tiles_rendered_timeouted: 0, 
	
	// statistics on a per-map basis
	maps: (function() {
		var maps = {};
		
		// iterate over all maps
		for(name in config.maps)
		{
			// one of them
			var map = config.maps[name];
			
			// create stats array for map
			maps[name] = 
			{
				// overall number of tiles delivered (accumulated from the per-zoom numbers)
				tiles_delivered: 0, 
					
				// overall number of tiles sent to the render queue (accumulated from the per-zoom numbers)
				tiles_rendered: 0, 
				
				// overall number of tiles that hit the timeout before returning from the renderer (accumulated from the per-zoom numbers)
				tiles_rendered_timeouted: 0, 
				
				// statistics on a per-map-and-zoomlevel basis
				zooms: {}
			};
			
			var minz = map.minz || 0, maxz = map.maxz || 18;
			
			// create stats array for the zoom levels
			for(z = minz; z <= maxz; z++)
			{
				maps[name].zooms[z] = 
				{
					// number of tiles delivered
					tiles_delivered: 0, 
					
					// number of tiles sent to tirex
					tiles_rendered: 0, 
					
					// number of tiles that hit the timeout before returning from tirex
					tiles_rendered_timeouted: 0
				}
			}
		}
		
		// build structure from config
		return maps;
	})(),
	
	// from the deep-nested numbers inside the maps-object
	// (all hits ar counted on a per-map-and-zoomlevel basis), 
	// we'll accumulate the per-map and overall numbers
	get: function()
	{
		// overall number of tiles delivered
		this.tiles_delivered = 0;
		
		// overall number of tiles sent to the render queue
		this.tiles_rendered = 0;
		
		// overall number of tiles that hit the timeout before returning from the renderer
		this.tiles_rendered_timeouted = 0;
		
		// iterate over all maps
		for(mapname in this.maps)
		{
			// a map
			var map = this.maps[mapname];
			
			// per-map number of tiles delivered
			map.tiles_delivered = 0;
			
			// per-map number of tiles sent to the render queue
			map.tiles_rendered = 0;
			
			// per-map number of tiles that hit the timeout before returning from the renderer
			map.tiles_rendered_timeouted = 0;
			
			// iterate over all zoom levels
			for(zoomlevel in map.zooms)
			{
				// statistics on a per-map-and-zoomlevel basis
				var zoom = map.zooms[zoomlevel];
				
				// accumulate to a per-map basis
				map.tiles_delivered += zoom.tiles_delivered;
				map.tiles_rendered += zoom.tiles_rendered;
				map.tiles_rendered_timeouted += zoom.tiles_rendered_timeouted;
			}
			
			// accumulate to am overall basis
			this.tiles_delivered += map.tiles_delivered;
			this.tiles_rendered += map.tiles_rendered;
			this.tiles_rendered_timeouted += map.tiles_rendered_timeouted;
		}
		
		// return statistics object
		return this;
	}
}
