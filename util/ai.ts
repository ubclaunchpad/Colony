import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    });
  }
  return client;
}

interface AICallOptions {
  additional: ChatCompletionMessageParam[];
}

export async function callAI(message: string, options?: AICallOptions) {
  const chatCompletion = await getClient().chat.completions.create({
    messages: [
      {
        role: "system",
        content: process.env.ROCKET_SYSTEM ?? "",
      },
      ...(options?.additional || []),
      { role: "user", content: message },
    ],
    model: "gpt-4o-mini",
  });
  return chatCompletion;
}
