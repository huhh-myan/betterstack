import { app } from "./src/app";
import { seedAdmins } from "./src/auth";
import { config } from "./src/config";

await seedAdmins();

app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  if (config.adminUsernames.length) console.log(`[api] admins from ADMIN_USERNAMES: ${config.adminUsernames.join(", ")}`);
});
