import csv

import ifcopenshell
import numpy as np


# Convert from millimeters to meters
def mm_to_m(value):
    return value / 1000.0

# Retrieve map conversion data from the IFC file
def get_reference_rd_coordinates(ifc_file):
    map_conversion = ifc_file.by_type('IfcMapConversion')
    if map_conversion:
        mc = map_conversion[0]

        delta_x = getattr(mc, 'Eastings', None) or mc[2]
        delta_y = getattr(mc, 'Northings', None) or mc[3]
        height = getattr(mc, 'OrthometricHeight', None) or mc[4]
        x_axis_ordinate = getattr(mc, 'XAxisOrdinate', None) or mc[5]
        x_axis_abscissa = getattr(mc, 'XAxisAbscissa', None) or mc[6]
        rotation = -1 * np.arctan(x_axis_abscissa / x_axis_ordinate)

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

# Save coordinates to CSV file
def save_to_csv(coordinates, output_file):
    with open(output_file, 'w', newline='') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['X_georeferenced', 'Y_georeferenced', 'Z_georeferenced'])
        csv_writer.writerows(coordinates)
    print(f"Georeferenced coordinates saved to {output_file}")

# Save transformation parameters to CSV file
def save_transformation_parameters(parameters, params_file):
    with open(params_file, 'w', newline='') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['Delta_X', 'Delta_Y', 'Height', 'Rotation'])
        csv_writer.writerow(parameters)
    print(f"Transformation parameters saved to {params_file}")

# Main function
def main(input_file, output_file, params_file, ifc_file_path):
    try:
        # Load the IFC file and get reference RD coordinates
        ifc_file = ifcopenshell.open(ifc_file_path)
        delta_x, delta_y, height, rotation = get_reference_rd_coordinates(ifc_file)

        # Save transformation parameters to CSV file
        save_transformation_parameters((delta_x, delta_y, height, rotation), params_file)

        # Read Cartesian coordinates from CSV file and convert to meters
        cartesian_coordinates = []
        with open(input_file, 'r') as csvfile:
            csv_reader = csv.reader(csvfile)
            next(csv_reader)  # Skip header
            for row in csv_reader:
                x, y, z = map(float, row)
                x_m = mm_to_m(x)
                y_m = mm_to_m(y)
                z_m = mm_to_m(z)
                cartesian_coordinates.append((x_m, y_m, z_m))

        # Georeference Cartesian coordinates
        georeferenced_coordinates = georeference_coordinates(cartesian_coordinates, delta_x, delta_y, height, rotation)

        # Save georeferenced coordinates to CSV file
        save_to_csv(georeferenced_coordinates, output_file)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    input_file = "./coordinates/coordinates.csv"
    output_file = "./coordinates/coordinates_georeferenced.csv"
    params_file = "./coordinates/transformation_parameters.csv"
    ifc_file_path = "./../../static/Kievitsweg_R23_MVP_IFC4.ifc"  # Path to your IFC file
    main(input_file, output_file, params_file, ifc_file_path)
