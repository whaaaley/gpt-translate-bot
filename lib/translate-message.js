
import 'https://deno.land/std@0.184.0/dotenv/load.ts'
import { LRUCache } from 'lru-cache'

const env = {
  OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
  OPENAI_API_URL: 'https://api.openai.com/v1/completions'
}

const translationCache = new LRUCache({ max: 1000 })

const createPrompt = message => {
  const prompt = `Translate this message to each language in the JSON, escaping the necessary characters: '''${message}'''\n\n`

  return prompt + JSON.stringify({
    english: '',
    japanese: '',
    korean: '',
    spanish: '',
    portuguese: ''
  })
}

// Utility function to translate a message using the OpenAI API
export const translateMessage = async message => {
  if (translationCache.has(message)) {
    return translationCache.get(message)
  }

  try {
    const response = await fetch(env.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt: createPrompt(message),
        max_tokens: 2048,
        temperature: 0,
        top_p: 0
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API request failed with status: ${response.status}`)
    }

    const data = await response.json()
    const translatedMessage = data.choices[0].text.trim()

    translationCache.set(message, translatedMessage)
    return translatedMessage

  } catch (error) {
    console.error('Error translating message:', error.message)
  }
}
