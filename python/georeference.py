import argparse
import csv
import ifcopenshell
import numpy as np

# Can be called using python3 1_Cartesian2Csv.py -ifc_file IFC_INPUT_FILE -o OUTPUT_FILE_PATH, e.g.: 
# python3 1_Cartesian2Csv.py -ifc_file "./../../static/Kievitsweg_R23_MVP_IFC4.ifc" -o "./coordinates/coordinates.csv" 
def main():
  # Initialize parser
  parser = argparse.ArgumentParser(prog='extract_coordinates', description='Extracts 3D coordinates from an IFC file and saves them to a CSV file')
  parser.add_argument('-ifc_file', required=True, help='Input IFC file path')
  parser.add_argument('-o', '--output', required=True, help='Output CSV file path')
  args = parser.parse_args()

  ifc_file_path = args.ifc_file
  output_dir = args.output

  # Load the IFC file
  ifc_file = ifcopenshell.open(ifc_file_path)
  
  coordinates = extract_3d_coordinates(ifc_file)

  delta_x, delta_y, height, rotation = get_reference_rd_coordinates(ifc_file)

  # Save transformation parameters to CSV file
  save_transformation_parameters((round(delta_x), round(delta_y), height, round(rotation, 2)), output_dir)

  # Georeference Cartesian coordinates
  georeferenced_coordinates = georeference_coordinates(coordinates, delta_x, delta_y, height, rotation)

  # Save georeferenced coordinates to CSV file
  save_to_csv(georeferenced_coordinates, output_dir)


def extract_3d_coordinates(ifc_file):

  # Find all IfcCartesianPoint entities in the IFC file
  cartesian_points = ifc_file.by_type('IfcCartesianPoint')

  # Extract 3D coordinates
  coordinates = []
  for point in cartesian_points:
    if len(point.Coordinates) == 3:
      coordinates.append(point.Coordinates)

  return coordinates

def save_to_csv(coordinates, output_dir):
  output_file = output_dir + "georeferenced.csv"
  # Write coordinates to CSV file
  with open(output_file, 'w', newline='') as csvfile:
    csv_writer = csv.writer(csvfile)
    csv_writer.writerow(['X', 'Y', 'Z'])
    csv_writer.writerows(coordinates)
  print(f"Georeferenced coordinates saved to {output_file}")

# Save transformation parameters to CSV file
def save_transformation_parameters(parameters, output_dir):
  output_file = output_dir + "transformation_parameters.csv"
  with open(output_file, 'w', newline='') as csvfile:
    csv_writer = csv.writer(csvfile)
    csv_writer.writerow(['Delta_X', 'Delta_Y', 'Height', 'Rotation'])
    csv_writer.writerow(parameters)
  print(f"Transformation parameters saved to {output_file}")

# Retrieve map conversion data from the IFC file
def get_reference_rd_coordinates(ifc_file):
  map_conversion = ifc_file.by_type('IfcMapConversion')
  if map_conversion:
    mc = map_conversion[0]

    delta_x = getattr(mc, 'Eastings', None) or mc[2]
    delta_y = getattr(mc, 'Northings', None) or mc[3]
    height = getattr(mc, 'OrthometricHeight', None) or mc[4]
    rotation = np.arctan(mc[6] / mc[5])

    # Debug prints (comment out in production)
    print('delta x:', delta_x)
    print('delta y:', delta_y)
    print('height:', height)
    print('rotation (radians):', rotation, '\n')

    return delta_x, delta_y, height, rotation
  else:
    raise ValueError('No IfcMapConversion entity found in the IFC file.')
  
# Georeference coordinates
def georeference_coordinates(coordinates, delta_x, delta_y, height, rotation):
  if not coordinates:
    raise ValueError("No valid coordinates to georeference.")

  # Calculate offsets
  offset_x = delta_x - coordinates[0][0]
  offset_y = delta_y - coordinates[0][1]
  offset_z = height - coordinates[0][2]

  # Apply rotation and offsets
  georeferenced_coordinates = []
  for x, y, z in coordinates:
    x_rot = x * np.cos(rotation) - y * np.sin(rotation)
    y_rot = x * np.sin(rotation) + y * np.cos(rotation)
    georeferenced_coordinates.append((x_rot + offset_x, y_rot + offset_y, z + offset_z))

  return georeferenced_coordinates

  
if __name__ == "__main__":
  main()