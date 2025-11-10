// Подавление WebSocket ошибок Vite HMR в продакшн окружении
// Эти ошибки не критичны и только засоряют консоль
(function() {
  if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = function(...args) {
      // Игнорируем WebSocket ошибки от Vite
      if (args.length > 0 && typeof args[0] === 'string') {
        const msg = args[0];
        if (
          msg.includes('WebSocket connection') ||
          msg.includes('[vite]') ||
          msg.includes('failed to connect to websocket')
        ) {
          return; // Не выводим эту ошибку
        }
      }
      // Все остальные ошибки выводим как обычно
      originalError.apply(console, args);
    };
  }
})();
