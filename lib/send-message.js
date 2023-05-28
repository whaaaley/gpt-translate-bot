
import 'https://deno.land/std@0.184.0/dotenv/load.ts'

// Load Environment Variables
const env = {
  DISCORD_TOKEN: Deno.env.get('DISCORD_TOKEN')
}

export const sendMessage = async (props) => {
  const { channel, message } = props

  const res = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: message
    })
  })

  if (!res.ok) {
    throw new Error(`Failed to send message: ${await res.text()}`)
  }

  return res.json()
}
