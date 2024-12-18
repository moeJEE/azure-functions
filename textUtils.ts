import axios from "axios";

export async function summarizeText(text: string, endpoint: string, apiKey: string): Promise<string> {
    const url = `${endpoint.replace(/\/+$/, "")}/language/analyze-text?api-version=2022-10-01-preview`;
    const headers = {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/json"
    };
    const payload = {
        analysisInput: { documents: [{ id: "1", language: "en", text }] }, // Adjust language to match content
        tasks: [{ kind: "ExtractiveSummarization", parameters: { sentenceCount: 3 } }]
    };

    try {
        console.log("Request URL:", url);
        console.log("Request Headers:", JSON.stringify(headers, null, 2));
        console.log("Request Payload:", JSON.stringify(payload, null, 2));

        const response = await axios.post(url, payload, { headers });
        console.log("Response Data:", JSON.stringify(response.data, null, 2));

        return response.data.results.documents[0].sentences.map((s: { text: string }) => s.text).join(" ");
    } catch (error: any) {
        console.error("Summarization Error:", JSON.stringify(error.response?.data || error.message, null, 2));
        if (error.response?.status === 404) {
            throw new Error(
                "Extractive Summarization is not enabled or supported in your Azure Text Analytics resource. Verify your configuration or use a Language service resource."
            );
        }
        throw new Error(`Error during text summarization: ${error.response?.data?.error?.message || error.message}`);
    }
}
