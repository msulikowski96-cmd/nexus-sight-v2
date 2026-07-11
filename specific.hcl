service "api" {
  run = "pnpm --filter @workspace/api-server run dev"

  http {
    port = 8080
    public_url = true
  }

  environment {
    PORT = "8080"
  }

  secret "RIOT_API_KEY" {}
}

service "web" {
  run = "pnpm --filter @workspace/web run dev"

  http {
    port = 5173
    public_url = true
  }
}
