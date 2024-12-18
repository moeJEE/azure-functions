import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

// Utility function to set response headers with CORS
function setCORSResponse(
    context: Context,
    statusCode: number,
    body: any = null
): void {
    context.res = {
        status: statusCode,
        headers: {
            "Access-Control-Allow-Origin": "https://lemon-wave-08aa3ee0f.4.azurestaticapps.net", // Adjust for production
            "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Cache-Control, Authorization", // Include Cache-Control here
        },
        body: body,
    };
}


const chatHistories: AzureFunction = async function (
    context: Context,
    req: HttpRequest
): Promise<void> {
    const ALLOWED_ORIGIN = "https://lemon-wave-08aa3ee0f.4.azurestaticapps.net"; // Adjust for production

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        setCORSResponse(context, 204); // No content for OPTIONS preflight
        return;
    }

    const { userId } = req.params;

    if (!userId) {
        setCORSResponse(context, 400, { error: "User ID is required." });
        return;
    }

    // Initialize Cosmos DB Client using the connection string
    const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING;

    if (!cosmosConnectionString) {
        setCORSResponse(context, 500, {
            error: "Cosmos DB connection string is not configured.",
        });
        return;
    }

    try {
        const client = new CosmosClient(cosmosConnectionString);
        const database = client.database("DocumentProcessingDB");
        const chatHistoriesContainer = database.container("ChatHistories");

        // Handle GET request to fetch chat histories
        if (req.method === "GET") {
            const querySpec = {
                query: "SELECT c.id, c.title, c.created_at FROM c WHERE c.user_id = @userId ORDER BY c.created_at DESC",
                parameters: [{ name: "@userId", value: userId }],
            };

            const { resources } = await chatHistoriesContainer.items
                .query(querySpec)
                .fetchAll();

            context.log(
                `GET: Found ${resources.length} chat histories for userId: ${userId}`
            );

            setCORSResponse(
                context,
                200,
                resources.map((chat) => ({
                    id: chat.id,
                    title: chat.title,
                    created_at: chat.created_at,
                }))
            );
            return;
        }

        // Handle DELETE request to delete a specific chat history
        if (req.method === "DELETE") {
            const { chatId } = req.body || req.query;

            if (!chatId) {
                setCORSResponse(context, 400, {
                    error: "Chat ID is required for deletion.",
                });
                return;
            }

            await chatHistoriesContainer.item(chatId, userId).delete();

            setCORSResponse(context, 200, {
                message: `Chat history with ID ${chatId} has been deleted.`,
            });
            return;
        }

        // If the method is not allowed
        setCORSResponse(context, 405, { error: "Method Not Allowed." });
    } catch (error: any) {
        context.log.error("Error handling chat histories:", error.message);
        setCORSResponse(context, 500, {
            error: `An internal server error occurred: ${error.message}`,
        });
    }
};

export default chatHistories;
