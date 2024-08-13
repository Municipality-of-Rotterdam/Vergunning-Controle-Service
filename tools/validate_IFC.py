import argparse
import ifcopenshell
from ifctester import ids, reporter

def main(source_ifc_path, source_ids_path, html_report_destination_path='IDS_validation_report.html', bcf_report_destination_path=None):
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

    # Initialize reporters
    console_reporter = reporter.Console(ids_file)
    html_reporter = reporter.Html(ids_file)

    # Only the JSON reporter object seems to have access to the status
    json_report = reporter.Json(ids_file)
    status = json_report.report()['status']

    # Report validation results for local file
    html_reporter.report()
    html_reporter.to_file(html_report_destination_path)

    # Initialize and report with BCF reporter if path is provided
    if bcf_report_destination_path:
        bcf_reporter = reporter.Bcf(ids_file)
        bcf_reporter.report()
        bcf_reporter.to_file(bcf_report_destination_path)

    # Check overall status and print success or failure message
    if status == True:
        print("IFC IDS control passed! The IFC model meets all IDS requirements.")
    else:
        # Report validation results for console
        console_reporter.report()
        print("IFC IDS control failed! The IFC model does not meet all IDS requirements.")
    print(f"The resulting report is available here: {html_report_destination_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IFC IDS Validation Script")
    parser.add_argument("source_ifc_path", help="Path to the IFC file", type=str)
    parser.add_argument("source_ids_path", help="Path to the IDS file", type=str)
    parser.add_argument("-r", "--html_report_destination_path", help="Path to save the HTML validation report", type=str, default='Ids_report.html')
    parser.add_argument("-b", "--bcf_report_destination_path", help="Path to save the BCF validation report (optional)", type=str, default=None)
    args = parser.parse_args()
    main(args.source_ifc_path, args.source_ids_path, args.html_report_destination_path, args.bcf_report_destination_path)
