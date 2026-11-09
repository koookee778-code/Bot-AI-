// Entry point bridge for hosting panels that default to 'node index.js'
import('tsx/esm').then(() => {
    import('./server.ts');
}).catch((err) => {
    console.error("Failed to load tsx or server.ts:", err);
});
