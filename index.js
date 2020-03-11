const WebSocket = require("ws");
const http = require("http");

const port = 8998;

//initialize a simple http server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*creativeshi.com");
  res.setHeader("Access-Control-Request-Method", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "*");
});
const wss = new WebSocket.Server({ server, maxPayload: 50 });

let connectedClients = {};

const addClient = id => {
  //if client is already then update
  if (connectedClients[id]) {
    connectedClients[id] = connectedClients[id] + 1;
  } else {
    //if not then add it to object
    connectedClients[id] = 1;
  }
};

const removeClient = id => {
  //if client is more than 1 then decrement
  if (connectedClients[id] > 1) {
    connectedClients[id] = connectedClients[id] - 1;
  } else {
    //if not then add remove it
    delete connectedClients[id];
  }
};

wss.on("connection", (ws, req) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  let channel;
  //if parsing channel fails then terminate the so
  try {
    channel = req.url.match(/[0-9]{6}/).join();
    console.log(channel);
  } catch (error) {
    ws.close(1003, "Can't connect to this route");
  }

  ws.room = channel;
  addClient(ws.room);
  console.log("client connected to -> ", channel);
  console.log("no of clients in this room ", connectedClients[channel]);

  //we will send no. of clients connected to room everytime anyone connects to room\
  const sendConnectedClientsNo = () => {
    wss.clients.forEach(client => {
      console.log(client.room);
      if (client.readyState === WebSocket.OPEN && client.room === channel) {
        const msg = {connected_clients: connectedClients[ws.room]}
        client.send(JSON.stringify(msg));
      }
    });
  };

  sendConnectedClientsNo();

  ws.on("message", message => {
    console.log("message: ", message);

    wss.clients.forEach(client => {
      console.log(client.room);
      if (
        client !== ws &&
        client.readyState === WebSocket.OPEN &&
        client.room === channel
      ) {
        client.send(message);
      }
    });
  });

  ws.on("error", e => console.log(e));

  ws.on("close", e => {
    removeClient(ws.room);
    console.log("disconnected");
    sendConnectedClientsNo();
  });
});

// keep the server alive
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping("", false, true);
  });
}, 30000);

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
