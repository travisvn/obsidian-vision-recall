# API Key Setup for Screenshot AI (Obsidian Plugin)

This guide will help you obtain API keys from supported providers and configure them for use with the Screenshot AI Obsidian plugin.

[Free Text & Image LLMs on OpenRouter](https://openrouter.ai/models?max_price=0&modality=text%2Bimage-%3Etext)

## 1. Choosing Your AI Models

To process screenshots effectively, the plugin requires:

- **A vision model**: Used to extract and analyze image content.
- **A regular LLM model**: Used for text-based queries and reasoning. This model may also support vision (i.e., multimodal models like `gpt-4o`, `gpt-4o-mini`, etc.).

You can use the same model for both tasks or specify separate models.

## 2. Obtaining an API Key

### OpenAI

1. Visit [OpenAI's API page](https://platform.openai.com/signup/).
2. Sign in or create an account.
3. Go to [API Keys](https://platform.openai.com/api-keys) and generate a new key.
4. Copy your API key and store it securely.

### OpenRouter (Alternative API Gateway)

[OpenRouter](https://openrouter.ai/) provides a unified API to access multiple models from different providers.

1. Go to [OpenRouter's API page](https://openrouter.ai/).
2. Sign in or create an account.
3. Navigate to the API keys section and generate a key.
4. Copy the API key and store it securely.

## 3. Configuring the Plugin

Once you have obtained an API key, you need to configure it within the plugin settings.

### Setting Up API Keys

In Obsidian:

1. Open **Settings**.
2. Navigate to **Screenshot AI**.
3. Locate the **API Key** field and enter your key.

### Specifying Models

You need to define:

- **Vision Model**: A model capable of processing images (e.g., `gpt-4o`, `gpt-4o-mini`, `openrouter/llava`).
- **LLM Model**: A text model for answering queries (e.g., `gpt-4o`, `gpt-4o-mini`, `mistral`, `claude-3`).

## 4. Notes on API Usage & Limits

- OpenAI and OpenRouter have different pricing structures. Check their respective pricing pages.
- OpenRouter allows routing requests to different providers.
- Ensure your API key has sufficient quota to avoid service interruptions.

For troubleshooting, refer to the **Obsidian Console** (`Ctrl+Shift+I` on Windows/Linux, `Cmd+Option+I` on macOS) to check for API-related errors.

---

For further assistance, visit our [GitHub Discussions](https://github.com/travisvn/obsidian-vision-recall/discussions) page to post a question or view the plugin documentation.
