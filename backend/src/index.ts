import { env } from "./lib/env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[AWDelivery] Server running on http://localhost:${env.PORT}`);
  console.log(`[AWDelivery] Environment: ${env.NODE_ENV}`);
  console.log(`[AWDelivery] Frontend URL: ${env.FRONTEND_URL}`);
});
