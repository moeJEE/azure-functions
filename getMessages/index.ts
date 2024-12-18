import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const GetMessages: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
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

    const client = new CosmosClient(cosmosConnectionString);
    const database = client.database("DocumentProcessingDB");
    const messages = database.container("Messages");

    try {
        const querySpec = {
            query: "SELECT m.content, m.is_user, m.timestamp FROM m WHERE m.chat_id = @chatId ORDER BY m.timestamp ASC",
            parameters: [
                { name: "@chatId", value: chatId }
            ]
        };

        const { resources } = await messages.items.query(querySpec).fetchAll();

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
    } catch (error: any) {
        context.log.error("Error fetching messages:", error.message);
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: { error: `An error occurred: ${error.message}` }
        };
    }
};

export default GetMessages;
