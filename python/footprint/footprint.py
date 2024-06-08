import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.shape
import numpy as np
import shapely
# Frans 2024-04-29: This is a proof-of-concept for extracting a 2D footprint of a building from an IFC file

# Open an IFC file
ifc_file = ifcopenshell.open('./../../static/Kievitsweg_R23_MVP_IFC4.ifc')
print('IFC version: ',ifc_file.schema, '\n')

# Get parameters for georeferencing
print('*** parameters for georeferencing')
map_conversion = ifc_file.by_type('IfcMapConversion')
delta_x = map_conversion[0][2]
delta_y = map_conversion[0][3]
height = map_conversion[0][4]
rotation = -1 * np.arctan(map_conversion[0][6]/map_conversion[0][5])
print('delta x: ',delta_x)
print('delta y: ',delta_y)
print('height: ',height)
print('rotation (radians):', rotation, '\n')

print('*** get the geometry of the roof')
roof = ifc_file.by_type('IfcRoof')[0]

settings = ifcopenshell.geom.settings()
roof_shape = ifcopenshell.geom.create_shape(settings, roof)

# The GUID of the element we processed
print('roof GUID: ', roof_shape.guid)
print('roof GUID: ', roof_shape.id)

verts = ifcopenshell.util.shape.get_vertices(roof_shape.geometry)
print ('number of vertices: ', len(verts))
print ('first vertex:', verts[0])

# Georefence the X and Y coordinates, drop the Z coordinate
# first do the rotation, then the translation, using the parameters from IfcMapConversion
verts_georef = []
for vert in verts:
  x_georef = (vert[0] * np.cos(rotation) + vert[1] * np.sin(rotation)) + delta_x
  y_georef = (-1 * vert[0] * np.sin(rotation) + vert[1] * np.cos(rotation)) + delta_y
  verts_georef.append([round(x_georef,3),round(y_georef,3)])

print ('first vertex, georeferenced:', verts_georef[0])

'''
# output as WKT
# note: doesn't work if the vertices are not ordered correctly
print('*** make a WKT polygon directly from the vertices')
wkt = 'POLYGON(('
for point in verts_georef:
  wkt = wkt + str(point[0]) + ' ' + str(point[1]) + ', '
wkt = wkt.rstrip(', ')
wkt = wkt + '))'
print('WKT: ', wkt)
'''

print('\n*** make a WKT polygon using a convex hull operation')

mpt = shapely.multipoints(verts_georef)
convex_hull = shapely.convex_hull(mpt)
print('convex hull WKT: ', convex_hull)

print('\nThat\'s all folks!')