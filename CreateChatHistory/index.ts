import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const CreateChatHistory: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
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

    const client = new CosmosClient(cosmosConnectionString);
    const database = client.database("DocumentProcessingDB");
    const chatHistories = database.container("ChatHistories");

    try {
        const newChat = await chatHistories.items.create({
            user_id,
            title,
            created_at: new Date().toISOString()
        });

        const chatId = newChat.resource?.id;

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
    } catch (error: any) {
        context.log.error("Error creating chat history:", error.message);
        context.res = {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*" // Replace '*' with specific origin in production
            },
            body: `An error occurred: ${error.message}`
        };
    }
};

export default CreateChatHistory;
