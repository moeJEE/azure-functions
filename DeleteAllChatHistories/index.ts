import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const deleteAllChatHistories: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
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

    const client = new CosmosClient(cosmosConnectionString);
    const database = client.database("DocumentProcessingDB");
    const container = database.container("ChatHistories");

    try {
        // Query to fetch all chat IDs
        const querySpec = {
            query: "SELECT c.id FROM c WHERE c.userId = @userId",
            parameters: [{ name: "@userId", value: userId }]
        };

        const { resources } = await container.items.query(querySpec).fetchAll();

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
                await container.item(item.id, userId).delete();
                deletionResults.push({ id: item.id, status: "Deleted" });
            } catch (error: any) {
                context.log.error(`Failed to delete item ${item.id}: ${error.message}`);
                deletionResults.push({ id: item.id, status: "Failed", error: error.message });
            }
        }

        // Verify consistency
        const remainingItems = await container.items.query({
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

    } catch (error: any) {
        context.log.error("Error deleting chat histories:", error.message);
        context.res = {
            status: 500,
            body: { error: `An error occurred: ${error.message}` },
            headers: { "Access-Control-Allow-Origin": "*" }
        };
    }
};

export default deleteAllChatHistories;