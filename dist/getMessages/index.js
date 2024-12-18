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
const GetMessages = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*", // Replace '*' with specific origin in production
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };
        // Handle CORS preflight request
        if (req.method === "OPTIONS") {
            context.res = {
                status: 204,
                headers: corsHeaders,
                body: null
            };
            return;
        }
        const { chatId } = req.params;
        if (!chatId) {
            context.res = {
                status: 400,
                headers: corsHeaders,
                body: { error: "Chat ID is required." }
            };
            return;
        }
        const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING;
        if (!cosmosConnectionString) {
            context.res = {
                status: 500,
                headers: corsHeaders,
                body: { error: "Cosmos DB connection string is not configured." }
            };
            return;
        }
        const client = new cosmos_1.CosmosClient(cosmosConnectionString);
        const database = client.database("DocumentProcessingDB");
        const messages = database.container("Messages");
        try {
            const querySpec = {
                query: "SELECT m.content, m.is_user, m.timestamp FROM m WHERE m.chat_id = @chatId ORDER BY m.timestamp ASC",
                parameters: [
                    { name: "@chatId", value: chatId }
                ]
            };
            const { resources } = yield messages.items.query(querySpec).fetchAll();
            const formattedMessages = resources.map(msg => ({
                text: msg.content,
                sender: msg.is_user ? 'user' : 'bot',
                timestamp: msg.timestamp
            }));
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: { messages: formattedMessages }
            };
        }
        catch (error) {
            context.log.error("Error fetching messages:", error.message);
            context.res = {
                status: 500,
                headers: corsHeaders,
                body: { error: `An error occurred: ${error.message}` }
            };
        }
    });
};
exports.default = GetMessages;
