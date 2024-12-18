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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeText = summarizeText;
const axios_1 = __importDefault(require("axios"));
function summarizeText(text, endpoint, apiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
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
            const response = yield axios_1.default.post(url, payload, { headers });
            console.log("Response Data:", JSON.stringify(response.data, null, 2));
            return response.data.results.documents[0].sentences.map((s) => s.text).join(" ");
        }
        catch (error) {
            console.error("Summarization Error:", JSON.stringify(((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message, null, 2));
            if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 404) {
                throw new Error("Extractive Summarization is not enabled or supported in your Azure Text Analytics resource. Verify your configuration or use a Language service resource.");
            }
            throw new Error(`Error during text summarization: ${((_e = (_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.error) === null || _e === void 0 ? void 0 : _e.message) || error.message}`);
        }
    });
}
