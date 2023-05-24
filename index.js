// index.js

import 'https://deno.land/std@0.184.0/dotenv/load.ts'
import { Application, Router } from 'https://deno.land/x/oak@v11.1.0/mod.ts'

import { translateMessage } from './translation.js';

// Load environment variables from .env file
config({ export: true });

const app = new Application();
const router = new Router();
const PORT = Deno.env.get('PORT') || 3000;

app.addEventListener('listen', ({ hostname, port, secure }) => {
  console.log(`Listening on http${secure ? 's' : ''}://${hostname}:${port}`);
});

app.use(async ({ request, response }, next) => {
  const origin = request.headers.get('Origin');
  const allowed = whitelist[origin];

  if (allowed) {
    response.headers.set('Access-Control-Allow-Headers', allowed.headers);
    response.headers.set('Access-Control-Allow-Methods', allowed.methods);
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  await next();
  console.log(request.method, request.url);
});

router.get('/', ({ response }) => {
  response.headers.set('Content-Type', 'text/html');
  response.status = 200;
  response.body = 'Hello world!';
});

router.post('/translate', async ({ request, response }) => {
  const { message } = await request.body().value;

  if (!message) {
    response.status = 400;
    response.body = 'Bad Request';
    return;
  }

  try {
    const translatedMessage = await translateMessage(message);

    response.status = 200;
    response.body = {
      translatedMessage,
    };
  } catch (error) {
    console.error(error);
    response.status = 500;
    response.body = 'Internal Server Error';
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: PORT });
