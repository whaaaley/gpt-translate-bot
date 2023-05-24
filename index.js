
import 'dotenv/load.ts'
import { LRUCache } from 'https://cdn.skypack.dev/lru-cache@9.1.1'

// Load Environment Variables
const loadEnvVariables = () => {
  const env = {
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
    DISCORD_TOKEN: Deno.env.get('DISCORD_TOKEN'),
    DISCORD_CHANNEL_ID: '1110790268040515705'
  }

  if (!env.OPENAI_API_KEY || !env.DISCORD_TOKEN) {
    throw new Error('Environment variables not set correctly');
  }

  return env
}

const env = loadEnvVariables()
const translationCache = new LRUCache(500)

// Utility function to translate a message using the OpenAI API
const translateMessage = async message => {
  if (translationCache.has(message)) {
    return translationCache.get(message)
  }

  const openaiApiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions'

  try {
    const response = await fetch(openaiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        prompt: `Translate the following message to Spanish: "${message}"`,
        max_tokens: 50,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: '\n',
        n: 1,
        model: 'gpt-3.5-turbo'
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
    console.error('Error translating message:', error)
  }
}

// Helper function to send WebSocket messages
const wsSend = (ws, payload) => {
  try {
    ws.send(JSON.stringify(payload))
  } catch (error) {
    console.error('Error sending WebSocket message:', error)
  }
}

// Event listener for WebSocket events
const handleWebSocketEvents = ws => {
  let heartbeatInterval = null

  ws.addEventListener('open', () => {
    console.log('WebSocket connection opened')
  })

  ws.addEventListener('error', error => {
    console.error('WebSocket error:', error)
  })

  ws.addEventListener('message', async (event) => {
    try {
      const payload = JSON.parse(event.data)

      // Perform necessary handshake
      if (payload.op === 10) {
        const { heartbeat_interval } = payload.d

        if (!heartbeatInterval) {
          heartbeatInterval = setInterval(() => {
            wsSend(ws, {
              op: 1,
              d: null
            })
          }, heartbeat_interval)
        }
      }

      // Start listening for events
      if (payload.op === 11) {
        wsSend(ws, {
          op: 2,
          d: {
            token: env.DISCORD_TOKEN,
            intents: 1
          }
        })
      }

      if (payload.op === 0 && payload.t === 'MESSAGE_CREATE') {
        const message = payload.d

        if (message.channel_id === env.DISCORD_CHANNEL_ID) {
          try {
            const translatedMessage = await translateMessage(message.content)

            const replyPayload = {
              content: translatedMessage,
              channel_id: message.channel_id,
            }

            wsSend(ws, {
              op: 1,
              d: replyPayload
            })
          } catch (error) {
            console.error('Error sending message to Discord channel:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message payload:', error)
    }
  })
}

// Start listening for new messages
const startListening = async () => {
  const gatewayUrl = 'https://discord.com/api/v10/gateway'

  try {
    const response = await fetch(gatewayUrl)

    if (!response.ok) {
      throw new Error(`Gateway fetch request failed with status: ${response.status}`)
    }

    const data = await response.json()
    const gateway = data.url

    // Open a WebSocket connection to the gateway
    const ws = new WebSocket(`${gateway}/?v=10&encoding=json`)

    ws.addEventListener('close', () => {
      console.log('WebSocket connection closed')
    })

    handleWebSocketEvents(ws)

  } catch (error) {
    console.error('WebSocket connection error:', error)
  }
}

// Start listening for new messages
startListening()
