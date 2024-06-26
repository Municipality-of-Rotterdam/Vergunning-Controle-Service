import argparse
import os
import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.shape
import numpy as np
import shapely
import matplotlib.pyplot as pp
import geopandas as gpd
from typing import Optional, Literal

"""Based on an IFC file and a collection of IFC elements, calculate the following:
1) A 2D footprint of the building, consisting of the union of exterior boundaries of the provided IFC elements.
   The footprint can be a polygon or a multipolygon (the latter in case the IFC model describes spatially separate buildings)
2) The perimeter of the footprint in metres
3) The area of the footprint in square metres

Assumptions:
1) The IFC file contains an IfcMapConversion element, with values bases on RD (espg:28992) and NAP

References:
1) For ifcopenshell geometry processing, see https://docs.ifcopenshell.org/ifcopenshell-python/geometry_processing.html
"""

# example args /home/frans/Projects/VCS Rotterdam/Kievitsweg_R23_MVP_IFC4.ifc IfcRoof IfcSlab

def main(file,ifc_classes):

    #print('file:', file)
    #print('classes:', ifc_classes)

    ifc_file = ifcopenshell.open(file)
    settings = ifcopenshell.geom.settings() # see https://docs.ifcopenshell.org/ifcopenshell/geometry_settings.html

    geometries = []
    for ifc_class in ifc_classes:
        ifc_objects = ifc_file.by_type(ifc_class)
        for ifc_object in ifc_objects:
            print('ifc object:',ifc_object.Name)
            #print('ifc object id:',ifc_object.id)
            #print('ifc object name:',ifc_object.attribute_name)
            try:
                shape = ifcopenshell.geom.create_shape(settings, ifc_object)
            except:
                print('  > skipping IFC object with name',ifc_object.Name)
                break
            #print('shape:',shape)
            #print('shape geometry',shape.geometry)
            #print('shape geometry id',shape.geometry.id)
            footprint = get_footprint(shape.geometry)
            geometries.append(footprint)

    print('collected all geometries')
    unioned_geometry = shapely.ops.unary_union(geometries)
    footprint_exterior = unioned_geometry.exterior
    footprint_georef = georeference(footprint_exterior)
    plot(footprint_georef,'footprint georeferenced')

    print('footprint WKT (CRS epsg:28992):',footprint_georef)
    print('footprint perimeter (metres):', round(footprint_georef.length,3))
    print('footprint area (square metres):', round(footprint_georef.area,3))


def georeference(geometry):
    # Georefence the X and Y coordinates, drop the Z coordinate and round to 3 decimals (milimetres)
    # first do the rotation, then the translation, using the parameters from IfcMapConversion
    map_conversion = ifc_file.by_type('IfcMapConversion')
    delta_x = map_conversion[0][2] # should be RD (metres)
    delta_y = map_conversion[0][3] # shoudl be RD (metres)
    #height = map_conversion[0][4] # needed for 3D geometries; should in metres relative to NAP
    rotation = -1 * np.arctan(map_conversion[0][6]/map_conversion[0][5])
    print('rotation (radians):', rotation, '\n')
    
    #debug: substract half pi to the rotation. This gets the footprint in the right position. Why?
    rotation = rotation - (np.pi / 2)

    verts_georef = []
    verts = geometry.exterior.coords[:]
    print('vert0:',verts[0])
    for vert in verts :
        x_georef = (vert[0] * np.cos(rotation) + vert[1] * np.sin(rotation)) + delta_x
        y_georef = (-1 * vert[0] * np.sin(rotation) + vert[1] * np.cos(rotation)) + delta_y
        verts_georef.append([round(x_georef,3),round(y_georef,3)])
    return shapely.Polygon(verts_georef)

def plot(geometry, title): #plot a geometry (useful for development and debugging)
    geom = gpd.GeoSeries([geometry])
    geom.plot()
    pp.title(title)
    pp.show()

# adapted from ifcopenshell.util.shape.get_footprint_area)
def get_footprint(geometry) -> shapely.Geometry:

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
    #print ('unioned geometry:',unioned_geometry)

    #print('unioned_geometry type',unioned_geometry.geom_type)
    if unioned_geometry.geom_type == 'Polygon':
        outer_shape = unioned_geometry.exterior
    else:
        outer_shape = shapely.convex_hull(unioned_geometry)

    print('outer shape type:',outer_shape.geom_type)
    return outer_shape

if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='footprint', description='Returns the building footprint in WKT')
    parser.add_argument('ifc_file', help='Path to the input IFC file')
    parser.add_argument('ifc_classes', help='Comma separated list of IFC classes to use to determine the footprint')
    args = parser.parse_args()

    ifc_file = args.ifc_file
    if not os.path.exists(ifc_file):
        print ('file not found:', ifc_file)
        exit(1)

    ifc_classes = args.ifc_classes.split(',')
    if len(ifc_classes) == 0:
        print ('no IFC classes specified')
        exit(2)

    main(ifc_file,ifc_classes)


exit (0)

# The following code calculates an approximation of the footprint by calculatin the convex all of all vertices
# Get parameters for georeferencing
map_conversion = ifc_file.by_type('IfcMapConversion')
delta_x = map_conversion[0][2]
delta_y = map_conversion[0][3]
rotation = -1 * np.arctan(map_conversion[0][6]/map_conversion[0][5])
verts = ifcopenshell.util.shape.get_vertices(roof_shape.geometry)
verts_georef = []
for vert in verts:
    x_georef = (vert[0] * np.cos(rotation) + vert[1] * np.sin(rotation)) + delta_x
    y_georef = (-1 * vert[0] * np.sin(rotation) + vert[1] * np.cos(rotation)) + delta_y
    verts_georef.append([round(x_georef,3),round(y_georef,3)])
mpt = shapely.multipoints(verts_georef)
convex_hull = shapely.convex_hull(mpt)
print('convex hull WKT: ', convex_hull)
plot(convex_hull, 'convex hull')


exit(0)




#t ry to make polygons from edges
# first create separate linearrings, then merge line segments with shapely.ops.linemerge(lines)
# Linearring needs a sequence of points. We start with the first vertex of the first edge
# we continue until there are no more edges left



# try weeding edges with duplicate from points:
# assumption: no shared vertices between 2D polygons
print('edges before weeding:',len(edges))
from_points = []
for edge in edges:
    fromp = edge[0]
    if fromp in from_points:
        edges.remove(edge)
    else:
        from_points.append(fromp)
print('edges after weeding:',len(edges))


print('\n*** make a list of linear rings')
edge1 = edges[0]
edge1_from = edge1[0]
edge1_to = edge1[1]
vert_lists = [[edge1_from,edge1_to]]
print('vert_lists:', vert_lists)

# make a copy of the edges list to remove edges from
edges_copy = edges.copy()
# remove the first edge from the copied list of edges
edges_copy.remove(edge1)

next_edge = True
i = 0
while next_edge:
    print('iteration:',i)
    for edge1 in edges:
        next_edge = False
        for edge2 in edges:
            #print('edge2:', edge2)
            edge2_from = edge2[0]
            if edge1_to == edge2_from:
                next_edge = True
                edge1_to = edge2[1]
                vert_lists[i].append(edge1_to)
                edges_copy.remove(edge2)
                print('vert_lists:',vert_lists)
                break
    i = i + 1
    edges = edges_copy
    edge1_from = edges[0][0]
    edge1_to = edges[0][1]
    vert_lists.append([edge1_from,edge1_to])
    print('elems edges_copy:', len(edges_copy))
    next_edge = False
    if len(edges_copy) > 2:
        next_edge = True
    if i == 3: # something goes wrong in the fourth ring
        break

vert_lists.pop()
print('vert_lists:',vert_lists)

polys = [[]]
c = 0
# try to make polygons from the linestrings
for li in vert_lists:
    for i in li:
         x = verts_georef[i][0]
         y = verts_georef[i][1]
         polys[c].append([x,y])
    if c < (len(vert_lists) - 1):
        polys.append([])
        c = c + 1

print('polys:',polys)


print('number of polys:', len(polys))

# for li in polys:
#     polygon = shapely.Polygon(li)
#     if polygon.is_valid:
#         print('polygon:', polygon)

#print('merged poly:', shapely.unary_union(polys) )


'''
# create a shapely multilinestring from edges and vertices
linestrings = []
for edge in edges:
    p1 = verts_georef[edge[0]]
    p2 = verts_georef[edge[1]]
    l = [p1,p2]
    ls = shapely.LineString(l)
    linestrings.append(ls)

mls = shapely.multilinestrings(linestrings)
#print ('\nmls: ', mls)

linemerge = shapely.line_merge(mls)
print('\nline merge: ', linemerge)

linearrings = shapely.linearrings(verts_georef)
print('\nlinearrings: ',linearrings)


concave_hull = shapely.concave_hull(mls)
convex_hull = shapely.convex_hull(mls)
print('\nconcave hull mutlilinestrings WKT: ', concave_hull)
print('\nconvex hull mutlilinestrings WKT: ', convex_hull) 

#mls = shapely.multilinestrings(verts_georef)
#concave_hull = shapely.concave_hull(mls
#print('concave hull WKT: ', concave_hull)

union = shapely.union_all(mls)
print('\nunion: ',union)

#union_concave_hull = shapely.concave_hull(union)
#print('\nunion concave hull: ', union_concave_hull)
'''

print('\nThat\'s all folks!')