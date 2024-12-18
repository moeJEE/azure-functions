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
const AddMessage = function (context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*", // Replace '*' with your frontend origin in production
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };
        // Handle CORS preflight request
        if (req.method === "OPTIONS") {
            context.res = {
                status: 204,
                headers: corsHeaders,
            };
            return;
        }
        const { chat_id, user_id, content, is_user } = req.body;
        if (!chat_id || !user_id || !content || is_user === undefined) {
            context.res = {
                status: 400,
                headers: corsHeaders,
                body: "chat_id, user_id, content, and is_user are required."
            };
            return;
        }
        const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING;
        if (!cosmosConnectionString) {
            context.res = {
                status: 500,
                headers: corsHeaders,
                body: "Cosmos DB connection string is not configured."
            };
            return;
        }
        const client = new cosmos_1.CosmosClient(cosmosConnectionString);
        const database = client.database("DocumentProcessingDB");
        const messages = database.container("Messages");
        try {
            const newMessage = yield messages.items.create({
                chat_id,
                user_id,
                content,
                is_user,
                timestamp: new Date().toISOString()
            });
            context.res = {
                status: 201,
                headers: corsHeaders,
                body: { message: "Message added successfully." }
            };
        }
        catch (error) {
            context.log.error("Error adding message:", error.message);
            context.res = {
                status: 500,
                headers: corsHeaders,
                body: `An error occurred: ${error.message}`
            };
        }
    });
};
exports.default = AddMessage;
