import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      autoConnect: false
    });
  }
  return socket;
};

export const connectSocket = () => {
  const instance = getSocket();
  const token = localStorage.getItem('token');
  instance.auth = { token };
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
};
