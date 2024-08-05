import argparse
import os
import ifcopenshell # tested with version 0.7.10
import ifcopenshell.geom
import ifcopenshell.util.shape
import numpy as np
import math
import shapely # tested with version 2.0.5
import matplotlib.pyplot as pp
import geopandas as gpd

"""
Based on an IFC file and a collection of IFC elements, calculate the following:
1) A 2D footprint of the building, consisting of the union of exterior boundaries of the provided IFC elements.
   The footprint can be a polygon or a multipolygon (the latter in case the IFC model describes spatially separate buildings)
2) The perimeter of the footprint in metres.
3) The area of the footprint in square metres.
4) A measure of elongation of the footprint.

Output:
RDF code in Turtle format for the footprint, the perimeter, the area, the elongation and the IfcMapConversion parameters

Assumptions:
1) The IFC file contains an IfcMapConversion element, with easting and northing values based on RD (espg:28992)
and height based on NAP.
2) The scale parameter in IfcMapconversion is the number to divide the local CRS lengths by to arrive at lenghts in the
units of the global (map)CRS.
3) From the IfcOpenShell documentation: "Internally IfcOpenShell uses meters as the global length unit to do calculations".
Because output uses CRS epsg:28992, there is no need to scale geometry units to global CRS units.

References:
1) For ifcopenshell geometry processing, see https://docs.ifcopenshell.org/ifcopenshell-python/geometry_processing.html

Tested with:
IfcWall
IfcCurtainWall
IfcWallStandardCase
IfcRoof
IfcSlab
IfcWindow
IfcColumn
IfcBeam
IfcDoor
IfcCovering
IfcMember
IfcPlate

Examples:
footprint.py /home/frans/Projects/VCS_Rotterdam/Kievitsweg_R23_MVP_IFC4.ifc https://www.rotterdam.nl/vcs/IfcBuilding_113 IfcRoof,IfcSlab
footprint.py /home/frans/Projects/VCS_Rotterdam/Kievitsweg_R23_MVP_IFC4.ifc https://www.rotterdam.nl/vcs/IfcBuilding_113 IfcWall,IfcCurtainWall,IfcWallStandardCase,IfcRoof,IfcSlab,IfcWindow,IfcColumn,IfcBeam,IfcDoor,IfcCovering,IfcMember,IfcPlate
"""

def main(file, building_iri, ifc_classes):
    global ifc_file
    ifc_file = ifcopenshell.open(file)
    settings = ifcopenshell.geom.settings() # see https://docs.ifcopenshell.org/ifcopenshell/geometry_settings.html
    settings.set(settings.DISABLE_OPENING_SUBTRACTIONS, True) # should speed up 
    settings.set(settings.USE_WORLD_COORDS, True) # important to get geometries properly rotated
    # the line below is not needed, because IfcOpenShell work in metres
    #settings.set(settings.CONVERT_BACK_UNITS,True) # set units back from metres to the model lenght units

    # get the data needed for georeferencing
    map_conversion = ifc_file.by_type('IfcMapConversion')
    mc_delta_x = map_conversion[0][2] # should be RD (metres)
    mc_delta_y = map_conversion[0][3] # should be RD (metres)
    mc_elevation = map_conversion[0][4] # needed for 3D geometries; should in metres relative to NAP
    mc_scale = map_conversion[0][7] # assumption: scale is the number to divide model units by to arrive at map units. For example, if the model uses mm and the geography uses metres, then the scale is 0.001
    if mc_scale is None:
        mc_scale = 1

    mc_rotation = -1 * np.arctan(map_conversion[0][6]/map_conversion[0][5])
    # scale is not used, because IfcOpenShell work in metres
    #origin_wkt = 'POINT Z(' + str(mc_delta_x / mc_scale) + ' ' + str(mc_delta_y / mc_scale) + ' ' + str(mc_elevation / mc_scale) + ')'
    origin_wkt = 'POINT Z(' + str(mc_delta_x) + ' ' + str(mc_delta_y) + ' ' + str(mc_elevation) + ')'
 
    geometries = []
    for ifc_class in ifc_classes:
        ifc_objects = ifc_file.by_type(ifc_class)
        c = 0
        for ifc_object in ifc_objects:
            c = c + 1
            try:
                shape = ifcopenshell.geom.create_shape(settings, ifc_object)
            except:
                print('# Skipping IFC object with name',ifc_object.Name)
            else:
                object_footprint = get_footprint(shape.geometry)
                geometries.append(object_footprint)


    #print('geometries:', len(geometries))
    if len(geometries) == 0:
        print('no suitable geometries were found')
        exit(5)

    unioned_geometry = shapely.ops.unary_union(geometries)

    # get rid of interior polygons
    if unioned_geometry.geom_type == 'Polygon':
        outer_shape = unioned_geometry.exterior
    else: # it's a multipolygon
        outer_rings = []
        for poly in list(unioned_geometry.geoms):
            outer_rings.append(poly.exterior) # output: LinearRing
        outer_shape = shapely.ops.unary_union(outer_rings) #output: MultiLineString

    # georeference the coordinates
    if outer_shape.geom_type == 'LinearRing':
        footprint = georeference(outer_shape, mc_scale, mc_delta_x, mc_delta_y, mc_rotation)
        footprint_geomtype = 'Polygon'
    elif outer_shape.geom_type == 'MultiLineString':
        polys = []
        for linestring in list(outer_shape.geoms):
            polys.append(georeference(linestring, mc_scale, mc_delta_x, mc_delta_y, mc_rotation))
        footprint = shapely.MultiPolygon(polys)
        footprint_geomtype = 'MultiPolygon'
    else:
        print('unexpected geometry type')
        exit(3)

    #plot(footprint,'footprint')
    
    #compute a measure for elongation
    elongation = round(math.sqrt(footprint.area)/(footprint.length/4),4)

    ttl = f'''
@prefix geo: <http://www.opengis.net/ont/geosparql#> .
@prefix sf: <http://www.opengis.net/ont/sf#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix qudt: <http://qudt.org/schema/qudt/> .
@prefix unit: <http://qudt.org/vocab/unit/>  .
@prefix ssn: <http://www.w3.org/ns/ssn/> . # SSN is misused here, but it offers hasProperty, which is used as a substitute for dedicated VCS semantics

<{building_iri}> geo:hasGeometry <{building_iri}/CRS_origin> .
<{building_iri}> geo:hasDefaultGeometry <{building_iri}/footprint> .
<{building_iri}> ssn:hasProperty <{building_iri}/CRS_rotation> .

<{building_iri}/CRS_origin>
    a sf:Point ;
    geo:asWKT "<http://www.opengis.net/def/crs/EPSG/0/7415> {origin_wkt}"^^geo:wktLiteral ;
    geo:coordinateDimension "3"^^xsd:integer ;
    skos:prefLabel "CRS origin from IfcMapConversion"@en, "oorsprong CRS uit IfcMapConversion"@nl
.

<{building_iri}/CRS_rotation>
    a qudt:Quantity ;
    qudt:hasUnit unit:RAD ;
    qudt:numericValue "{mc_rotation}"^^xsd:decimal ;
    skos:prefLabel "rotation angle for georeferencing geometry, from IfcMapConversion"@en,
               "rotatiehoek voor georeferentie, uit IfcMapConversion"@nl
.

<{building_iri}/footprint>
    a sf:{footprint_geomtype} ;
    geo:asWKT "<http://www.opengis.net/def/crs/EPSG/0/28992> {footprint}"^^geo:wktLiteral ;
    geo:coordinateDimension "2"^^xsd:integer ;
    geo:hasMetricPerimeterLength "{round(footprint.length)}"^^xsd:double ;
    geo:hasMetricArea "{round(footprint.area, 3)}"^^xsd:double ;
    ssn:hasProperty <{building_iri}/footprint/elongation> ;
    skos:prefLabel "2D footprint of the building"@en, "2D-voetafdruk van het gebouw"@nl
.

<{building_iri}/footprint/elongation>
    a qudt:Quantity, ssn:Property ; 
    qudt:numericValue "{elongation}"^^xsd:decimal ; 
    skos:prefLabel "A measure for elongation of the footprint"@en, "Een maat voor de langgerektheid van de voetafdruk"@nl 
.

'''

    print (ttl)
    #print('\nfootprint WKT (CRS epsg:28992):',footprint)
    #print('footprint perimeter (metres):', round(footprint.length,3))
    #print('footprint area (square metres):', round(footprint.area,3))


def georeference(lstr, mc_scale, mc_delta_x, mc_delta_y, mc_rotation) -> shapely.Polygon:
    """"
    Georefence the X and Y coordinates, drop the Z coordinate and round to 3 decimals (milimetres).
    First do the rotation, then the translation, using the parameters from IfcMapConversion.

    Input is expected to be a LinearRing or LineString
    """
    # Substract half pi (90 degrees) from the rotation. This gets the footprint in the right position.
    # Somehow this extra rotation is needed because of geometry processing in get_footprint().
    # To do: find out if the extra rotation is required independent of the input IFC file.
    mc_rotation = mc_rotation - (np.pi / 2)

    verts_georef = []
    verts = lstr.coords[:]
    for vert in verts :
        # The scale is not used because IfcOpenShell works in metres
        #x_georef = (vert[0] / mc_scale * np.cos(mc_rotation) + vert[1] / mc_scale * np.sin(mc_rotation)) + mc_delta_x
        #y_georef = (-1 * vert[0] / mc_scale * np.sin(mc_rotation) + vert[1] / mc_scale * np.cos(mc_rotation)) + mc_delta_y
        x_georef = (vert[0] * np.cos(mc_rotation) + vert[1] * np.sin(mc_rotation)) + mc_delta_x
        y_georef = (-1 * vert[0] * np.sin(mc_rotation) + vert[1] * np.cos(mc_rotation)) + mc_delta_y
        verts_georef.append([round(x_georef,3),round(y_georef,3)])

    return shapely.Polygon(verts_georef)

def plot(geometry, title): #plot a geometry (useful for development and debugging)
    geom = gpd.GeoSeries([geometry])
    geom.plot()
    pp.title(title)
    pp.show()

def convhull(geometry): #calculate the 2D convex hull of a ifcopenshell geometry, only used for testing
    verts = ifcopenshell.util.shape.get_vertices(geometry)
    vertsxy = []
    for vert in verts:
        vertsxy.append([vert[0],vert[1]])
    mpt = shapely.multipoints(vertsxy)
    hull = shapely.convex_hull(mpt)
    return hull


def get_footprint(geometry) -> shapely.Geometry: # adapted from ifcopenshell.util.shape.get_footprint_area)

    direction = (0.0, 0.0, 1.0)
    verts = geometry.verts
    faces = geometry.faces
    vertices = np.array([[verts[i], verts[i + 1], verts[i + 2]] for i in range(0, len(verts), 3)])
    faces = np.array([[faces[i], faces[i + 1], faces[i + 2]] for i in range(0, len(faces), 3)])

    # Calculate the triangle normal vectors
    v1 = vertices[faces[:, 1]] - vertices[faces[:, 0]]
    v2 = vertices[faces[:, 2]] - vertices[faces[:, 0]]
    triangle_normals = np.cross(v1, v2)

    # Normalize the normal vectors
    triangle_normals = triangle_normals / np.linalg.norm(triangle_normals, axis=1)[:, np.newaxis]
    direction = np.array(direction) / np.linalg.norm(direction)

    # Find the faces with a normal vector pointing in the desired direction using dot product
    # normal_tol < 0 is pointing away, = 0 is perpendicular, and > 0 is pointing towards.
    normal_tol = 0.01  # Close to perpendicular, but with a fuzz for numerical tolerance
    dot_products = np.dot(triangle_normals, direction)
    filtered_face_indices = np.where(dot_products > normal_tol)[0]
    filtered_faces = faces[filtered_face_indices]

    # Flatten vertices along the direction
    for idx in range(len(vertices)):
        vertices[idx] = vertices[idx] - np.dot(vertices[idx], direction) * direction

    # Now flatten 3D vertices into 2D polygons which can be unioned to find a footprint.

    # Create an orthonormal basis using the direction
    d = np.array(direction) / np.linalg.norm(direction)
    a = np.array([1, 0, 0])

    # First basis vector
    b = np.cross(d, a)
    b /= np.linalg.norm(b)

    # Second basis vector
    c = np.cross(d, b)

    # Project the flattened vertices onto the basis to get 2D coordinates
    vertices_2d = np.array([[np.dot(v, b), np.dot(v, c)] for v in vertices])

    polygons = [shapely.Polygon(vertices_2d[face]) for face in filtered_faces]
    unioned_geometry = shapely.ops.unary_union(polygons)

    return unioned_geometry

if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='footprint', description='Returns the building footprint as Turtle (TriG) RDF code')
    parser.add_argument('ifc_file', help='Path to the input IFC file')
    parser.add_argument('building_iri', help='IRI of the building in the data graph')
    parser.add_argument('ifc_classes', help='Comma separated list of IFC classes to use to determine the footprint')
    args = parser.parse_args()

    ifc_file = args.ifc_file
    if not os.path.exists(ifc_file):
        print ('file not found:', ifc_file)
        exit(1)

    building_iri = args.building_iri

    ifc_classes = args.ifc_classes.split(',')
    if len(ifc_classes) == 0:
        print ('no IFC classes specified')
        exit(2)

    main(ifc_file, building_iri, ifc_classes)

exit(0)
