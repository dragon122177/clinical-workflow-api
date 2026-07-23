import "dotenv/config";
import { createApp } from "./app.js";
const port=Number(process.env.PORT||4000);
const app=await createApp();
app.listen(port,()=>console.log(`CareFlow API listening on http://localhost:${port}`));
