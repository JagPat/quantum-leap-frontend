import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, FileCode, Download } from "lucide-react";

const openApiSpec = `
openapi: 3.0.0
info:
  title: "QuantumLeap Trading - Backend API"
  version: "1.0.0"
  description: "API specification for the backend service that connects to a broker (e.g., Kite Connect) and powers the QuantumLeap Trading frontend."
servers:
  - url: "https://your-backend-url.com"
    description: "Replace with your actual backend server URL"

paths:
  /api/broker/generate-session:
    post:
      summary: "Generate Broker Session"
      description: "Exchanges a request_token from the broker's OAuth flow for a valid access_token and stores it securely for the user."
      tags:
        - "Broker Authentication"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                request_token:
                  type: string
                  description: "The one-time request token from the broker's successful login redirect."
                user_id:
                  type: string
                  description: "The unique ID of the user from the frontend."
                api_key:
                  type: string
                  description: "The user's broker API key."
                api_secret:
                  type: string
                  description: "The user's broker API secret."
              required:
                - request_token
                - user_id
                - api_key
                - api_secret
      responses:
        '200':
          description: "Session generated successfully."
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "success"
                  message:
                    type: string
                    example: "Broker connected successfully."
                  data:
                    type: object
                    properties:
                      user_id:
                        type: string
                      user_name:
                        type: string
                      email:
                        type: string
        '400':
          description: "Invalid request or token exchange failed."
        '500':
          description: "Internal server error."

  /api/portfolio/summary:
    get:
      summary: "Get Portfolio Summary"
      description: "Fetches a high-level summary of the user's portfolio, including P&L."
      tags:
        - "Portfolio Data"
      parameters:
        - in: query
          name: user_id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: "Summary fetched successfully."
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: 
                    type: string
                    example: "success"
                  data:
                    type: object
                    properties:
                      total_value:
                        type: number
                      total_pnl:
                        type: number
                      todays_pnl:
                        type: number
        '401':
          description: "Unauthorized or broker not connected."

  /api/portfolio/holdings:
    get:
      summary: "Get Holdings"
      description: "Fetches the user's long-term equity holdings from the broker."
      tags:
        - "Portfolio Data"
      parameters:
        - in: query
          name: user_id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: "Holdings fetched successfully."
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        symbol:
                          type: string
                        quantity:
                          type: number
                        avg_price:
                          type: number
                        current_price:
                          type: number
                        pnl:
                          type: number
        '401':
          description: "Unauthorized."

  /api/portfolio/positions:
    get:
      summary: "Get Positions"
      description: "Fetches the user's current day (intraday and F&O) positions from the broker."
      tags:
        - "Portfolio Data"
      parameters:
        - in: query
          name: user_id
          required: true
          schema:
            type: string
      responses:
        '200':
          description: "Positions fetched successfully."
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  data:
                    type: object # The structure can be complex (net/day), so keeping it flexible
        '401':
          description: "Unauthorized."
`;

export default function OpenAPISpec() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(openApiSpec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([openApiSpec], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quantumleap-api-spec.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="bg-slate-800/50 border-white/10 text-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileCode className="w-6 h-6 text-amber-400" />
              Backend API Specification
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">
                {copied ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Spec'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">
                <Download className="w-4 h-4 mr-2" />
                Download Spec
              </Button>
            </div>
          </CardTitle>
          <p className="text-slate-400 pt-2">
            Provide this specification to your backend developer or AI (like Cursor) to build the required API endpoints.
          </p>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-sm overflow-x-auto">
            <code>
              {openApiSpec}
            </code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}