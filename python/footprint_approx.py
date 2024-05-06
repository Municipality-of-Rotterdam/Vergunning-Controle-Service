import argparse
import ifcopenshell.geom
import ifcopenshell.util.shape
import numpy as np
from shapely import multipoints, convex_hull

# Return an approximation of a building footprint, by taking the convex hull of the roof.

#'/home/frans/Projects/VCS Rotterdam/Kievitsweg_R23_MVP_IFC4.ifc'

# Initialize parser
parser = argparse.ArgumentParser(prog='footprint_approx', description='Returns an approximation of the building footprint in WKT')
parser.add_argument('ifc_file')
args = parser.parse_args()

print('ifc file:', args.ifc_file)


file = '/home/frans/Projects/VCS Rotterdam/Kievitsweg_R23_MVP_IFC4.ifc'

ifc_file = ifcopenshell.open(file)

# Get parameters for georeferencing
# Note: IfcMapConversion is present, because it is required by the Rotterdam ILS
map_conversion = ifc_file.by_type('IfcMapConversion')
delta_x = map_conversion[0][2]
delta_y = map_conversion[0][3]
height = map_conversion[0][4]
rotation = -1 * np.arctan(map_conversion[0][6]/map_conversion[0][5])

#Get the geometry of the roof')
settings = ifcopenshell.geom.settings() # see https://docs.ifcopenshell.org/ifcopenshell/geometry_settings.html
roof = ifc_file.by_type('IfcRoof')[0]
roof_shape = ifcopenshell.geom.create_shape(settings, roof)
verts = ifcopenshell.util.shape.get_vertices(roof_shape.geometry)

# Georefence the X and Y coordinates, drop the Z coordinate
# first do the rotation, then the translation, using the parameters from IfcMapConversion
verts_georef = []
for vert in verts:
    x_georef = (vert[0] * np.cos(rotation) + vert[1] * np.sin(rotation)) + delta_x
    y_georef = (-1 * vert[0] * np.sin(rotation) + vert[1] * np.cos(rotation)) + delta_y
    verts_georef.append([round(x_georef,3),round(y_georef,3)])

# make a WKT polygon using a convex hull operation on vertices
mpt = multipoints(verts_georef)
convex_hull = convex_hull(mpt)
print(convex_hull)

exit(0)