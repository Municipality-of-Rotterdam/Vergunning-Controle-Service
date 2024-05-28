/* eslint-disable no-console */
import { exec } from "child_process";
import { promisify } from "util";
import { pipeline } from "stream";
import axios from "axios";
import os from "os";
import * as fs from "fs";

export async function executeCommand(command: string): Promise<void> {
  console.log(`${command}`);

  return new Promise((resolve, reject) => {
    const child = exec(command);

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });
    }

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command "${command}" exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Error executing the command: "${command}"\n\n${err}`));
    });
  });
}

export async function fileFromUrl(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data, "binary");
}

const pipelineAsync = promisify(pipeline);

export async function downloadFile(url: string, filePath: string): Promise<void> {
  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
    });

    await pipelineAsync(response.data, fs.createWriteStream(filePath));
    console.log(`Downloaded file to ${filePath}`);
  } catch (error) {
    await fs.promises.unlink(filePath);
    throw error;
  }
}
export async function unzipFile(filePath: string, toolsDir: string) {
  console.log("Unzipping file...");
  const platform = os.platform();
  if (platform == "win32") {
    await executeCommand(`Expand-Archive -Path "${filePath}" -DestinationPath "${toolsDir}"`);
  } else {
    await executeCommand(`unzip "${filePath}" -d "${toolsDir}"`);
  }
}

export function getCurrentDate(format: "US" | "EU" = "US"): string {
  const currentDate = new Date();
  let formattedDate: string;

  if (format === "US") {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const day = currentDate.getDate().toString().padStart(2, "0");
    formattedDate = `${year}-${month}-${day}`;
  } else {
    const day = currentDate.getDate().toString().padStart(2, "0");
    const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const year = currentDate.getFullYear();
    formattedDate = `${day}-${month}-${year}`;
  }

  return formattedDate;
}

export async function getRequest(url: string, headers: Headers): Promise<any> {
  const requestOptions: RequestInit = {
    method: "GET",
    headers,
  };
  return fetch(url, requestOptions);
}

export async function postRequest(url: string, headers: Headers, body: BodyInit): Promise<any> {
  const requestOptions: RequestInit = {
    method: "POST",
    headers,
    body,
  };
  return fetch(url, requestOptions);
}

export function checkAPIKey(typeAPI: "DSO Production API" | "DSO Pre-Production API" | "Ruitemlijke Plannen API") {
  if (typeAPI == "DSO Production API") {
    if (!process.env.DSO_Production_API_TOKEN)
      throw new Error(
        'DSO Production API is used but no API key was specified, for local development please create an `.env` file and add the API key as variable: "DSO_Production_API_TOKEN"',
      );
  }
  if (typeAPI == "DSO Pre-Production API") {
    if (!process.env.DSO_PreProduction_API_TOKEN)
      throw new Error(
        'DSO Pre-Production API is used but no API key was specified, for local development please create an `.env` file and add the API key as variable: "DSO_PreProduction_API_TOKEN"',
      );
  }
  if (typeAPI == "Ruitemlijke Plannen API") {
    if (!process.env.Ruimtelijke_plannen_aanvragen_API_TOKEN)
      throw new Error(
        'Ruimtelijke Plannen API is used but no API key was specified, for local development please create an `.env` file and add the API key as variable: "Ruimtelijke_plannen_aanvragen_API_TOKEN"',
      );
  } else {
    throw new Error(
      `Specified API type '${typeAPI}' is not supported. Please use: DSO Production API, DSO Pre-Production API, Ruitemlijke Plannen API`,
    );
  }
}

export function parsePolygonString(polygonString: string): number[][] {
  const regex = /POLYGON\s*\(\(\s*([^\)]+)\s*\)\)/;
  const match = polygonString.match(regex);

  if (!match || match.length < 2) {
    throw new Error("Invalid POLYGON string format");
  }

  const coordinatesString = match[1];
  const coordinatePairs = coordinatesString.split(",");

  const coordinates = coordinatePairs.map((pair) => {
    const [x, y] = pair.trim().split(/\s+/).map(Number);
    return [x, y];
  });

  return coordinates;
}
