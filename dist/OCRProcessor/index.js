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
Object.defineProperty(exports, "__esModule", { value: true });
exports.blobTrigger = void 0;
const cognitiveservices_computervision_1 = require("@azure/cognitiveservices-computervision");
const ms_rest_js_1 = require("@azure/ms-rest-js");
const cosmos_1 = require("@azure/cosmos");
const blobTrigger = function (context, myBlob) {
    return __awaiter(this, void 0, void 0, function* () {
        const endpoint = process.env.COMPUTER_VISION_ENDPOINT || "";
        const apiKey = process.env.COMPUTER_VISION_KEY || "";
        const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING || "";
        if (!endpoint || !apiKey || !cosmosConnectionString) {
            context.log.error("Missing environment variables.");
            return;
        }
        // Initialize Computer Vision Client
        const credentials = new ms_rest_js_1.ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': apiKey } });
        const computerVisionClient = new cognitiveservices_computervision_1.ComputerVisionClient(credentials, endpoint);
        // Initialize Cosmos DB Client
        const cosmosClient = new cosmos_1.CosmosClient(cosmosConnectionString);
        const database = cosmosClient.database("DocumentProcessingDB");
        const container = database.container("Documents");
        try {
            // Start OCR process
            const result = yield computerVisionClient.readInStream(myBlob, { language: "en", detectOrientation: true });
            const operation = result.operationLocation.split('/').pop();
            if (!operation) {
                throw new Error("Failed to retrieve operation ID from operation location.");
            }
            // Poll for OCR results
            let readResult = yield computerVisionClient.getReadResult(operation);
            while (readResult.status === "running" || readResult.status === "notStarted") {
                yield new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
                readResult = yield computerVisionClient.getReadResult(operation);
            }
            let extractedText = "";
            if (readResult.status === "succeeded" && readResult.analyzeResult) {
                readResult.analyzeResult.readResults.forEach(page => {
                    page.lines.forEach(line => {
                        extractedText += line.text + "\n";
                    });
                });
            }
            if (!extractedText) {
                context.log.warn("No text extracted from the document.");
            }
            // Prepare document for Cosmos DB
            const document = {
                id: context.bindingData.name, // Use blob name as ID
                text: extractedText,
                timestamp: new Date().toISOString()
            };
            // Store the extracted text in Cosmos DB
            yield container.items.create(document);
            context.log(`Processed and stored document: ${document.id}`);
        }
        catch (error) {
            context.log.error("Error processing OCR:", error.message || error);
        }
    });
};
exports.blobTrigger = blobTrigger;
