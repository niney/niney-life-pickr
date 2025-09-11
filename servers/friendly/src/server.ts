import app from './app';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Load configuration based on environment
const env = process.env.NODE_ENV || 'development';
const baseConfigPath = path.join(__dirname, '../../../config/base.yml');
const envConfigPath = path.join(__dirname, `../../../config/${env}.yml`);

let config: any = { server: { port: 4000, host: 'localhost' } };

// Load base configuration
if (fs.existsSync(baseConfigPath)) {
  try {
    const fileContents = fs.readFileSync(baseConfigPath, 'utf8');
    const loadedConfig = yaml.load(fileContents) as any;
    if (loadedConfig?.server?.friendly) {
      config.server = { ...config.server, ...loadedConfig.server.friendly };
    }
  } catch (error) {
    console.warn('Failed to load base config file, using defaults:', error);
  }
}

// Load environment-specific configuration and merge
if (fs.existsSync(envConfigPath)) {
  try {
    const fileContents = fs.readFileSync(envConfigPath, 'utf8');
    const envConfig = yaml.load(fileContents) as any;
    if (envConfig?.server?.friendly) {
      config.server = { ...config.server, ...envConfig.server.friendly };
    }
  } catch (error) {
    console.warn(`Failed to load ${env} config file:`, error);
  }
}

const PORT = process.env.PORT || config.server.port;
const HOST = process.env.HOST || config.server.host;

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Niney Life Pickr Friendly Server        ║
║   Node.js Backend Service                  ║
╠════════════════════════════════════════════╣
║   Status: ✅ Running                       ║
║   Port: ${PORT}                              
║   Host: ${HOST}                              
║   Environment: ${process.env.NODE_ENV || 'development'}                   
╚════════════════════════════════════════════╝

Server is running at http://${HOST}:${PORT}
Press Ctrl+C to stop
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default server;