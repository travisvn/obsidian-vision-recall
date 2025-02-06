
export function getEndpointPromptGeneric(definingText: string, includeVisionAnalysis: boolean = true) {
  return `The following text${includeVisionAnalysis ? ' and vision analysis' : ''} is from ${definingText}. Summarize the main topic and key information/arguments.`;
}

export const visionLLMResponseCategoriesMap = {
  "youtube comment": `The following text is from a YouTube comment. Summarize key findings, experiences, or opinions, focusing on actionable takeaways.`,

  "web page": getEndpointPromptGeneric("a web page screenshot"),

  "email": getEndpointPromptGeneric("an email screenshot"),

  "reddit comment": getEndpointPromptGeneric("a Reddit comment"),

  "tweet": getEndpointPromptGeneric("a Twitter comment or Tweet"),

  "instagram comment": getEndpointPromptGeneric("an Instagram comment"),

  "tiktok comment": getEndpointPromptGeneric("a TikTok comment"),

  "discord message": getEndpointPromptGeneric("a Discord message"),

  "telegram message": getEndpointPromptGeneric("a Telegram message"),


  "default": `The following OCR text and vision analysis are from a screenshot. Summarize and synthesize the text and vision analysis and identify key information.`,
}
