# Twilio SMS MCP Server

MCP server for receiving SMS messages via Twilio API for Claude Code automation.

## Features

- List recent SMS messages received on your Twilio number
- Extract 2FA verification codes automatically
- Filter messages by sender
- Get specific messages by SID

## Prerequisites

1. [Twilio](https://www.twilio.com/) account
2. Twilio phone number with SMS capability
3. Account SID and Auth Token

## Installation

```bash
cd ~/.claude/mcp-servers/twilio-sms
npm install
```

## Configuration

Create a config file (e.g., `~/.claude/twilio-secrets.json`):

```json
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authToken": "your_auth_token",
  "phoneNumber": "+1234567890"
}
```

Set the config file path via environment variable:

```bash
export TWILIO_CONFIG_FILE="/path/to/twilio-secrets.json"
```

## MCP Configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "twilio-sms": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/.claude/mcp-servers/twilio-sms/index.js"],
      "env": {
        "TWILIO_CONFIG_FILE": "/path/to/twilio-secrets.json"
      }
    }
  }
}
```

## Tools

### `list_sms`

List recent SMS messages received on your Twilio number.

**Parameters:**
- `limit` (optional): Max messages to return (default: 10)
- `from` (optional): Filter by sender phone number

### `get_latest_code`

Extract the latest 2FA/verification code from recent messages.

**Parameters:**
- `from` (optional): Filter by sender
- `pattern` (optional): Custom regex pattern (default: 4-8 digit codes)

### `get_sms`

Get a specific SMS message by its SID.

**Parameters:**
- `sid` (required): The Twilio message SID

## Usage Example

```javascript
// Get latest verification code from Apple
get_latest_code({
  from: "Apple"
})
```

## Security

- Credentials are stored in external config file, not in code
- Config file should have restricted permissions (`chmod 600`)
- Never commit credentials to git

## License

MIT
