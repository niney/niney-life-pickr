import buildApp from './app';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import db from './db/database';
import migrator from './db/migrate';

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

const PORT = Number(process.env.PORT || config.server.port);
const HOST = process.env.HOST || config.server.host;

// Initialize database and start server
async function startServer() {
  try {
    // Connect to database
    await db.connect();
    console.log('✅ Database connected');
    
    // Run migrations
    await migrator.migrate();
    console.log('✅ Migrations completed');
    
    // Build Fastify app
    const app = await buildApp();
    
    // Start server
    await app.listen({ port: PORT, host: HOST });
    
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

    // Graceful shutdown
    const closeGracefully = async (signal: string) => {
      console.log(`\n${signal} signal received: closing HTTP server`);
      
      try {
        await app.close();
        console.log('HTTP server closed');
        
        await db.close();
        console.log('Database connection closed');
        
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => closeGracefully('SIGTERM'));
    process.on('SIGINT', () => closeGracefully('SIGINT'));

    return app;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
const serverInstance = startServer();

export default serverInstance;