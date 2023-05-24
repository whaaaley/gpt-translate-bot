import { Application, Router } from 'https://deno.land/x/oak/mod.ts';
import { config } from 'https://deno.land/x/dotenv/mod.ts';

const app = new Application();
const router = new Router();
const PORT = 3000;

// Load environment variables from .env file
config({ export: true });

// Utility function to translate a message using the OpenAI API
async function translateMessage(message) {
  const openaiApiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';

  const response = await fetch(openaiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
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

// Route to handle Discord interaction events
router.post('/interaction', async (ctx) => {
  try {
    const interaction = await ctx.request.body().value;

    // Handle Discord interaction events
    if (interaction.type === 1) {
      // Handle PING event
      ctx.response.status = 200;
      ctx.response.body = {
        type: 1,
      };
    } else if (interaction.type === 2) {
      // Handle COMMAND event
      const message = interaction.data.options[0].value;
      const translatedMessage = await translateMessage(message);

      // Create the response payload
      const responsePayload = {
        type: 4,
        data: {
          content: translatedMessage,
        },
      };

      // Send the interaction response
      await sendInteractionResponse(interaction.id, interaction.token, responsePayload);

      ctx.response.status = 200;
    } else {
      ctx.response.status = 400;
      ctx.response.body = 'Bad Request';
    }
  } catch (err) {
    ctx.response.status = err.status || 500;
    ctx.response.body = err.message;
  }
});

// Utility function to send an interaction response as a webhook request
async function sendInteractionResponse(interactionId, interactionToken, responsePayload) {
  const discordApiUrl = `https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`;

  await fetch(discordApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${discordConfig.botToken}`,
    },
    body: JSON.stringify(responsePayload),
  });
}

// Middleware to handle errors
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = 'Internal Server Error';
  }
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.status = err.status || 500;
    ctx.response.body = err.message;
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
console.log(`Server running on port ${PORT}`);
await app.listen({ port: PORT });
