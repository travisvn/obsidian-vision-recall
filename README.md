# ✨ Vision Recall: Your AI-Powered Screenshot Knowledge Base for Obsidian 🧠🖼️

[![GitHub Stars](https://img.shields.io/github/stars/travisvn/obsidian-vision-recall?style=social)](https://github.com/travisvn/obsidian-vision-recall)
[![GitHub Issues](https://img.shields.io/github/issues/travisvn/obsidian-vision-recall)](https://github.com/travisvn/obsidian-vision-recall/issues)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**Turn Screenshots into Knowledge Gold with Vision Recall!** 🚀 Capture, process, and instantly recall information from your screenshots directly within Obsidian, powered by AI vision and language models.

## ⚡️ Quick Elevator Pitch

Vision Recall is an Obsidian plugin that automatically processes screenshots you take or import, using AI to extract text (OCR), analyze image content (Vision LLM), and generate insightful notes, all seamlessly integrated into your Obsidian vault. **Stop losing valuable information trapped in images – make your screenshots searchable, linkable, and knowledge-rich!**

 ![Obsidian Vision Recall Plugin Settings Screenshot](https://ud8v76kv5b.ufs.sh/f/1lHAtGEcemsO7dCunZWzwuZpH0xrBnPKXyVjUGi3taIWhoSk)

## ✨ Key Features that Supercharge Your Screenshot Workflow

- **📸 Automatic Screenshot Intake:**

  - 📥 **Intake Folder Monitoring:** Automatically process screenshots as soon as they are added to your designated intake folder. 📂
  - ⏱️ **Periodic & Auto-Processing:** Options for periodic intake folder checks or instant processing upon file creation.
  - 🔗 **Deep Link Intake:** Capture screenshots directly via Obsidian deep links (for advanced workflows). 🔗
  - 📋 **Clipboard Upload:** Quickly process screenshots directly from your clipboard. 📋
  - 📤 **File Upload Modal:** Easily upload and process screenshots from files in your vault. 📤

- **🧠 AI-Powered Screenshot Analysis:**

  - 👓 **Optical Character Recognition (OCR):** Extract text from images with Tesseract OCR. 👓
  - 👁️ **Vision LLM Integration:** Leverage powerful Vision Language Models (like OpenAI's GPT-4o or Ollama models) to analyze image content and understand the context. 👁️
  - 📝 **Intelligent Note Generation:** Automatically generate insightful Obsidian notes summarizing the key information from your screenshots, combining OCR text and vision analysis. 📝
  - 🏷️ **Smart Tagging:** AI-suggested tags automatically categorize your screenshots, making them easily searchable and linkable. 🏷️

- **🗂️ Organize & Recall Your Visual Knowledge:**

  - 🖼️ **Gallery & List Views:** Browse and manage your screenshots in visually appealing gallery or detailed list views within Obsidian. 🖼️ 📃
  - 🔍 **Powerful Filtering & Search:** Quickly find screenshots using text search, tag filters, and date range filters. 🔍
  - 🏷️ **Tag Management:** Easily edit and manage tags for your screenshots to refine your knowledge organization. 🏷️
  - 🔗 **Obsidian Note Linking:** Seamlessly link back to your original screenshots from generated notes and vice versa. 🔗
  - 📊 **Metadata Rich:** View and edit detailed metadata for each screenshot, including OCR text, vision analysis, generated notes, and extracted tags. 📊

- **⚙️ Customizable & User-Friendly:**
  - 🎛️ **Comprehensive Settings:** Fine-tune LLM providers, storage folders, output note settings, and more through a detailed settings tab. 🎛️
  - 🚦 **Processing Queue Management:** Monitor and control screenshot processing with a built-in queue, allowing you to pause, resume, and stop processing as needed. 🚦
  - 📊 **Status Bar Integration:** Quickly access processing queue status and controls from the Obsidian status bar. 📊
  - 🧑‍💻 **Debug Mode:** Detailed logging for troubleshooting and development. 🧑‍💻

## 🚀 Getting Started with Vision Recall

### 1. Prerequisites

- **Obsidian:** You need to have [Obsidian](https://obsidian.md) installed.
- **LLM API Key (Optional, but Recommended for AI Features):**
  - **OpenAI API Key:** (For OpenAI models like GPT-4o). Get your API key from [OpenAI](https://platform.openai.com/account/api-keys).
  - **Ollama (Optional, for local LLMs):** [Ollama](https://ollama.com/) allows you to run models locally. Install Ollama if you want to use local models.
  - **OpenRouter Account (Recommended for flexibility and cost management):** [OpenRouter](https://openrouter.ai/) allows you to access various LLM models through a single API key and manage costs effectively.

### 2. Installation (Within Obsidian)

1.  **Open Obsidian Settings:** Go to `Settings` → `Community plugins`.
2.  **Disable Safe Mode:** If Safe mode is enabled, disable it.
3.  **Browse Community Plugins:** Click `Browse` to open the community plugins browser.
4.  **Search for "Vision Recall":** Search for "Vision Recall" in the search bar.
5.  **Install Vision Recall:** Click `Install` on the "Vision Recall" plugin.
6.  **Enable Plugin:** Go to `Settings` → `Community plugins` and enable the "Vision Recall" plugin.

### 3. Initial Setup & Configuration

1.  **Open Vision Recall Settings:** After enabling the plugin, a "Vision Recall" settings tab will appear in your Obsidian settings.
2.  **Configure LLM Provider:** Choose your preferred LLM provider (OpenAI or Ollama) and enter your API key (if using OpenAI or OpenRouter). Configure the API Base URL if needed (e.g., for Ollama or custom OpenAI-compatible endpoints).
3.  **Set up Storage Folders:** Configure your screenshot storage, intake, and output notes folders within your Obsidian vault in the settings tab. Vision Recall can automatically create these folders for you if they don't exist.
4.  **Start Processing Screenshots!** You can now:
    - **Drop screenshots into your intake folder** for automatic processing.
    - **Use the "Add New Screenshot" command** to upload files or paste from clipboard.
    - **Open the Vision Recall View** (using the ribbon icon or command) to manage and browse your screenshots.

### 4. Basic Usage

- **Processing Screenshots:** Vision Recall will automatically process screenshots in your intake folder or those you upload via the plugin's UI.
- **Viewing Screenshots:** Open the "Vision Recall View" to browse your processed screenshots in gallery or list mode.
- **Opening Notes:** Click on a screenshot in the Vision Recall View to open its generated Obsidian note, containing summaries, OCR text, vision analysis, and tags.
- **Editing Metadata:** Edit tags and other metadata directly from the Vision Recall View.
- **Managing Processing Queue:** Use the Processing Queue modal (accessible from the status bar button or commands) to monitor and control screenshot processing.

---

## 🗺️ Roadmap & Future Enhancements

- **[ ] More LLM Provider Integrations:** Expanding support to more LLM providers and models.
- **[ ] Advanced Note Customization:** More options for customizing the format and content of generated notes.
- **[ ] Enhanced Tagging Features:** Improved tag suggestion algorithms and tag management capabilities.
- **[ ] Community Feature Requests:** Prioritizing features based on user feedback and community requests.

**Contributions and feature requests are welcome!** 🙏

---

## 🤝 Contributing

Vision Recall is open-source! If you're a developer and want to contribute, feel free to:

- **Report Issues:** [Submit bug reports and feature requests](https://github.com/travisvn/obsidian-vision-recall/issues).
- **Suggest Features:** Open issues to discuss new features and improvements.
- **Submit Pull Requests:** Fork the repository, make your changes, and submit pull requests.

---

**Enjoy recalling your visual knowledge!** ✨
