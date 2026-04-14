# opencode-crof-auth

CrofAI provider plugin for OpenCode - auth, model discovery

## Features

- **API Key Authentication** - Login with your CrofAI API key
- **Auto Model Discovery** - Models fetched dynamically from CrofAI API

## Quick Setup

Run the setup script to install everything automatically:

```bash
bunx opencode-crof-auth setup
```

This will:
1. Install the plugin via `opencode plugin`
2. Add the crofai provider to your opencode.json

## Manual Installation

If you prefer to do it step by step:

```bash
# 1. Install the plugin
opencode plugin opencode-crof-auth -g

# 2. Add the provider config to your opencode.json:
{
  "provider": {
    "crofai": {}
  }
}
```

## Usage

1. Run `opencode auth login crofai` (or /connect in OpenCode) and enter your API key (starts with `nahcrof_`)
2. Select a CrofAI model using `/models` or set `model: crofai/xxx` in your config
## Credits

- [Nahcrof](https://github.com/nahcrof) - For creating [CrofAI](https://crof.ai)

## License

MIT
