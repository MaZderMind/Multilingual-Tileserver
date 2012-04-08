// basic configuration
exports.config = {
	// port to listen on using http
	port: 5000,
	
	// timeout in milisecods (seconds × 1000) for render-requests, before the browser get's a 404
	timeout: 3000,
	
	// number of parallel render-workers (will be migrated to complex queing system, later)
	concurrency: 3,
	
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
		{
			//minz: 0,
			maxz: 5,
			
			// 28 days
			seconds: 2419200
		}, {
			minz: 6,
			maxz: 9,
			
			// 7 days
			seconds: 604800
		}, {
			minz: 10,
			maxz: 13,
			
			// 1 day
			seconds: 86400
		}, {
			minz: 14,
			//maxz: 999,
			
			// 9 hours
			seconds: 32400
		}
	],
	
	// cache time for static files (28 days)
	cacheStatic: 2419200,
	
	// this will be filled from the tirex config
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
		},
		
		'osm-multi': {
			//minz: 0,
			maxz: 19,
			
			style: 'styles/osm/osm.xml',
			languages: {
				de: ['de', 'at', 'ch'],
				zh: ['zh']
			}
		}
	}
};
