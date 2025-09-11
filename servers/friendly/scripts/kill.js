#!/usr/bin/env node

/**
 * Kill Friendly server process by reading port from config
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const execAsync = promisify(exec);

// Read port from config file
function getPortFromConfig() {
  try {
    const configPath = path.join(__dirname, '../../../config/base.yml');
    if (!fs.existsSync(configPath)) {
      console.error('❌ Config file not found:', configPath);
      return 4000; // Default fallback
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    
    const port = config?.server?.friendly?.port;
    if (!port) {
      console.warn('⚠️  Port not found in config, using default 4000');
      return 4000;
    }
    
    return port;
  } catch (error) {
    console.error('❌ Error reading config:', error.message);
    return 4000;
  }
}

async function getProcessIdOnPort(port) {
  const platform = process.platform;
  let command;

  if (platform === 'win32') {
    command = `netstat -ano | findstr :${port}`;
  } else {
    command = `lsof -t -i:${port}`;
  }

  try {
    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      // Parse Windows netstat output
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          pids.add(pid);
        }
      });
      
      return Array.from(pids);
    } else {
      // Unix returns PIDs directly
      return stdout.trim().split('\n').filter(pid => pid);
    }
  } catch (error) {
    return [];
  }
}

async function killProcess(pid) {
  const platform = process.platform;
  let command;

  if (platform === 'win32') {
    command = `taskkill /PID ${pid} /F`;
  } else {
    command = `kill -9 ${pid}`;
  }

  try {
    await execAsync(command);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const port = getPortFromConfig();
  
  console.log(`📖 Read port ${port} from config/base.yml`);
  console.log(`🔍 Searching for processes on port ${port}...`);
  
  const pids = await getProcessIdOnPort(port);
  
  if (pids.length === 0) {
    console.log(`✅ No process found on port ${port}`);
    return;
  }
  
  console.log(`🎯 Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
  
  for (const pid of pids) {
    console.log(`💀 Killing process ${pid}...`);
    const killed = await killProcess(pid);
    
    if (killed) {
      console.log(`✅ Process ${pid} terminated successfully`);
    } else {
      console.log(`⚠️  Failed to kill process ${pid} (may require admin privileges)`);
    }
  }
  
  console.log('✨ Kill operation completed');
}

// Execute
main().catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});