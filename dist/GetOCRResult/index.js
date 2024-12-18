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
exports.getOCRResult = void 0;
const cosmos_1 = require("@azure/cosmos");
const getOCRResult = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log("Step 1: Starting Function Execution");
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };
        // Gérer les requêtes OPTIONS pour CORS preflight
        if (req.method === "OPTIONS") {
            context.res = {
                status: 204,
                headers: corsHeaders,
            };
            return;
        }
        const id = req.query.id || (req.body && req.body.id);
        if (!id) {
            context.log.error("No ID provided in query or request body.");
            context.res = {
                status: 400,
                headers: corsHeaders,
                body: "Please provide a document ID as a query parameter or in the request body.",
            };
            return;
        }
        context.log("Step 2: Received request with ID:", id);
        try {
            const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING;
            if (!cosmosConnectionString) {
                throw new Error("COSMOS_DB_CONNECTION_STRING is not configured.");
            }
            context.log("Step 3: Connecting to Cosmos DB...");
            const client = new cosmos_1.CosmosClient(cosmosConnectionString);
            const database = client.database("DocumentProcessingDB");
            const container = database.container("Documents");
            context.log("Step 4: Querying Cosmos DB...");
            const { resources } = yield container.items
                .query({
                query: "SELECT * FROM c WHERE c.id = @id",
                parameters: [{ name: "@id", value: id }],
            })
                .fetchAll();
            if (resources.length === 0) {
                context.log.error(`Document with ID '${id}' not found.`);
                context.res = {
                    status: 404,
                    headers: corsHeaders,
                    body: `Document with ID '${id}' not found.`,
                };
                return;
            }
            context.log("Step 5: Successfully retrieved document from Cosmos DB.");
            const document = resources[0];
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: document,
            };
        }
        catch (error) {
            context.log.error("Step 6: Error occurred during Function Execution:", error.message);
            context.res = {
                status: 500,
                headers: corsHeaders,
                body: `An error occurred: ${error.message}`,
            };
        }
    });
};
exports.getOCRResult = getOCRResult;
