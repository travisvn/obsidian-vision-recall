# Setting up Ollama for Obsidian Vision Recall Plugin

This guide will walk you through setting up Ollama on your computer and configuring it to work with the Vision Recall plugin.

## Installing Ollama

1. Visit the [Ollama website](https://ollama.com) and download the installer for your operating system:

   - macOS (Apple Silicon or Intel)
   - Linux
   - Windows

2. Follow the installation instructions for your system:
   - **macOS**: Open the downloaded file and drag Ollama to your Applications folder
   - **Linux**: Run the install script
   - **Windows**: Run the installer

## Starting Ollama

1. **macOS & Linux**:
   - Open Terminal
   - Run `ollama serve`
2. **Windows**:
   - Ollama should start automatically as a service
   - You can verify it's running by opening Command Prompt and typing `ollama serve`

## Pulling a Vision Model

1. Find the model you want to run (and that your system can handle) from the [Ollama search](https://ollama.com/search?c=vision)
2. Open a new terminal window (while keeping Ollama running in the first one)
3. Run the following command, for example:
   ```bash
   ollama pull llama3.2-vision:11b
   ```
   This will download the Llama 3.2 Vision model, which is capable of processing both text and images.

> Note: The initial download may take several minutes depending on your internet connection.

## Configuring the Vision Recall Plugin

1. Open Obsidian and go to Settings
2. Click on "Vision Recall" in the left sidebar
3. Under "LLM settings":

   - Set "LLM provider" to "Ollama"
   - Set "API base URL" to: `http://localhost:11434`
   - Set "Vision model name" to the name of the model you pulled (e.g., `llama3.2-vision:11b`)
   - Set "Endpoint LLM model name" to the same model name (e.g., `llama3.2-vision:11b`) or another one. Note that it may be beneficial to use the same model as the vision model due to system resource allocation.

## Verifying the Setup

To verify everything is working:

1. Click the icon in the ribbon menu to open Vision Recall
2. Click the `Test Config` button
3. In the modal, click the `Test Connection — Retrieve Models`
4. If models load in the modal below, you're good to go!

## Troubleshooting

If you encounter issues:

1. Ensure Ollama is running by opening a terminal and running:

   ```bash
   ollama ps
   ```

2. Check that the base URL is correct in your plugin settings

3. Verify your model was downloaded successfully:

   ```bash
   ollama list
   ```

4. If you get connection errors, ensure no firewall is blocking port 11434

For additional help, visit the [Ollama documentation](https://github.com/ollama/ollama) or the plugin's GitHub issues page.
