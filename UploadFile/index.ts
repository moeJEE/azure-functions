import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";
import Busboy from 'busboy';

const httpTrigger: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    context.log("Azure Function triggered for file upload.");

    const connectionString: string = process.env.AzureWebJobsStorage || "";
    const containerName = "uploads";

    if (req.method === "OPTIONS") {
        context.res = {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        };
        return;
    }

    try {
        if (!connectionString) {
            throw new Error("Missing Azure Blob Storage connection string.");
        }

        // Create a promise to handle the file upload
        const fileUploadPromise = new Promise((resolve, reject) => {
            const busboy = Busboy({ headers: req.headers });
            let fileBuffer: Buffer | null = null;
            let fileName: string = '';
            let fileType: string = '';

            busboy.on('file', (fieldname: string, file: any, info: any) => {
                const chunks: Buffer[] = [];
                fileName = info.filename;
                fileType = info.mimeType;

                file.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                file.on('end', () => {
                    fileBuffer = Buffer.concat(chunks);
                });
            });

            busboy.on('finish', async () => {
                try {
                    if (!fileBuffer) {
                        reject(new Error('No file data received'));
                        return;
                    }

                    // Initialize BlobServiceClient
                    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
                    const containerClient = blobServiceClient.getContainerClient(containerName);

                    // Ensure container exists
                    await containerClient.createIfNotExists();

                    // Generate a unique blob name
                    const blobName = `${uuidv4()}-${fileName}`;

                    // Get a block blob client
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

                    // Upload the file
                    await blockBlobClient.uploadData(fileBuffer, {
                        blobHTTPHeaders: { blobContentType: fileType },
                    });

                    resolve({
                        url: blockBlobClient.url,
                        fileName: blobName,
                    });
                } catch (error) {
                    reject(error);
                }
            });

            busboy.on('error', (error: Error) => {
                reject(error);
            });

            // Pass the request body to busboy
            if (Buffer.isBuffer(req.body)) {
                busboy.end(req.body);
            } else if (typeof req.body === 'string') {
                busboy.end(Buffer.from(req.body));
            } else if (req.rawBody) {
                busboy.end(Buffer.from(req.rawBody));
            } else {
                reject(new Error('Invalid request body format'));
            }
        });

        const result = await fileUploadPromise;
        
        context.res = {
            status: 200,
            body: {
                message: "File uploaded successfully.",
                fileUrl: (result as any).url,
                fileName: (result as any).fileName,
            },
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        };

    } catch (error: unknown) {
        const serverError = error instanceof Error ? error : new Error('Unknown error');
        context.log.error("Error uploading file:", serverError);
        context.res = {
            status: 500,
            body: `Internal Server Error: ${serverError.message}`,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        };
    }
};

export default httpTrigger;