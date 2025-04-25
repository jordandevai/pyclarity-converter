// vite.config.js
export default {
  // Base public path when served in production
  base: './',
  
  // Configure the build
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate sourcemaps for better debugging
    sourcemap: true,
  },
  
  // Configure the dev server
  server: {
    port: 3000,
    open: true, // Open browser on server start
  },
  
  // Resolve file extensions
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx']
  }
}
