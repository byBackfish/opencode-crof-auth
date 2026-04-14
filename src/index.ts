import type { Plugin, PluginInput, Hooks, AuthHook, ProviderHook } from "@opencode-ai/plugin"

const CROFAI_URL = "https://crof.ai"

const auth: AuthHook = {
  provider: "crofai",
  methods: [
    {
      type: "api",
      label: "API Key",
      prompts: [
        {
          type: "text",
          key: "apiKey",
          message: "Enter your CrofAI API key",
          placeholder: "nahcrof_...",
        },
      ],
      authorize: async (inputs) => {
        const apiKey = inputs?.apiKey
        if (!apiKey?.startsWith("nahcrof_")) {
          return { type: "failed" }
        }
        return { type: "success", key: apiKey }
      },
    },
  ],
}

const provider: ProviderHook = {
  id: "crofai",
  models: async (provider, ctx) => {
    const models: Record<string, any> = {}

    if (!ctx.auth?.key) {
      return models
    }

    try {
      const res = await fetch(`${CROFAI_URL}/v1/models`, {
        headers: {
          Authorization: `Bearer ${ctx.auth.key}`,
          "Content-Type": "application/json"
        },
      })

      if (!res.ok) return models

      const data = await res.json()

      const usedNames: Record<string, boolean> = {}

      for (const model of data.data || []) {
        const baseName = model.name
        let displayName = baseName

        if (usedNames[baseName]) {
          // glm-5.1-precision -> GLM 5.1 (precision), so GLM 5.1 and 5.1-precision show as two different display names
          displayName = `${baseName} (${model.id.split('-').pop()})`
        }
        usedNames[baseName] = true

        models[model.id] = {
          id: model.id,
          name: displayName,
          limit: {
            context: model.context_length,
            output: model.max_completion_tokens,
          },
          capabilities: {
            reasoning: model.reasoning_effort === true,
            text_input: true,
            image_input: false,
          },
          api: {
            id: model.id,
            providerID: "crofai",
            url: `${CROFAI_URL}/v1`,
            npm: "@ai-sdk/openai-compatible",
          },
        }
      }
      return models
    } catch (e) {
      console.error("Failed to fetch CrofAI models:", e)
      return models
    }
  },
}

export default async (input: PluginInput): Promise<Hooks> => {
  return {
    auth,
    provider,
  }
}
