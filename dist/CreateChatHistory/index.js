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
const CreateChatHistory = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (req.method === "OPTIONS") {
            // Handle CORS preflight
            context.res = {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*", // Replace '*' with specific origin in production
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
                body: null
            };
            return;
        }
        const { user_id, title } = req.body;
        if (!user_id || !title) {
            context.res = {
                status: 400,
                body: "user_id and title are required."
            };
            return;
        }
        const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING;
        if (!cosmosConnectionString) {
            context.res = {
                status: 500,
                body: "Cosmos DB connection string is not configured."
            };
            return;
        }
        const client = new cosmos_1.CosmosClient(cosmosConnectionString);
        const database = client.database("DocumentProcessingDB");
        const chatHistories = database.container("ChatHistories");
        try {
            const newChat = yield chatHistories.items.create({
                user_id,
                title,
                created_at: new Date().toISOString()
            });
            const chatId = (_a = newChat.resource) === null || _a === void 0 ? void 0 : _a.id;
            if (!chatId) {
                context.res = {
                    status: 500,
                    body: "Failed to create chat history."
                };
                return;
            }
            context.res = {
                status: 201,
                headers: {
                    "Access-Control-Allow-Origin": "*" // Replace '*' with specific origin in production
                },
                body: { chat_id: chatId }
            };
        }
        catch (error) {
            context.log.error("Error creating chat history:", error.message);
            context.res = {
                status: 500,
                headers: {
                    "Access-Control-Allow-Origin": "*" // Replace '*' with specific origin in production
                },
                body: `An error occurred: ${error.message}`
            };
        }
    });
};
exports.default = CreateChatHistory;
