import csv

import numpy as np


def translate(coord, translation):
    """
    Translate coordinates.

    Args:
    coord: numpy array of shape (3,) representing coordinates (x, y, z)
    translation: numpy array of shape (3,) representing translation vector

    Returns:
    translated_coord: numpy array of shape (3,) representing translated coordinates
    """
    return coord - translation

def rotate_diagonal(coord, angle):
    """
    Rotate coordinates diagonally.

    Args:
    coord: numpy array of shape (3,) representing coordinates (x, y, z)
    angle: angle in radians for diagonal rotation

    Returns:
    rotated_coord: numpy array of shape (3,) representing rotated coordinates (x', y', z')
    """
    rotation_matrix = np.array([[np.cos(angle), -np.sin(angle), 0],
                                [np.sin(angle), np.cos(angle), 0],
                                [0, 0, 1]])
    return np.dot(rotation_matrix, coord)

def inverse_translate(coord, translation):
    """
    Inverse translate coordinates.

    Args:
    coord: numpy array of shape (3,) representing coordinates (x, y, z)
    translation: numpy array of shape (3,) representing translation vector

    Returns:
    inverse_translated_coord: numpy array of shape (3,) representing inverse translated coordinates
    """
    return coord + translation

# Load coordinates from CSV file
def load_coordinates_from_csv(csv_file):
    """
    Load coordinates from a CSV file.

    Args:
    csv_file: path to the CSV file containing coordinates

    Returns:
    coordinates: list of numpy arrays representing coordinates
    """
    coordinates = []
    with open(csv_file, 'r') as file:
        reader = csv.reader(file)
        next(reader)  # Skip header if exists
        for row in reader:
            coordinates.append(np.array([float(row[0]), float(row[1]), float(row[2])]))
    return coordinates

# Write coordinates to CSV file
def write_coordinates_to_csv(coordinates, output_file):
    """
    Write coordinates to a CSV file.

    Args:
    coordinates: list of numpy arrays representing coordinates
    output_file: path to the output CSV file
    """
    with open(output_file, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['x', 'y', 'z'])
        for coord in coordinates:
            writer.writerow(coord)

# Example usage
if __name__ == "__main__":
    # Read coordinates from CSV file
    csv_file = './static/coordinates/coordinates_georeferenced.csv'  # Replace with your CSV file path
    coordinates = load_coordinates_from_csv(csv_file)

    # Define the fixed corner coordinates (corner that remains fixed)
    fixed_corner = np.array([84113.6811288609, 431830.613043355, 0])  # x, y, z

    # Define the rotation angle (in radians) for diagonal rotation
    rotation_angle = np.radians(-22)  # Convert degrees to radians

    # Translate coordinates so that the fixed corner becomes the origin
    translated_coordinates = [translate(coord, fixed_corner) for coord in coordinates]

    # Rotate each translated coordinate diagonally around the origin
    rotated_coordinates = [rotate_diagonal(coord, rotation_angle) for coord in translated_coordinates]

    # Inverse translate coordinates back to their original position
    final_coordinates = [inverse_translate(coord, fixed_corner) for coord in rotated_coordinates]

    # Write final coordinates to CSV file
    output_file = './static/coordinates/coordinates_rotated.csv'  # Replace with desired output file path
    write_coordinates_to_csv(final_coordinates, output_file)

    print(f"Rotated coordinates written to '{output_file}'.")
