import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`Progress report backend running on ${env.APP_BASE_URL}`);
});
