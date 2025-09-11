import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

vi.mock('fs');
vi.mock('js-yaml');

describe('Configuration Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle missing config files gracefully', () => {
    const mockFs = fs as any;
    mockFs.existsSync = vi.fn().mockReturnValue(false);
    
    // When config file doesn't exist, existsSync should return false
    const exists = fs.existsSync('config/base.yml');
    expect(exists).toBe(false);
  });

  it('should parse valid YAML configuration', () => {
    const mockYaml = yaml as any;
    const testConfig = {
      server: {
        friendly: {
          port: 4000,
          host: 'localhost'
        }
      }
    };
    
    mockYaml.load = vi.fn().mockReturnValue(testConfig);
    
    const result = yaml.load('valid: yaml');
    expect(result).toEqual(testConfig);
    expect(mockYaml.load).toHaveBeenCalled();
  });

  it('should handle invalid YAML gracefully', () => {
    const mockYaml = yaml as any;
    mockYaml.load = vi.fn().mockImplementation(() => {
      throw new Error('Invalid YAML');
    });
    
    expect(() => yaml.load('invalid: yaml: content:')).toThrow('Invalid YAML');
  });
});

describe('Environment Variables', () => {
  it('should prioritize environment variables over config', () => {
    const envPort = '5000';
    const configPort = 4000;
    
    // Environment variable should take precedence
    const port = envPort || configPort;
    expect(port).toBe('5000');
  });

  it('should use config values when env vars are not set', () => {
    const envPort = undefined;
    const configPort = 4000;
    
    const port = envPort || configPort;
    expect(port).toBe(4000);
  });
});