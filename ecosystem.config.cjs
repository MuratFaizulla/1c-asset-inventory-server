module.exports = {
  apps: [
    {
      name: 'inventory-server',
      script: './app.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--experimental-vm-modules',

      // Переменные окружения
      env: {
        NODE_ENV: 'development',
        PORT: 8888,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8888,
      },

      // Автоперезапуск если падает
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Логи
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
    }
  ]
}