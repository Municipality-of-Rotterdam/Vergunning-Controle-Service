import argparse
import csv
import ifcopenshell

# can be used python extract_coordinates.py -ifc_file INPUT_IFC_FILE -o OUTPUT_CSV_FILE
def extract_3d_coordinates(ifc_file):
    # Open the IFC file
    ifc_file = ifcopenshell.open(ifc_file)

    # Find all IfcCartesianPoint entities in the IFC file
    cartesian_points = ifc_file.by_type('IfcCartesianPoint')

    # Extract 3D coordinates
    coordinates = []
    for point in cartesian_points:
        if len(point.Coordinates) == 3:
            coordinates.append(point.Coordinates)

    return coordinates

def save_to_csv(coordinates, output_file):
    # Write coordinates to CSV file
    with open(output_file, 'w', newline='') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['X', 'Y', 'Z'])
        csv_writer.writerows(coordinates)

    print(f"3D coordinates saved to {output_file}")

def main():
    # Initialize parser
    parser = argparse.ArgumentParser(prog='extract_coordinates', description='Extracts 3D coordinates from an IFC file and saves them to a CSV file')
    parser.add_argument('-ifc_file', required=True, help='Input IFC file path')
    parser.add_argument('-o', '--output', required=True, help='Output CSV file path')
    args = parser.parse_args()

    ifc_file = args.ifc_file
    output_file = args.output

    coordinates = extract_3d_coordinates(ifc_file)
    save_to_csv(coordinates, output_file)

if __name__ == "__main__":
    main()
