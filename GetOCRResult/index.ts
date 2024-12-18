import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

export const getOCRResult: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
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
    const client = new CosmosClient(cosmosConnectionString);

    const database = client.database("DocumentProcessingDB");
    const container = database.container("Documents");

    context.log("Step 4: Querying Cosmos DB...");
    const { resources } = await container.items
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
  } catch (error: any) {
    context.log.error("Step 6: Error occurred during Function Execution:", error.message);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: `An error occurred: ${error.message}`,
    };
  }
};
