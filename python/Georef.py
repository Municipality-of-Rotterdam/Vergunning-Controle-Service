import csv


def mm_to_m(value):
    return value / 1000.0  # Convert from mm to m

def georeference_coordinates(coordinates, reference):
    # Calculate offsets
    offset_x = reference[0] - coordinates[0][0]
    offset_y = reference[1] - coordinates[0][1]
    offset_z = reference[2] - coordinates[0][2]

    # Georeference coordinates
    georeferenced_coordinates = []
    for x, y, z in coordinates:
        georeferenced_coordinates.append((x + offset_x, y + offset_y, z + offset_z))

    return georeferenced_coordinates

def save_to_csv(coordinates, output_file):
    # Write coordinates to CSV file
    with open(output_file, 'w', newline='') as csvfile:
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['X_georeferenced', 'Y_georeferenced', 'Z_georeferenced'])
        csv_writer.writerows(coordinates)

    print(f"Georeferenced coordinates saved to {output_file}")

def main(input_file, output_file, reference_rd):
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
    georeferenced_coordinates = georeference_coordinates(cartesian_coordinates, reference_rd)

    # Save georeferenced coordinates to CSV file
    save_to_csv(georeferenced_coordinates, output_file)

if __name__ == "__main__":
    input_file = "./coordinates.csv"
    output_file = "./output_coordinates_georeferenced.csv"
    reference_rd = (84112.801795527557, 431810.28221002209, 0.0)  # Reference RD coordinates for georeferencing
    main(input_file, output_file, reference_rd)




