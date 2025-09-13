module.exports = {
  apps: [
    {
      name: 'meu-backend',
      script: 'backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      log_file: './backend/logs/pm2-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max_old_space_size=1024'
    },
    {
      name: 'meu-frontend',
      script: 'app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: './logs/pm2-frontend-error.log',
      out_file: './logs/pm2-frontend-out.log',
      log_file: './logs/pm2-frontend-combined.log',
      time: true,
      max_memory_restart: '512M'
    }
  ],

  deploy: {
    production: {
      user: 'meuapp',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/idea-to-meu-plugin.git',
      path: '/home/meuapp/idea-to-meu-plugin',
      'post-deploy': 'npm install && cd backend && npm install && cd .. && docker build -t meu-executor:latest docker/execution/ && pm2 reload ecosystem.config.js --env production'
    }
  }
};