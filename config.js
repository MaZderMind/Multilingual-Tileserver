// basic configuration
exports.config = {
	// port to listen on using http
	port: 5000,
	
	// timeout in milisecods (seconds × 1000) for render-requests, before the browser get's a 404
	timeout: 3000,
	
	// what should happen when a render-request timeouts
	//  null = Send a 404
	//  path to a file = send this file
	fallback: null,
	
	// ServerName-String used in HTTP-Responses
	serverName: 'multilingual tileserver by MaZderMind',
	
	// folder with static files to serve
	staticFolder: 'static',
	
	// specify different cache times for different zoom levels
	cache: [
		// world to country level
		{
			//minz: 0,
			maxz: 5,
			
			// 28 days
			seconds: 2419200
		},
		
		// country to region level
		{
			minz: 6,
			maxz: 9,
			
			// 7 days
			seconds: 604800
		},
		
		// region to city overview level
		{
			minz: 10,
			maxz: 13,
			
			// 1 day
			seconds: 86400
		},
		
		// inner city level
		{
			minz: 14,
			//maxz: 999,
			
			// 9 hours
			seconds: 32400
		}
	],
	
	// cache time for static files (28 days)
	cacheStatic: 2419200,
	
	// map styles configuration
	maps: {
		'shape': {
			//minz: 0,
			maxz: 5,
			
			style: 'styles/shape/shape.xml'
		},
		
		'plz': {
			minz: 5,
			maxz: 16,
			bbox: [5.56, 55.04, 15.35, 47.15],
			
			style: 'styles/plz/plz.xml'
		},
		
		'osm': {
			//minz: 0,
			maxz: 19,
			
			style: 'styles/osm/osm.xml'
		}
	},
	
	// queue and rendering configuration
	
	/*
	 * How fast a Tile will be renderend is controlled by two parameters: concurrency and priority
	 *
	 * The concurrency specifies, how much tiles in a stype can be rendered at the same time.
	 * This depends mostly on the complexity of the style: the harder it hits the database, the
	 * lower the concurrency should be. For example on my notebook it's no good idea to render
	 * more then two tiles in the osm style at once. The shape and plz layer are much simpler to
	 * render, my notebook can render up to 4 of these at the same time.
	 *
	 * ...
	 */
	queue: {
		//priority: 1,
		concurency: 4,
		
		// the osm-style gets a higher priority (3) then all other stylesn (1),
		// also the concurrency is decreased to 2
		'osm': {
			priority: 3
			concurency: 2,
			
			// change the priority on a per-zoom base
			perzoom: [
				// increase the zoomlevel further to 5 for the inner city zoom levels (z14+)
				{
					minz: 14,
					//maxz: 19,
					
					priority: 5
				}
			]
		}
	}
};
