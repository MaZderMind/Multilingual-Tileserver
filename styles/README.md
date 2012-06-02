# Export of the OSM-XML-Style
Run inside this folder:

    svn export http://svn.openstreetmap.org/applications/rendering/mapnik/ osm
	cd osm
	./get-coastlines.sh
	./generate_xml.py
