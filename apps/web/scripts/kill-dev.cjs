#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Read port from config
function getPortFromConfig() {
  try {
    // Read base.yml from root config directory
    const configPath = path.join(__dirname, '../../../config/base.yml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);
    
    // Check for environment variable override
    const port = process.env.VITE_PORT || config.server.port;
    
    console.log(`📌 Config port: ${port}`);
    return port;
  } catch (error) {
    console.error('❌ Failed to read config:', error.message);
    console.log('📌 Using default port: 3000');
    return 3000;
  }
}

function killPort(portNumber) {
  console.log(`🔍 Finding process on port ${portNumber}...`);
  
  // Windows command to find process using port
  const findCommand = `netstat -ano | findstr :${portNumber}`;
  
  exec(findCommand, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ No process found on port ${portNumber}`);
      process.exit(0);
      return;
    }
    
    // Parse the output to get PIDs
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    });
    
    if (pids.size === 0) {
      console.log(`✅ No process found on port ${portNumber}`);
      process.exit(0);
      return;
    }
    
    console.log(`📋 Found ${pids.size} process(es) on port ${portNumber}:`);
    pids.forEach(pid => {
      console.log(`   PID: ${pid}`);
    });
    
    // Kill each process
    let killed = 0;
    const totalPids = pids.size;
    
    pids.forEach(pid => {
      const killCommand = `taskkill /F /PID ${pid}`;
      
      exec(killCommand, (killError, killStdout, killStderr) => {
        killed++;
        if (killError) {
          console.error(`❌ Failed to kill process ${pid}: ${killError.message}`);
        } else {
          console.log(`✅ Successfully killed process ${pid}`);
        }
        
        if (killed === totalPids) {
          console.log(`\n🎉 Port ${portNumber} is now free!`);
          process.exit(0);
        }
      });
    });
  });
}

// Main execution
console.log('🧹 Killing dev server process from config...\n');

const configPort = getPortFromConfig();
killPort(configPort);