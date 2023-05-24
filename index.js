import 'dotenv/load.ts'

// Load Environment Variables
const env = {
  OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
  DISCORD_TOKEN: Deno.env.get('DISCORD_TOKEN')
}

// Utility function to translate a message using the OpenAI API
async function translateMessage(message) {
  const openaiApiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';

  const response = await fetch(openaiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
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
      model: 'gpt-3.5-turbo',
    }),
  });

  const data = await response.json();
  const translatedMessage = data.choices[0].text.trim();

  return translatedMessage;
}

// Start listening for new messages
async function startListening() {
  const gatewayUrl = 'https://discord.com/api/v10/gateway'

  try {
    // Retrieve the WebSocket gateway URL
    const response = await fetch(gatewayUrl)
    const data = await response.json()
    const gateway = data.url

    // Open a WebSocket connection to the gateway
    const ws = new WebSocket(`${gateway}/?v=10&encoding=json`)

    // Event listener for WebSocket connection
    ws.addEventListener('open', () => {
      console.log('WebSocket connection opened')
    })

    // Event listener for WebSocket messages
    ws.addEventListener('message', async (event) => {
      const payload = JSON.parse(event.data)

      if (payload.op === 10) {
        // Perform necessary handshake
        const { heartbeat_interval } = payload.d

        setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: null }))
        }, heartbeat_interval)
      }

      if (payload.op === 11) {
        // Start listening for events
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token: env.DISCORD_TOKEN,
            intents: 1 << 0
          }
        }))
      }

      if (payload.op === 0 && payload.t === 'MESSAGE_CREATE') {
        const message = payload.d

        if (message.channel_id === channelId) {
          const translatedMessage = await translateMessage(message.content)
          // Do something with the translated message, such as sending it to another channel
          console.log('Translated Message:', translatedMessage)
        }
      }
    })
  } catch (error) {
    console.error('WebSocket connection error:', error)
  }
}

// Start listening for new messages
startListening()
