// vite.config.js
import { defineConfig } from "file:///G:/my%20work/MyRestoredProjects/healy-system/app/node_modules/vite/dist/node/index.js";
import react from "file:///G:/my%20work/MyRestoredProjects/healy-system/app/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///G:/my%20work/MyRestoredProjects/healy-system/app/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "G:\\my work\\MyRestoredProjects\\healy-system\\app";
var vite_config_default = defineConfig({
  cacheDir: "C:/Temp/vite-cache-healy",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJHOlxcXFxteSB3b3JrXFxcXE15UmVzdG9yZWRQcm9qZWN0c1xcXFxoZWFseS1zeXN0ZW1cXFxcYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxteSB3b3JrXFxcXE15UmVzdG9yZWRQcm9qZWN0c1xcXFxoZWFseS1zeXN0ZW1cXFxcYXBwXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9HOi9teSUyMHdvcmsvTXlSZXN0b3JlZFByb2plY3RzL2hlYWx5LXN5c3RlbS9hcHAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBjYWNoZURpcjogJ0M6L1RlbXAvdml0ZS1jYWNoZS1oZWFseScsXG4gICAgcGx1Z2luczogW1xuICAgICAgICByZWFjdCgpLFxuICAgICAgICB0YWlsd2luZGNzcygpLFxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgICBwb3J0OiAzMDAwLFxuICAgICAgICBzdHJpY3RQb3J0OiB0cnVlLCAvLyBGb3JjZSBwb3J0IDMwMDAsIGVycm9yIGlmIGJ1c3lcbiAgICAgICAgaG9zdDogdHJ1ZSwgLy8gTGlzdGVuIG9uIGFsbCBsb2NhbCBJUHNcbiAgICAgICAgY29yczogdHJ1ZSxcbiAgICAgICAgYWxsb3dlZEhvc3RzOiBbJy5sb2NhLmx0J10sXG4gICAgICAgIGhtcjoge1xuICAgICAgICAgICAgb3ZlcmxheTogZmFsc2UsIC8vIERpc2FibGUgdGhlIGVycm9yIG92ZXJsYXkgaWYgaXQncyBhbm5veWluZ1xuICAgICAgICB9LFxuICAgIH0sXG59KTtcbi8vIFRyaWdnZXIgZGV2IHNlcnZlciByZXN0YXJ0IDFcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1UsU0FBUyxvQkFBb0I7QUFDclcsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixVQUFVO0FBQUEsRUFDVixTQUFTO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDaEI7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQSxNQUNILEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN4QztBQUFBLEVBQ0o7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQTtBQUFBLElBQ1osTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixjQUFjLENBQUMsVUFBVTtBQUFBLElBQ3pCLEtBQUs7QUFBQSxNQUNELFNBQVM7QUFBQTtBQUFBLElBQ2I7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
