const express = require("express");
const app = express();
const indexRouter = require("./routes/index");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const io = socketIO(server);

let waitingUsers = [];
let rooms = {};

// Socket.IO connection handler
io.on("connection", function(socket) {
    // Handle joining a room
    socket.on("joinroom", function() {
        if(waitingUsers.length > 0) {
            let partner = waitingUsers.shift();
            const roomname = `${socket.id}-${partner.id}`;
            
            socket.join(roomname);
            partner.join(roomname);
            rooms[roomname] = true;
            
            io.to(roomname).emit("joined", roomname);
        } else {
            waitingUsers.push(socket);
        }
    });

    // Handle signaling messages (WebRTC)
    socket.on("signalingMessage", function(data) {
        socket.broadcast.to(data.room).emit("signalingMessage", data.message);
    });

    // Handle text messages
    socket.on("message", function(data) {
        socket.broadcast.to(data.room).emit("message", data.message);
    });

    // Handle video call initiation
    socket.on("startVideoCall", function(room) {
        socket.broadcast.to(room).emit("incoming call");
    });

    // Handle call rejection
    socket.on("RejectCall", function(data) {
        socket.broadcast.to(data.room).emit("callRejected");
    });

    // Handle call acceptance
    socket.on("acceptCall", function(data) {
        socket.broadcast.to(data.room).emit("callAccepted");
    });

    // Handle disconnection
    socket.on("disconnect", function() {
        // Remove from waiting list if present
        let index = waitingUsers.findIndex(user => user.id === socket.id);
        if (index !== -1) {
            waitingUsers.splice(index, 1);
        }
        
        // Clean up rooms this user was in
        for (let room in rooms) {
            if (room.includes(socket.id)) {
                delete rooms[room];
            }
        }
    });
});

// Configure Express
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", indexRouter);

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


