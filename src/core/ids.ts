import { readdir } from 'fs/promises'
import * as path from "path";
import { StepContext } from '@core/executeSteps.js'
import { Store as TriplyStore } from '@triplydb/data-factory'
import { GeoData } from '@verrijkingen/geoReference.js'

export type Validation = {}

export const idsValidatie = async (context: StepContext): Promise<Validation> => {

  const python = path.join(__dirname, "src", "tools", "validate_IFC.py");
  // return output as Validation
}

    // VCS IDS Validation
    if (idsFilePath) {
      try {
        await vcs.IFC.validateWithIds(idsFilePath);
      } catch (error) {
        console.error("Error during validation!");
      }
      console.info("Uploading IDS Validation Reports");

      // html
      try {
        const asset = await dataset.getAsset(reportName + ".html");
        await asset.delete();
      } catch (error) {}
      if (fs.existsSync(reportPathHtml)) {
        await dataset.uploadAsset(reportPathHtml, reportName + ".html");
      }

      // bfc
      try {
        const asset = await dataset.getAsset(reportName + ".bcf");
        await asset.delete();
      } catch (error) {}
      if (fs.existsSync(reportPathBcf)) {
        await dataset.uploadAsset(reportPathBcf, reportName + ".bcf");
      }
    }
    
    
        validateWithIds: async (idsFilePath: string | string[], ifcFilePath: string = this.ifcFilePath): Promise<void> => {
      const requirements = path.join("python", "requirements.txt");
      const dataDir = path.join("output");

      // Check if data directory exists
      if (!fs.existsSync(dataDir)) {
        await fs.promises.mkdir(dataDir);
      }
      if (typeof idsFilePath == "string") {
        idsFilePath = [idsFilePath];
      }

      for (let index = 0; index < idsFilePath.length; index++) {
        const ids = idsFilePath[index];
        const htmlReportDestinationPath = path.join("outputs", "IDSValidationReport.html");
        const bcfReportDestinationPath = path.join("outputs", "IDSValidationReport.bcf");
        await executeCommand(`python3 -m pip install -r ${requirements} --quiet`);
        try {
          await executeCommand(
            `python3 ${pythonScript} "${ifcFilePath}" "${idsFilePath}" -r "${htmlReportDestinationPath}" -b "${bcfReportDestinationPath}"`,
          );
        } catch (error) {
          throw error;
        }
      }
    },
  };
}
