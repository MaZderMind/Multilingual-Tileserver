#------------------------------------------------------------------------------
#
#  Makefile for Osmium examples.
#
#------------------------------------------------------------------------------

CXX = g++
#CXX = clang

CXXFLAGS = -g
#CXXFLAGS = -O3

CXXFLAGS += -Wall -Wextra -Wredundant-decls -Wdisabled-optimization -pedantic -Wctor-dtor-privacy -Wnon-virtual-dtor -Woverloaded-virtual -Wsign-promo
#CXXFLAGS += -Wpadded -Winline -Weffc++ -Wold-style-cast

# uncomment this if you want information on how long it took to build the multipolygons
#CXXFLAGS += -DOSMIUM_WITH_MULTIPOLYGON_PROFILING

CXXFLAGS_GEOS    = -DOSMIUM_WITH_GEOS $(shell geos-config --cflags)
CXXFLAGS_SHAPE   = -DOSMIUM_WITH_SHPLIB $(CXXFLAGS_GEOS)
CXXFLAGS_PQ      = -I/usr/include/postgresql/

CXXFLAGS += -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64

CXXFLAGS += -I/osm/tools/osmium/include/

LDFLAGS = -L/usr/local/lib -lexpat -lpthread

LIB_GEOS     = $(shell geos-config --libs)
LIB_SHAPE    = -lshp $(LIB_GEOS)
LIB_PQ       = -lpq
LIB_PROTOBUF = -lz -lprotobuf-lite -losmpbf

PROGRAMS = \
    language_polygons

.PHONY: all clean

all: $(PROGRAMS)

language_polygons: language_polygons.cpp
	$(CXX) $(CXXFLAGS) $(CXXFLAGS_PQ) $(CXXFLAGS_GEOS) $(CXXFLAGS_SHAPE) -o $@ $< $(LDFLAGS) $(LIB_PROTOBUF) $(LIB_PQ) $(LIB_GEOS) $(LIB_SHAPE)

clean:
	rm -f *.o core $(PROGRAMS)

