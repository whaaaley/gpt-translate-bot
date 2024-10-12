
import 'https://deno.land/std@0.184.0/dotenv/load.ts'
import Ajv from 'ajv'
import { translateMessage } from './translate-message.js'
import { sendMessage } from './send-message.js'

const env = {
  DISCORD_TOKEN: Deno.env.get('DISCORD_TOKEN'),
  DISCORD_CHANNEL: '1110790268040515705' // #english-spanish
}

let heartbeatInterval = null

const schema = {
  type: 'object',
  properties: {
    message: {
    type: 'string'
    }
  },
  required: [
    'message'
  ]
}

const ajv = new Ajv()
const validate = ajv.compile(schema)

export const handleMessage = async (ws, event) => {
  console.log('WebSocket message received:', event.data)

  try {
    const payload = JSON.parse(event.data)
    const { op, t, d } = payload

    // Perform necessary handshake
    if (op === 10) {
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(() => {
          ws.send(JSON.stringify({
            op: 1,
            d: null
          }))
        }, d.heartbeat_interval)
      }

      // Identify with the gateway
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: env.DISCORD_TOKEN,
          intents: (1 << 9) | (1 << 15), // GUILD_MESSAGES, MESSAGE_CONTENT
          properties: {
            os: 'linux',
            browser: 'deno',
            device: 'deno'
          }
        }
      }))
    }

    // Translate message from the specified channel
    if (op === 0 && t === 'MESSAGE_CREATE') {
      if (d.channel_id === env.DISCORD_CHANNEL && d.author.bot == null) {
        console.log('Message:', d.content)

        const message = {
          message: d.content
        }

        if (!validate(message)) {
          throw new Error(
            `Invalid message: ${ajv.errorsText(validate.errors)}`
          )
        }

        console.log('Valid message:', message)
        const translatedMessage = await translateMessage(d.content)
        console.log('Translation:', translatedMessage)

        try {
          // const output = JSON.parse(translatedMessage)

          await sendMessage({
            channel: env.DISCORD_CHANNEL,
            message: translatedMessage
            // message: `
            //   English: ${output.english}
            //   Japanese: ${output.japanese}
            //   Korean: ${output.korean}
            //   Spanish: ${output.spanish}
            //   Portuguese: ${output.portuguese}
            // `
          })
        } catch (error) {
          console.error('Error sending message:', error)
        }
      }
    }
  } catch (error) {
    console.error('Error handling message:', error)
  }
}
