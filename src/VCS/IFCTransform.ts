/* eslint-disable no-console */
import os from "os";
import * as fsp from "fs/promises";
import { writeJsonSync } from "fs-extra/esm";
import * as fs from "fs";
import * as AdmZip from "adm-zip";
import * as path from "path";
import gltfPipeline from "gltf-pipeline";
import { downloadFile, executeCommand } from "./helperFunctions.js";
import { __dirname } from "./VcsClass.js";
import { promisify } from "util";

const { glbToGltf } = gltfPipeline;

export class IFCTransform {
  private ifcFilePath: string | undefined;
  constructor(ifcFilePath: string) {
    this.ifcFilePath = ifcFilePath;
    //Check if ifc file exists
    if (!fs.existsSync(ifcFilePath)) {
      throw new Error(
        `Could not find IFC file, The IFC file path: '${ifcFilePath}' is incorrect.`
      );
    }

    // check if python is installed
    async () => {
      try {
        // Check if Python is installed
        await executeCommand("python3 --version");
      } catch (error) {
        throw new Error(
          "Python does not seem to be installed, please install python."
        );
      }
    };
  }
  private getOperatingSystem(): string {
    const platform = os.platform();
    const arch = os.arch();

    switch (platform) {
      case "darwin":
        if (arch === "arm64" && os.platform() === "darwin") {
          return "MacOS M1 64bit";
        } else {
          return "MacOS 64bit";
        }
      case "win32":
        if (arch === "x64") {
          return "Windows 64bit";
        } else {
          return "Windows 32bit";
        }
      case "linux":
        if (arch === "x64") {
          return "Linux 64bit";
        }
      default:
        throw new Error(
          `Operating System not recognized! Got platform: ${platform}, with architecture: ${arch}`
        );
    }
  }

  private async downloadAndUnzip(
    url: string,
    targetDir: string = "tools"
  ): Promise<void> {
    // Create ./tools directory if it doesn't exist
    const toolsDir = path.join(__dirname, targetDir);
    const filePath = path.join(toolsDir, "IfcConvert.zip");
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir);
    }

    // Download the file
    await downloadFile(url, filePath);

    // Unzip the downloaded file
    const zip = new AdmZip.default(filePath);
    // BUG behaviour of unzipping not consitent! 
    const extractZip = promisify(zip.extractAllToAsync)
    await extractZip(toolsDir, true, true); // true to overwrite existing files


    // Remove the downloaded zip file
    await fsp.unlink(filePath);

    console.log(`Downloaded IfcConvert to ${toolsDir}`);
  }

  /**
   * @param inputFilePath input file path of IFC file - defaults to given class constructor argument for IFCTransform
   * @param outputFilePath output file path of IFC-OWL file - defaults to "data" directory with file name "ifcOwlData.ttl"
   * @param baseURI base URI used in RDF file
   *
   * WANRING: We use https://github.com/pipauwel/IFCtoRDF - but this repository is archived and no longer updated
   * If there is a preference for LBD ontology, the https://github.com/jyrkioraskari/IFCtoLBD tool should be used instead (this repository is actively maintained)
   *
   * Note the usage if IFCtoRDF is memory intensive!
   */
  async IFCtoIFCOWL(
    baseURI: string,
    inputFilePath: string = this.ifcFilePath!,
    outputFilePath: string = path.join(__dirname, "data", "ifcOwlData.ttl")
  ) {
    const toolsDir = path.join(__dirname, "tools");
    const dataDir = path.join(__dirname, "data");
    const url = "https://github.com/pipauwel/IFCtoRDF/releases/download/IFCtoRDF-0.4/IFCtoRDF-0.4-shaded.jar";
    const fileName = url.split("/").pop();
    const filePath = path.join(toolsDir, fileName!);
    // Check if tools directory exists
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir);
    }
    //Check if data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    // Check if Java is installed
    try {
      await executeCommand("java --version");
    } catch (error) {
      throw new Error(`Error checking Java installation:\n${error}`);
    }
    // Check if Java jar is present in tool directory
    if (!fs.existsSync(filePath)) {
      console.log(
        "Java tool not present in tools directory, downloading tool..."
      );
      try {
        await downloadFile(url, filePath);
        console.log(`Downloaded IFCtoRDF jar to ${filePath}`);
      } catch (error) {
        throw new Error(`Error downloading jar: ${error}`);
      }
    }

    // Running script
    try {
      await executeCommand(
        `java -jar "${filePath}" --baseURI "${baseURI}" "${inputFilePath}" "${outputFilePath}"`
      );
    } catch (error) {
      console.error("Error running Java command:", error);
    }
  }

  async IFCtoGLTF() {
    // Manual page: https://docs.ifcopenshell.org/ifcconvert/usage.html
    const toolsDir = path.join(__dirname, "tools");
    const ifcConverterPath = path.join(toolsDir, "IfcConvert");
    // Transform IFC to GLB
    if (!fs.existsSync(ifcConverterPath)) {
      // If package is not installed, install it
      console.log("Installing IfcConverter...");
      const operatingSystem = this.getOperatingSystem();
      let downloadUrl: string;
      switch (operatingSystem) {
        case "MacOS M1 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-macosm164.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "MacOS 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-macos64.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "Windows 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-win64.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "Windows 32bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-win32.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        case "Linux 64bit":
          downloadUrl =
            "https://s3.amazonaws.com/ifcopenshell-builds/IfcConvert-v0.7.0-f7c03db-linux64.zip";
          await this.downloadAndUnzip(downloadUrl);
          return;
        default:
          break;
      }
    }
    // Run IfcConverter tool to create GLB data from IFC data
    const dataDir = path.join(__dirname, "data");
    const glbFilePath = path.join(dataDir, "output.glb");
    const gltfFilePath = path.join(dataDir, "output.gltf");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    // remove glb file if it exists already
    if (fs.existsSync(glbFilePath)) {
      await fsp.unlink(glbFilePath);
    }
    // remove gltf file if it exists already
    if (fs.existsSync(gltfFilePath)) {
      await fsp.unlink(gltfFilePath);
    }

    // Run IfcConvert script to create GLB file
    try {
      await executeCommand(`chmod u+x ${ifcConverterPath}`);
      await executeCommand(
        `${ifcConverterPath} "${this.ifcFilePath!}" "${glbFilePath}"`
      );
    } catch (error) {
      throw error;
    }

    // Transform GLB to GLTF
    if (!fs.existsSync(glbFilePath)) {
      throw new Error("GLB file was not created!");
    }

    const glb = fs.readFileSync(glbFilePath);

    const results = await glbToGltf(glb);

    writeJsonSync(gltfFilePath, results.gltf);
    // Remove GLB file
    await fsp.unlink(glbFilePath);
  }

  async extractFootprint(
    ifcFilePath: string = this.ifcFilePath!,
    outputFilePath: string = path.join(__dirname, "data", "footprint.txt")
  ) {
    const pythonScriptPath = path.join(
      __dirname,
      "python",
      "footprint_approx.py"
    );
    const requirements = path.join(__dirname, "python", "requirements.txt");
    try {
      await executeCommand(`pip install -r ${requirements} --quiet`);
      await executeCommand(
        `python3 ${pythonScriptPath} -ifc_file "${ifcFilePath}" -o "${outputFilePath}"`
      );
    } catch (error) {
      throw error;
    }
  }

  async extractWKTCoordinates(
    ifcFilePath: string = this.ifcFilePath!,
    outputFilePath: string = path.join(
      __dirname,
      "data",
      "extracted_coordinates.csv"
    )
  ) {
    const pythonScriptPath = path.join(__dirname, "python", "Cartesian2Csv.py");
    const requirements = path.join(__dirname, "python", "requirements.txt");

    try {
      await executeCommand(`pip install -r ${requirements} --quiet`);
      await executeCommand(
        `python3 ${pythonScriptPath} -ifc_file "${ifcFilePath}" -o "${outputFilePath}"`
      );
    } catch (error) {
      throw error;
    }
  }
}
