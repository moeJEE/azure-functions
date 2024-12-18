import { AzureFunction, Context } from "@azure/functions";
import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { ApiKeyCredentials } from "@azure/ms-rest-js";
import { CosmosClient } from "@azure/cosmos";

export const blobTrigger: AzureFunction = async function (context: Context, myBlob: Buffer): Promise<void> {
    const endpoint: string = process.env.COMPUTER_VISION_ENDPOINT || "";
    const apiKey: string = process.env.COMPUTER_VISION_KEY || "";
    const cosmosConnectionString: string = process.env.COSMOS_DB_CONNECTION_STRING || "";

    if (!endpoint || !apiKey || !cosmosConnectionString) {
        context.log.error("Missing environment variables.");
        return;
    }

    // Initialize Computer Vision Client
    const credentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': apiKey } });
    const computerVisionClient = new ComputerVisionClient(credentials, endpoint);

    // Initialize Cosmos DB Client
    const cosmosClient = new CosmosClient(cosmosConnectionString);
    const database = cosmosClient.database("DocumentProcessingDB");
    const container = database.container("Documents");

    try {
        // Start OCR process
        const result = await computerVisionClient.readInStream(myBlob, { language: "en", detectOrientation: true });
        const operation = result.operationLocation.split('/').pop();
        if (!operation) {
            throw new Error("Failed to retrieve operation ID from operation location.");
        }

        // Poll for OCR results
        let readResult = await computerVisionClient.getReadResult(operation);
        while (readResult.status === "running" || readResult.status === "notStarted") {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            readResult = await computerVisionClient.getReadResult(operation);
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
        await container.items.create(document);
        context.log(`Processed and stored document: ${document.id}`);
    } catch (error: any) {
        context.log.error("Error processing OCR:", error.message || error);
    }
};
