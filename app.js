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
io.on("connection", function(socket) {
    console.log("User connected:", socket.id);
    socket.on("joinroom", function() {
        if(waitingUsers.length > 0) {
            let partner = waitingUsers.shift();
            const roomname = `${socket.id}-${partner.id}`;  
            socket.join(roomname);
            partner.join(roomname);
            rooms[roomname] = [socket.id, partner.id];        
            io.to(roomname).emit("joined", roomname);
        } else {
            waitingUsers.push(socket);
        }
    }); 
socket.on("signalingMessage", function(data) {
  socket.broadcast.to(data.room).emit("signalingMessage", {
    room: data.room,
    message: data.message
});
    });
    socket.on("message", function(data) {
        socket.broadcast.to(data.room).emit("message", data.message);
    });
  socket.on("startVideoCall", function(data) {
    const room = data.room || data; // Handle both formats
    socket.broadcast.to(room).emit("incomingCall", { from: socket.id });
});
socket.on("rejectCall", function(data) { 
        socket.broadcast.to(data.room).emit("callRejected", { from: socket.id });
    });
    socket.on("acceptCall", function(data) {
        socket.broadcast.to(data.room).emit("callAccepted", { from: socket.id });
    });
    socket.on("endCall", function(data) {
        socket.broadcast.to(data.room).emit("callEnded", { from: socket.id });
          });
    socket.on("disconnect", function() {
         console.log("User disconnected:", socket.id);
        let index = waitingUsers.findIndex(user => user.id === socket.id);
        if (index !== -1) {
            waitingUsers.splice(index, 1);
        }
        for (let room in rooms) {
            if (rooms[room].includes(socket.id)) { // ✅ CHANGED: was `room.includes(socket.id)`
                socket.broadcast.to(room).emit("userDisconnected", { userId: socket.id }); // ✅ CHANGED: was just `"userDisconnected"` and added user info
                delete rooms[room];
                break; 
            }
        }
        });
    });
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/", indexRouter);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
