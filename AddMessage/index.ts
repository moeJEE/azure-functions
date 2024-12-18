import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const AddMessage: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
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

    const client = new CosmosClient(cosmosConnectionString);
    const database = client.database("DocumentProcessingDB");
    const messages = database.container("Messages");

    try {
        const newMessage = await messages.items.create({
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
    } catch (error: any) {
        context.log.error("Error adding message:", error.message);
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: `An error occurred: ${error.message}`
        };
    }
};

export default AddMessage;
