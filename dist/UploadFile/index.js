"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storage_blob_1 = require("@azure/storage-blob");
const uuid_1 = require("uuid");
const busboy_1 = __importDefault(require("busboy"));
const httpTrigger = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log("Azure Function triggered for file upload.");
        const connectionString = process.env.AzureWebJobsStorage || "";
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
                const busboy = (0, busboy_1.default)({ headers: req.headers });
                let fileBuffer = null;
                let fileName = '';
                let fileType = '';
                busboy.on('file', (fieldname, file, info) => {
                    const chunks = [];
                    fileName = info.filename;
                    fileType = info.mimeType;
                    file.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    file.on('end', () => {
                        fileBuffer = Buffer.concat(chunks);
                    });
                });
                busboy.on('finish', () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!fileBuffer) {
                            reject(new Error('No file data received'));
                            return;
                        }
                        // Initialize BlobServiceClient
                        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
                        const containerClient = blobServiceClient.getContainerClient(containerName);
                        // Ensure container exists
                        yield containerClient.createIfNotExists();
                        // Generate a unique blob name
                        const blobName = `${(0, uuid_1.v4)()}-${fileName}`;
                        // Get a block blob client
                        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                        // Upload the file
                        yield blockBlobClient.uploadData(fileBuffer, {
                            blobHTTPHeaders: { blobContentType: fileType },
                        });
                        resolve({
                            url: blockBlobClient.url,
                            fileName: blobName,
                        });
                    }
                    catch (error) {
                        reject(error);
                    }
                }));
                busboy.on('error', (error) => {
                    reject(error);
                });
                // Pass the request body to busboy
                if (Buffer.isBuffer(req.body)) {
                    busboy.end(req.body);
                }
                else if (typeof req.body === 'string') {
                    busboy.end(Buffer.from(req.body));
                }
                else if (req.rawBody) {
                    busboy.end(Buffer.from(req.rawBody));
                }
                else {
                    reject(new Error('Invalid request body format'));
                }
            });
            const result = yield fileUploadPromise;
            context.res = {
                status: 200,
                body: {
                    message: "File uploaded successfully.",
                    fileUrl: result.url,
                    fileName: result.fileName,
                },
                headers: {
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }
        catch (error) {
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
    });
};
exports.default = httpTrigger;
