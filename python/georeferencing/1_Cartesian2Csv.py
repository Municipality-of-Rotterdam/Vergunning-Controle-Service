import csv

import ifcopenshell


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

def main(ifc_file, output_file):
    coordinates = extract_3d_coordinates(ifc_file)
    save_to_csv(coordinates, output_file)

if __name__ == "__main__":
    ifc_file = "./input/Kievitsweg_R23_MVP_IFC4.ifc"
    output_file = "./coordinates/coordinates.csv"
    main(ifc_file, output_file)
