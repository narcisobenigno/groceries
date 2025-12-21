import { createApp } from "./app"

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || "0.0.0.0"

const app = createApp()

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`)

  // Only log this in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Press CTRL+C to stop\n")
  }
})
