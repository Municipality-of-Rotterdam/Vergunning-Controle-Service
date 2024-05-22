import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.shape
import numpy as np
import shapely
import matplotlib.pyplot as pp
import geopandas as gpd
from typing import Optional, Literal

# Frans 2024-04-29: This is a proof-of-concept for extracting a 2D footprint of a building from an IFC file
# For ifcopenshell geometry processing, see https://docs.ifcopenshell.org/ifcopenshell-python/geometry_processing.html
#
# done:
# - georeference vertices
# - make a polygon by convex hull of vertices
#
# failures:
# - Make a concave hull from edges:
#
# to do:
# - Optimise code and make it pyhonic
# - Allow multiple instances of ifc classes
# - Run with commandline arguments, e.g. footprint.py my.ifc IfcRoof IfcSlab

tol = 1e-6
AXIS_LITERAL = Literal["X", "Y", "Z"]
VECTOR_3D = tuple[float, float, float]

def georeference(polygon):
       #print('function - polygon coords:',polygon.exterior.coords[:])
    map_conversion = ifc_file.by_type('IfcMapConversion')
    delta_x = map_conversion[0][2]
    delta_y = map_conversion[0][3]
    height = map_conversion[0][4]
    rotation = -1 * np.arctan(map_conversion[0][6]/map_conversion[0][5])
    verts_georef = []
    verts = polygon.exterior.coords[:]
    print('verts:',verts)
    print('vert0:',verts[0])
    for vert in verts :
        x_georef = (vert[0] * np.cos(rotation) + vert[1] * np.sin(rotation)) + delta_x
        y_georef = (-1 * vert[0] * np.sin(rotation) + vert[1] * np.cos(rotation)) + delta_y
        verts_georef.append([round(x_georef,3),round(y_georef,3)])
    return shapely.Polygon(verts_georef)


def get_footprint( # copied from ifcopenshell.util.shape.get_footprint_area)
    geometry,
    axis: AXIS_LITERAL = "Z",
    direction: Optional[VECTOR_3D] = None,
) -> float:
    """Calculates the total footprint (i.e. projected) surface area visible from along an axis

    This is typically useful for calculating footprint areas. For example, you
    might want to calculate the top-down footprint area of a slab, ignoring
    slopes in the slab.

    Surfaces do not need to be exactly perpendicular in the direction of the
    specified axis. A surface is counted so long as it is visible from that
    axis.

    Note that this calculates the 2D projected area, not the actual surface
    area. If you want the actual area, use ``get_side_area``.

    :param geometry: Geometry output calculated by IfcOpenShell
    :type geometry: geometry
    :param axis: Either X, Y, or Z. Defaults to Z.
    :type axis: str,optional
    :param direction: An XYZ iterable (e.g. (0., 0., 1.)). If a direction
        vector is specified, this overrides the axis argument.
    :type axis: iterable[float],optional
    :return: The surface area.
    :rtype: float
    """
    if direction is None:
        direction = {"X": (1.0, 0.0, 0.0), "Y": (0.0, 1.0, 0.0), "Z": (0.0, 0.0, 1.0)}[axis]

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

    # Find a vector not parallel to d
    a = np.array(d)
    if not np.isclose(a[2], 1.0, atol=0.01):  # If d is not along the Z-axis
        a[2] += 0.01  # Small perturbation to make it not parallel
    else:
        a = np.array([1, 0, 0])

    # First basis vector
    b = np.cross(d, a)
    b /= np.linalg.norm(b)

    # Second basis vector
    c = np.cross(d, b)

    # Project the flattened vertices onto the basis to get 2D coordinates
    vertices_2d = np.array([[np.dot(v, b), np.dot(v, c)] for v in vertices])

    polygons = [shapely.Polygon(vertices_2d[face]) for face in filtered_faces]
    unioned_polygon = shapely.ops.unary_union(polygons)

    return unioned_polygon


# Open an IFC file
ifc_file = ifcopenshell.open('/home/frans/Projects/VCS Rotterdam/Kievitsweg_R23_MVP_IFC4.ifc')
print('\nIFC version: ',ifc_file.schema)

# Get parameters for georeferencing
print('\n*** parameters for georeferencing')
map_conversion = ifc_file.by_type('IfcMapConversion')
delta_x = map_conversion[0][2]
delta_y = map_conversion[0][3]
height = map_conversion[0][4]
rotation = -1 * np.arctan(map_conversion[0][6]/map_conversion[0][5])
print('delta x: ',delta_x)
print('delta y: ',delta_y)
print('height: ',height)
print('rotation (radians):', rotation, '\n')

settings = ifcopenshell.geom.settings() # see https://docs.ifcopenshell.org/ifcopenshell/geometry_settings.html

print('\n*** get the geometry of the roof')
roof = ifc_file.by_type('IfcRoof')[0]
roof_shape = ifcopenshell.geom.create_shape(settings, roof)
verts = ifcopenshell.util.shape.get_vertices(roof_shape.geometry)
print ('number of vertices:', len(verts))

# get the edges. All edges connect only two vertices.
edges = ifcopenshell.util.shape.get_edges(roof_shape.geometry)
print ('number of edges:', len(edges))
print ('first edge:', edges[0])

#print('edges:', edges)

perim = ifcopenshell.util.shape.get_footprint_perimeter(roof_shape.geometry)
print('perim:',perim)

fpa = ifcopenshell.util.shape.get_footprint_area(roof_shape.geometry)
print('footprint area:', fpa)

full_footprint = get_footprint(roof_shape.geometry)
footprint_exterior = shapely.Polygon(full_footprint.exterior)

ring_coords = full_footprint.exterior.coords
print('ring_coords:',ring_coords)

footprint_georef = georeference(footprint_exterior)

print('footprint:',footprint_georef)


# myPoly = gpd.GeoSeries([footprint])
# myPoly.plot()
# pp.show()


exit(0)

# Georefence the X and Y coordinates, drop the Z coordinate
# first do the rotation, then the translation, using the parameters from IfcMapConversion
verts_georef = []
for vert in verts:
    x_georef = (vert[0] * np.cos(rotation) + vert[1] * np.sin(rotation)) + delta_x
    y_georef = (-1 * vert[0] * np.sin(rotation) + vert[1] * np.cos(rotation)) + delta_y
    verts_georef.append([round(x_georef,3),round(y_georef,3)])

print ('first vertex, georeferenced:', verts_georef[0])
print ('second vertex, georeferenced:', verts_georef[1])

print('\n*** make a WKT polygon using a convex hull operation on vertices')
mpt = shapely.multipoints(verts_georef)
convex_hull = shapely.convex_hull(mpt)
print('convex hull WKT: ', convex_hull)

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