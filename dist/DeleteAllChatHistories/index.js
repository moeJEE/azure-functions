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
const cosmos_1 = require("@azure/cosmos");
const deleteAllChatHistories = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.method === "OPTIONS") {
            context.res = {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
                body: null
            };
            return;
        }
        const { userId } = req.params;
        if (!userId) {
            context.res = {
                status: 400,
                body: { error: "User ID is required." },
                headers: { "Access-Control-Allow-Origin": "*" }
            };
            return;
        }
        const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING;
        if (!cosmosConnectionString) {
            context.res = {
                status: 500,
                body: { error: "Cosmos DB connection string is not configured." },
                headers: { "Access-Control-Allow-Origin": "*" }
            };
            return;
        }
        const client = new cosmos_1.CosmosClient(cosmosConnectionString);
        const database = client.database("DocumentProcessingDB");
        const container = database.container("ChatHistories");
        try {
            // Query to fetch all chat IDs
            const querySpec = {
                query: "SELECT c.id FROM c WHERE c.userId = @userId",
                parameters: [{ name: "@userId", value: userId }]
            };
            const { resources } = yield container.items.query(querySpec).fetchAll();
            if (resources.length === 0) {
                context.res = {
                    status: 200,
                    body: { message: `No chat histories found for user ${userId}.` },
                    headers: { "Access-Control-Allow-Origin": "*" }
                };
                return;
            }
            // Log items to delete
            context.log(`Deleting ${resources.length} chat histories for userId: ${userId}`);
            const deletionResults = [];
            for (const item of resources) {
                try {
                    // Explicitly include the partition key (userId) during deletion
                    yield container.item(item.id, userId).delete();
                    deletionResults.push({ id: item.id, status: "Deleted" });
                }
                catch (error) {
                    context.log.error(`Failed to delete item ${item.id}: ${error.message}`);
                    deletionResults.push({ id: item.id, status: "Failed", error: error.message });
                }
            }
            // Verify consistency
            const remainingItems = yield container.items.query({
                query: "SELECT c.id FROM c WHERE c.userId = @userId",
                parameters: [{ name: "@userId", value: userId }]
            }).fetchAll();
            context.log(`Remaining items after deletion: ${remainingItems.resources.length}`);
            context.res = {
                status: 200,
                body: {
                    message: remainingItems.resources.length === 0
                        ? "All chat histories deleted successfully."
                        : "Some chat histories could not be deleted.",
                    results: deletionResults,
                    remainingCount: remainingItems.resources.length
                },
                headers: { "Access-Control-Allow-Origin": "*" }
            };
        }
        catch (error) {
            context.log.error("Error deleting chat histories:", error.message);
            context.res = {
                status: 500,
                body: { error: `An error occurred: ${error.message}` },
                headers: { "Access-Control-Allow-Origin": "*" }
            };
        }
    });
};
exports.default = deleteAllChatHistories;
