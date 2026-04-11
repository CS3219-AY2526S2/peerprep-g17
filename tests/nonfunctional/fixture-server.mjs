import http from "node:http";

const port = Number(process.env.NONFUNCTIONAL_PORT || 3100);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (url.pathname === "/health") {
    await delay(35);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "peerprep-fixture" }));
    return;
  }

  if (url.pathname === "/api/questions") {
    await delay(70);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        data: [
          { id: "q-1", title: "Two Sum", difficulty: "Easy" },
          { id: "q-2", title: "Course Schedule", difficulty: "Medium" },
        ],
      }),
    );
    return;
  }

  if (url.pathname === "/api/matches/requests") {
    await delay(90);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        data: {
          status: "searching",
          requestId: "req-1",
          topic: "Arrays",
          difficulty: "Easy",
        },
      }),
    );
    return;
  }

  if (url.pathname === "/failure/user-service-down") {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "User Service unavailable during injected failure scenario.",
      }),
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Non-functional fixture listening on http://127.0.0.1:${port}`);
});
