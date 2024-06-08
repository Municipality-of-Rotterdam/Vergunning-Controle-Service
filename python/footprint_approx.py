import argparse
import os
import ifcopenshell.geom
import ifcopenshell.util.shape
import numpy as np
from shapely.geometry import MultiPoint, Polygon

# Can be called using python3 footprint_approx -ifc_file IFC_INPUT_FILE -o OUTPUT_FILE_PATH, e.g.: 
# python3 footprint_approx.py -ifc_file "./../static/Kievitsweg_R23_MVP_IFC4.ifc" -o "./../data/footprint.txt" 
def main():
  # Initialize parser
  parser = argparse.ArgumentParser(prog='footprint', description='Returns an approximation of the building footprint in WKT')
  parser.add_argument('-ifc_file', required=True, help='Input IFC file path')
  parser.add_argument('-o', '--output', required=True, help='Output file path')
  args = parser.parse_args()

  ifc_file = args.ifc_file
  output_file = args.output
  
  if not os.path.exists(ifc_file):
    print('File not found:', ifc_file)
    exit(1)

  ifc = ifcopenshell.open(ifc_file)

  # Get parameters for georeferencing
  # Note: IfcMapConversion is present, because it is required by the Rotterdam ILS
  map_conversion = ifc.by_type('IfcMapConversion')
  delta_x = map_conversion[0][2]
  delta_y = map_conversion[0][3]
  rotation = -1 * np.arctan(map_conversion[0][6] / map_conversion[0][5])

  # Get the geometry of the roof
  settings = ifcopenshell.geom.settings()  # see https://docs.ifcopenshell.org/ifcopenshell/geometry_settings.html
  roof = ifc.by_type('IfcRoof')[0]
  roof_shape = ifcopenshell.geom.create_shape(settings, roof)
  verts = ifcopenshell.util.shape.get_vertices(roof_shape.geometry)

  # Georeference the X and Y coordinates, drop the Z coordinate
  # first do the rotation, then the translation, using the parameters from IfcMapConversion
  verts_georef = []
  for vert in verts:
    x_georef = (vert[0] * np.cos(rotation) + vert[1] * np.sin(rotation)) + delta_x
    y_georef = (-1 * vert[0] * np.sin(rotation) + vert[1] * np.cos(rotation)) + delta_y
    verts_georef.append([round(x_georef, 3), round(y_georef, 3)])

  # Make a WKT polygon using a convex hull operation on vertices
  mpt = MultiPoint(verts_georef)
  convex_hull_polygon = Polygon(mpt.convex_hull)
  
  # Write the WKT polygon to the output file
  with open(output_file, 'w') as f:
    f.write(convex_hull_polygon.wkt)

  print('Building footprint approximation saved to:', output_file)

if __name__ == "__main__":
  main()
