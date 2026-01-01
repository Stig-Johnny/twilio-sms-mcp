#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import twilio from "twilio";
import { readFileSync } from "fs";

// Load credentials from config file
const configPath = process.env.TWILIO_CONFIG_FILE;
let accountSid, authToken, phoneNumber, client;

try {
  if (configPath) {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    accountSid = config.accountSid;
    authToken = config.authToken;
    phoneNumber = config.phoneNumber;

    if (accountSid && authToken) {
      client = twilio(accountSid, authToken);
    }
  }
} catch (error) {
  console.error("Failed to load Twilio config:", error.message);
}

const server = new Server(
  {
    name: "twilio-sms-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_sms",
        description: "List recent SMS messages received on the Twilio number",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of messages to return (default: 10)",
            },
            from: {
              type: "string",
              description: "Filter by sender phone number (optional)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_latest_code",
        description: "Extract the latest 2FA/verification code from recent SMS messages",
        inputSchema: {
          type: "object",
          properties: {
            from: {
              type: "string",
              description: "Filter by sender (optional, e.g., 'Apple' or phone number)",
            },
            pattern: {
              type: "string",
              description: "Regex pattern to match code (default: 4-8 digit codes)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_sms",
        description: "Get a specific SMS message by its SID",
        inputSchema: {
          type: "object",
          properties: {
            sid: {
              type: "string",
              description: "The message SID",
            },
          },
          required: ["sid"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!client) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.",
        },
      ],
    };
  }

  try {
    switch (name) {
      case "list_sms": {
        const limit = args?.limit || 10;
        const filters = {
          to: phoneNumber,
          limit: limit,
        };

        if (args?.from) {
          filters.from = args.from;
        }

        const messages = await client.messages.list(filters);

        const result = messages.map((msg) => ({
          sid: msg.sid,
          from: msg.from,
          body: msg.body,
          dateSent: msg.dateSent?.toISOString(),
          status: msg.status,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_latest_code": {
        const filters = {
          to: phoneNumber,
          limit: 20,
        };

        if (args?.from) {
          filters.from = args.from;
        }

        const messages = await client.messages.list(filters);

        // Default pattern matches 4-8 digit codes
        const pattern = args?.pattern
          ? new RegExp(args.pattern)
          : /\b(\d{4,8})\b/;

        for (const msg of messages) {
          const match = msg.body?.match(pattern);
          if (match) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    code: match[1] || match[0],
                    from: msg.from,
                    body: msg.body,
                    dateSent: msg.dateSent?.toISOString(),
                  }, null, 2),
                },
              ],
            };
          }
        }

        return {
          content: [
            {
              type: "text",
              text: "No verification code found in recent messages.",
            },
          ],
        };
      }

      case "get_sms": {
        const message = await client.messages(args.sid).fetch();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                sid: message.sid,
                from: message.from,
                to: message.to,
                body: message.body,
                dateSent: message.dateSent?.toISOString(),
                status: message.status,
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Twilio SMS MCP server running on stdio");
}

main().catch(console.error);
