// vite.config.js
import { defineConfig } from "file:///G:/my%20work/MyRestoredProjects/healy-system/app/node_modules/vite/dist/node/index.js";
import react from "file:///G:/my%20work/MyRestoredProjects/healy-system/app/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///G:/my%20work/MyRestoredProjects/healy-system/app/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "G:\\my work\\MyRestoredProjects\\healy-system\\app";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3e3,
    strictPort: true,
    // Force port 3000, error if busy
    host: true,
    // Listen on all local IPs
    cors: true,
    allowedHosts: [".loca.lt"],
    hmr: {
      overlay: false
      // Disable the error overlay if it's annoying
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJHOlxcXFxteSB3b3JrXFxcXE15UmVzdG9yZWRQcm9qZWN0c1xcXFxoZWFseS1zeXN0ZW1cXFxcYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxteSB3b3JrXFxcXE15UmVzdG9yZWRQcm9qZWN0c1xcXFxoZWFseS1zeXN0ZW1cXFxcYXBwXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9HOi9teSUyMHdvcmsvTXlSZXN0b3JlZFByb2plY3RzL2hlYWx5LXN5c3RlbS9hcHAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIHJlYWN0KCksXG4gICAgICAgIHRhaWx3aW5kY3NzKCksXG4gICAgXSxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICAgIHN0cmljdFBvcnQ6IHRydWUsIC8vIEZvcmNlIHBvcnQgMzAwMCwgZXJyb3IgaWYgYnVzeVxuICAgICAgICBob3N0OiB0cnVlLCAvLyBMaXN0ZW4gb24gYWxsIGxvY2FsIElQc1xuICAgICAgICBjb3JzOiB0cnVlLFxuICAgICAgICBhbGxvd2VkSG9zdHM6IFsnLmxvY2EubHQnXSxcbiAgICAgICAgaG1yOiB7XG4gICAgICAgICAgICBvdmVybGF5OiBmYWxzZSwgLy8gRGlzYWJsZSB0aGUgZXJyb3Igb3ZlcmxheSBpZiBpdCdzIGFubm95aW5nXG4gICAgICAgIH0sXG4gICAgfSxcbn0pO1xuLy8gVHJpZ2dlciBkZXYgc2VydmVyIHJlc3RhcnQgMVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VSxTQUFTLG9CQUFvQjtBQUNyVyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVM7QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ0wsT0FBTztBQUFBLE1BQ0gsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3hDO0FBQUEsRUFDSjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUEsSUFDWixNQUFNO0FBQUE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWMsQ0FBQyxVQUFVO0FBQUEsSUFDekIsS0FBSztBQUFBLE1BQ0QsU0FBUztBQUFBO0FBQUEsSUFDYjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
