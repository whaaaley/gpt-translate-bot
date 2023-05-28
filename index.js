
import { handleMessage } from './lib/handle-message.js'

const env = {
  DISCORD_GATEWAY: 'https://discord.com/api/v10/gateway'
}

const start = async () => {
  try {
    const response = await fetch(env.DISCORD_GATEWAY)

    if (!response.ok) {
      throw new Error(`Gateway fetch request failed with status: ${response.status}`)
    }

    const data = await response.json()
    const ws = new WebSocket(`${data.url}/?v=10&encoding=json`)

    ws.addEventListener('open', () => {
      console.log('WebSocket connection opened')
    })

    ws.addEventListener('close', () => {
      console.log('WebSocket connection closed')
    })

    ws.addEventListener('error', error => {
      console.error('WebSocket error:', error)
    })

    ws.addEventListener('message', event => {
      handleMessage(ws, event)
    })
  } catch (error) {
    console.error('WebSocket connection error:', error)
  }
}

start()
