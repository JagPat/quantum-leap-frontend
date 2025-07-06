
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, FileCode, Download } from "lucide-react";

const openApiSpec = `
openapi: 3.0.0
info:
  title: "AutoTrader AI - Broker Integration API"
  version: "1.0.0"
  description: "API specification for connecting the AutoTrader AI frontend to a backend service that interacts with the Kite Connect API."
servers:
  - url: "/api/broker"
    description: "Backend broker API endpoint"

paths:
  /generate-session:
    post:
      summary: "Generate Session Token"
      description: "Exchanges a request_token obtained from the Kite Connect OAuth flow for a valid access_token."
      tags:
        - "Authentication"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                api_key:
                  type: string
                  description: "User's Kite Connect API key."
                api_secret:
                  type: string
                  description: "User's Kite Connect API secret."
                request_token:
                  type: string
                  description: "Request token received from the successful OAuth callback."
              required:
                - api_key
                - api_secret
                - request_token
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
                  data:
                    type: object
                    properties:
                      access_token:
                        type: string
                      public_token:
                        type: string
                      user_id:
                        type: string
        '400':
          description: "Invalid request or token exchange failed."

  /profile:
    post:
      summary: "Get User Profile & Margins"
      description: "Verifies a connection by fetching the user's profile and margin information."
      tags:
        - "User Data"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                api_key:
                  type: string
                access_token:
                  type: string
              required:
                - api_key
                - access_token
      responses:
        '200':
          description: "Profile fetched successfully."
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
                      user_id:
                        type: string
                      user_name:
                        type: string
                      email:
                        type: string
                      equity:
                        type: object
                        properties:
                          available:
                            type: object
                            properties:
                              cash:
                                type: number
        '401':
          description: "Unauthorized. Invalid access token."

  /holdings:
    post:
      summary: "Get Holdings"
      description: "Fetches the user's long-term equity holdings."
      tags:
        - "Portfolio Data"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                api_key:
                  type: string
                access_token:
                  type: string
              required:
                - api_key
                - access_token
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
                    example: "success"
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        tradingsymbol:
                          type: string
                        exchange:
                          type: string
                        quantity:
                          type: number
                        average_price:
                          type: number
                        last_price:
                          type: number
                        pnl:
                          type: number
                        instrument_token:
                          type: string
        '401':
          description: "Unauthorized."

  /positions:
    post:
      summary: "Get Positions"
      description: "Fetches the user's current day (intraday and F&O) positions."
      tags:
        - "Portfolio Data"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                api_key:
                  type: string
                access_token:
                  type: string
              required:
                - api_key
                - access_token
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
                    example: "success"
                  data:
                    type: object
                    properties:
                      net:
                        type: array
                        items:
                          type: object
                      day:
                        type: array
                        items:
                          type: object
        '401':
          description: "Unauthorized."

  /margins:
    post:
      summary: "Get Margins"
      description: "Fetches the user's current margin details."
      tags:
        - "User Data"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                api_key:
                  type: string
                access_token:
                  type: string
              required:
                - api_key
                - access_token
      responses:
        '200':
          description: "Margins fetched successfully."
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
    a.download = 'autotrader-api-spec.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileCode className="w-6 h-6" />
              OpenAPI 3.0 Specification
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy YAML'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download YAML
              </Button>
            </div>
          </CardTitle>
          <p className="text-slate-600 pt-2">
            Use this specification to implement the backend services. This YAML can be imported into tools like Postman, Insomnia, or Cursor for code generation and testing.
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
