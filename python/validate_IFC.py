import argparse
import ifcopenshell
from ifctester import ids, reporter

def main(source_ifc_path, source_ids_path, report_destination_path='Ids_report.html'):
    try:
        ids_file = ids.open(source_ids_path)
    except Exception as e:
        print(f'ERROR! There was an error reading the provided IDS file: {source_ids_path}\nThe error message:\n')
        raise e

    try:
        ifc_file = ifcopenshell.open(source_ifc_path)
    except Exception as e:
        print(f'ERROR! There was an error reading the provided IFC file: {source_ifc_path}\nThe error message:\n')
        raise e

    # validate IFC model against IDS requirements:
    ids_file.validate(ifc_file)

    # Initialize Console reporter
    console_reporter = reporter.Console(ids_file)
    html_reporter = reporter.Html(ids_file)

    # Only the JSON reporter object seems to have access to the status
    json_report = reporter.Json(ids_file)
    status = json_report.report()['status']

    # Report validation results for local file
    # Note: could be changed to html page as well
    html_reporter.report()
    html_reporter.to_file(report_destination_path)

    # Check overall status and print success or failure message
    if status == True:
        print(f"IFC IDS validation passed! The IFC model meets all IDS requirements.\nThe resulting report was is available here: {report_destination_path}")
    else:
        # Report validation results for console
        console_reporter.report()
        raise Exception(f"IFC IDS validation failed! The IFC model does not meet all IDS requirements.\nThe resulting report is available here: {report_destination_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IFC IDS Validation Script")
    parser.add_argument("source_ifc_path", help="Path to the IFC file", type=str)
    parser.add_argument("source_ids_path", help="Path to the IDS file", type=str)
    parser.add_argument("-r", "--report_destination_path", help="Path to save the validation report", type=str, default='Ids_report.html')
    args = parser.parse_args()
    main(args.source_ifc_path, args.source_ids_path, args.report_destination_path)
