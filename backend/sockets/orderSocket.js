export const initOrderSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Join order room
    socket.on('join_order', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`👤 Client joined room: order_${orderId}`);
    });

    // Join role room
    socket.on('join_role', (role) => {
      socket.join(`role_${role}`);
      console.log(`👤 Client joined role group: role_${role}`);
    });

    // Share live coordinates from rider to customer order room
    socket.on('update_location', (data) => {
      const { orderId, latitude, longitude, heading, eta } = data;
      console.log(`📍 Rider location update for order #${orderId}: [${latitude}, ${longitude}]`);
      
      // Broadcast coordinates to everyone in the order tracking room (customer)
      io.to(`order_${orderId}`).emit('location_update', {
        latitude,
        longitude,
        heading: heading || 0,
        eta: eta || '15 mins'
      });

      // Broadcast coordinates to admin monitors
      io.to('role_admin').emit('admin_location_update', {
        orderId,
        latitude,
        longitude
      });
    });

    // Triggered on status transitions
    socket.on('status_change', (data) => {
      const { orderId, status, message } = data;
      console.log(`🔄 Order #${orderId} status change: ${status}`);

      // Broadcast new status to order room
      io.to(`order_${orderId}`).emit('status_update', {
        orderId,
        status,
        message
      });

      // Notify relevant roles
      io.to('role_admin').emit('admin_order_update', { orderId, status });
      io.to('role_owner').emit('owner_order_update', { orderId, status });
      io.to('role_rider').emit('rider_order_update', { orderId, status });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
