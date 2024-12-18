# Document Processing Function

An Azure Functions project that processes documents using OCR and stores the results in Cosmos DB.

## Features

- **Blob Trigger:** Automatically processes uploaded documents to Azure Blob Storage.
- **OCR Processing:** Extracts text from images/PDFs using Azure Computer Vision.
- **Data Storage:** Stores extracted text in Azure Cosmos DB.
- **HTTP API:** Retrieves OCR results via an HTTP endpoint.

## Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/document-processing-function.git
   cd document-processing-function
