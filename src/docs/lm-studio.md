# Using LM Studio with Obsidian Vision Recall

This guide will walk you through setting up LM Studio as your local LLM provider for the Obsidian Vision Recall plugin. LM Studio provides a user-friendly way to run powerful vision-capable language models locally on your computer.

## Why Choose LM Studio?

- **Privacy**: Your screenshots and data stay on your local machine
- **No API Costs**: Avoid OpenAI API fees
- **Customization**: Choose from a variety of open-source vision models
- **User-Friendly**: Simple interface for downloading and running models
- **Performance**: Optimized for running models on consumer hardware

## Installing LM Studio

1. Visit the [LM Studio website](https://lmstudio.ai/) and download the installer for your operating system:

   - macOS (Apple Silicon or Intel)
   - Windows
   - Linux

2. Follow the installation instructions for your system:
   - **macOS**: Open the downloaded file and drag LM Studio to your Applications folder
   - **Windows**: Run the installer
   - **Linux**: Follow the installation instructions provided

## Setting Up LM Studio

1. **Launch LM Studio** from your applications folder or start menu

2. **Download a Vision-Capable Model**:

   - Click on the "Browse Models" tab
   - Filter for models with vision capabilities (look for models with "vision" in their name)
   - Recommended models:
     - `LLama 3.2 Vision` (11b)
   - Click "Download" on your chosen model

3. **Download a Text Embedding Model**:

   - Similar to the above instructions
   - Recommended models:
     - `nomic-embed-text`

4. **Start the Local Server**:
   - Click on the bottom tab to switch to `Power User` or `Developer`
   - Then, in the left sidebar, select the `Developer` option (probably an icon of a terminal)
   - Configure the settings
     - Enable all the options there, most likely
     - (Serve on Local Network, Enable CORS, Just-in-Time Model Loading)
   - (Optional) Select your downloaded vision model from the dropdown
     - Alternatively, the JIT mode could load this
     - Configure settings (if needed):
       - Context Length: Higher values allow processing larger images but use more memory
       - Temperature: 0.7 is a good starting point
   - Start the server (toggle the Status from Stopped to Running)
   - Note the server URL (typically `http://localhost:1234/v1`)

## Configuring Obsidian Vision Recall

1. Open Obsidian and go to Settings
2. Click on "Vision Recall" in the left sidebar
3. Under "LLM settings":
   - Set "LLM provider" to "OpenAI" (LM Studio uses the OpenAI API format)
   - Leave "API key" empty
   - Set "API base URL" to: `http://localhost:1234/v1`
     - _Note: The port may be different if you changed it in LM Studio_
   - Set "Vision model name" to the name of your model (e.g., `llama-3.2-11b-vision-instruct`)
   - Set "Endpoint LLM model name" to the same model name

## Verifying the Setup

To verify everything is working:

1. Click the Vision Recall icon in the Obsidian ribbon menu
2. Click the "Test Config" button
3. In the modal, click "Test Connection — Retrieve Models"
4. If the connection is successful, you'll see your model listed

You can use the results from this test to properly fill in the `Vision model name` and `Endpoint LLM model name` in the settings

## Troubleshooting

If you encounter issues:

1. **Ensure LM Studio server is running**:

   - Check the "Local Server" tab in LM Studio (usually actually under "Developer")
   - Verify the server status shows "Running"

2. **Check connection settings**:

   - Verify the API base URL matches the URL shown in LM Studio
   - Make sure to include `/v1` at the end of the URL

3. **Model compatibility**:

   - Not all models support vision capabilities
   - Ensure you've selected a vision-capable model in LM Studio

4. **Resource limitations**:

   - Vision models require significant RAM and GPU resources
   - Try a smaller model if you experience crashes or slow performance

5. **Firewall issues**:
   - Ensure your firewall isn't blocking the LM Studio server port

## Optimizing Performance

- **Use smaller models** if you have limited system resources
- **Reduce context length** in LM Studio for faster processing
- **Close other resource-intensive applications** when using Vision Recall
- **Consider GPU acceleration** if available on your system

## Additional Resources

- [LM Studio Documentation](https://lmstudio.ai/docs)
- [Obsidian Vision Recall GitHub Repository](https://github.com/travisvn/obsidian-vision-recall)
- [List of Vision-Capable Open Source Models](https://huggingface.co/models?pipeline_tag=image-to-text)

---

By following this guide, you can leverage the power of local vision language models through LM Studio to analyze and process your screenshots in Obsidian Vision Recall, maintaining privacy and avoiding API costs.
