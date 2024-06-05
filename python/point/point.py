import csv
import re


# Function to extract IFCMapConversion line from the IFC file
def extract_ifc_map_conversion(ifc_file_content):
    # Regular expression to find the IFCMapConversion field
    pattern = r"IFCMAPCONVERSION\(#\d+,\#\d+,(.*?),(.*?),(.*?),"
    match = re.search(pattern, ifc_file_content)
    if match:
        return match.groups()[:2]  # Extract only x and y coordinates
    else:
        return None

# Read the IFC file
def read_ifc_file(file_path):
    with open(file_path, 'r') as file:
        return file.read()

# Function to format coordinates to two decimal places
def format_coordinates(coordinates):
    return [f"{float(coord):.2f}" for coord in coordinates]

# Function to save coordinates to a CSV file
def save_coordinates_to_csv(coordinates, output_file_path):
    with open(output_file_path, 'w', newline='') as file:
        writer = csv.writer(file)
        # Write header
        writer.writerow(['x', 'y'])
        # Write coordinates
        writer.writerow(coordinates)

# Main function
def main():
    # Path to the IFC file
    ifc_file_path = './../../static/Kievitsweg_R23_MVP_IFC4.ifc'
    # Path to save the coordinates CSV
    output_file_path = './../georeferencing/coordinates/point.csv'

    # Read the IFC file content
    ifc_file_content = read_ifc_file(ifc_file_path)

    # Extract the IFCMapConversion coordinates
    coordinates = extract_ifc_map_conversion(ifc_file_content)
    
    if coordinates:
        print("Extracted coordinates:", coordinates)
        # Format coordinates
        formatted_coordinates = format_coordinates(coordinates)
        print("Formatted Coordinates:", formatted_coordinates)
        # Save to CSV
        save_coordinates_to_csv(formatted_coordinates, output_file_path)
        print(f"Coordinates saved to {output_file_path}")
    else:
        print("No IFCMapConversion field found")

# Run the main function
if __name__ == "__main__":
    main()

