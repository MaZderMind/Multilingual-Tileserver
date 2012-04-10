#include <fstream>
#include <libpq-fe.h>
#include <shapefil.h>

#include <osmium.hpp>
#include <osmium/handler/progress.hpp>
#include <osmium/export/shapefile.hpp>

#include <geos/geom/Geometry.h>
#include <geos/geom/GeometryFactory.h>
#include <geos/operation/buffer/BufferBuilder.h>
#include <geos/operation/buffer/BufferParameters.h>
#include <geos/operation/union/CascadedPolygonUnion.h>


class LanguagePolygonsHandler : public Osmium::Handler::Base {
	static const int max_language_len = 10;
	
	Osmium::Handler::Progress m_progress_handler;
	
	geos::geom::GeometryFactory factory;
	geos::operation::buffer::BufferParameters buffer_builder_params;
	geos::io::WKTWriter wkt;

	typedef std::vector<Osmium::OSM::Position> coord_vector;
	typedef std::map<std::string, coord_vector*> language_map;
	
	language_map lmap;

public:

	void init(Osmium::OSM::Meta& meta) {
		std::cout << "collecting coordinates of translated nodes..." << std::endl;
		
		m_progress_handler.init(meta);
	}

	void node(const shared_ptr<Osmium::OSM::Node const>& node) {
		m_progress_handler.node(node);
		
		const Osmium::OSM::TagList tags = node->tags();
		for(Osmium::OSM::TagList::const_iterator it = tags.begin(); it != tags.end(); ++it) {
			if(strncmp("name:", it->key(), 5) == 0 && strlen(it->key()) > 5) {
				char language[max_language_len+1];
				strncpy(language, it->key()+5, max_language_len);
				language[max_language_len] = '\0';

				coord_vector *v = lmap[language];
				if(!v) {
					v = new coord_vector();
					lmap[language] = v;
				}
				v->push_back(node->position());
			}
		}
	}

	void final() {
		m_progress_handler.final();
		
		for(language_map::iterator it = lmap.begin(); it != lmap.end(); it++) {
			std::cout << "building language polygon for \"" << it->first << "\" (" << it->second->size() << " nodes)" << std::endl;

			typedef std::vector<geos::geom::Polygon*> poly_vector;

			poly_vector buffers;
			for(coord_vector::iterator vit = it->second->begin(); vit != it->second->end(); vit++) {
				geos::operation::buffer::BufferBuilder buffer_builder(buffer_builder_params);
				geos::geom::Point* p = factory.createPoint((*vit));
				geos::geom::Geometry* buf = buffer_builder.buffer(p, 0.4);

				buffers.push_back(static_cast<geos::geom::Polygon*>(buf));

				delete p;
			}

			delete it->second;

			geos::geom::Geometry *buffer_union = geos::operation::geounion::CascadedPolygonUnion::Union(&buffers);

			for(poly_vector::iterator bit = buffers.begin(); bit != buffers.end(); bit++) {
				delete (*bit);
			}
			
			Osmium::Export::PolygonShapefile shp("o/"+it->first);
			shp.add_field("dummy", FTInteger, 1, 0);
			
			for(size_t iring = 0, nrings = buffer_union->getNumGeometries(); iring < nrings; iring++) {
				const geos::geom::Geometry *ring = buffer_union->getGeometryN(iring);
				const geos::geom::CoordinateSequence* coords = ring->getCoordinates();
				
				size_t ncoords = coords->size();
				std::vector<double> lons, lats;
				
				lons.resize(ncoords);
				lats.resize(ncoords);
				
				for(size_t icoord = 0; icoord < ncoords; icoord++) {
					const geos::geom::Coordinate coord = coords->getAt(icoord);
					
					lats[icoord] = coord.x;
					lons[icoord] = coord.y;
				}
				
				shp.add_geometry(SHPCreateSimpleObject(
					SHPT_POLYGON,
					ncoords,
					&(lats[0]),
					&(lons[0]),
					NULL
				));
				shp.add_attribute(0, 0); // dummy
			}
			
			shp.close();
			
			delete buffer_union;
		}
	}
};


int main(int argc, char *argv[]) {
	Osmium::init(true);

	if (argc != 2) {
		std::cerr << "Usage: " << argv[0] << " OSMFILE" << std::endl;
		exit(1);
	}

	Osmium::OSMFile infile(argv[1]);
	LanguagePolygonsHandler handler;
	infile.read(handler);
}
