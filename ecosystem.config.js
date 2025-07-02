module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'backend',
      script: 'server.js',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};