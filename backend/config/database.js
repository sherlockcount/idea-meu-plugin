const mongoose = require('mongoose');
const logger = require('../utils/logger');

// 数据库配置
const config = {
    // 内存存储配置（默认）
    memory: {
        type: 'memory',
        description: '内存存储 - 重启后数据丢失'
    },
    
    // MongoDB配置（可选）
    mongodb: {
        type: 'mongodb',
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/idea-meu',
        options: {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        },
        description: 'MongoDB数据库'
    }
};

// MongoDB连接状态
let isConnected = false;
let connectionPromise = null;

// 连接MongoDB
async function connectMongoDB() {
    if (connectionPromise) {
        return connectionPromise;
    }
    
    if (isConnected) {
        return mongoose.connection;
    }
    
    const mongoConfig = config.mongodb;
    
    connectionPromise = new Promise(async (resolve, reject) => {
        try {
            logger.info('正在连接MongoDB数据库...');
            
            // 连接事件监听
            mongoose.connection.on('connected', () => {
                logger.info('MongoDB连接成功');
                isConnected = true;
            });
            
            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB连接错误:', err);
                isConnected = false;
            });
            
            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB连接断开');
                isConnected = false;
            });
            
            // 进程退出时关闭连接
            process.on('SIGINT', async () => {
                try {
                    await mongoose.connection.close();
                    logger.info('MongoDB连接已关闭');
                    process.exit(0);
                } catch (error) {
                    logger.error('关闭MongoDB连接时出错:', error);
                    process.exit(1);
                }
            });
            
            await mongoose.connect(mongoConfig.uri, mongoConfig.options);
            resolve(mongoose.connection);
        } catch (error) {
            logger.error('MongoDB连接失败:', error);
            connectionPromise = null;
            reject(error);
        }
    });
    
    return connectionPromise;
}

// 断开MongoDB连接
async function disconnectMongoDB() {
    if (isConnected) {
        await mongoose.connection.close();
        isConnected = false;
        connectionPromise = null;
        logger.info('MongoDB连接已断开');
    }
}

// 检查数据库连接状态
function getConnectionStatus() {
    return {
        isConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
    };
}

// 获取当前数据库配置
function getDatabaseConfig() {
    if (process.env.MONGODB_URI) {
        return config.mongodb;
    }
    return config.memory;
}

// 初始化数据库
async function initializeDatabase() {
    const dbConfig = getDatabaseConfig();
    
    if (dbConfig.type === 'mongodb') {
        try {
            await connectMongoDB();
            logger.info('数据库初始化完成 - MongoDB');
            return { type: 'mongodb', connected: true };
        } catch (error) {
            logger.warn('MongoDB连接失败，使用内存存储:', error.message);
            return { type: 'memory', connected: false, error: error.message };
        }
    } else {
        logger.info('数据库初始化完成 - 内存存储');
        return { type: 'memory', connected: true };
    }
}

// 获取数据库实例（用于原生MongoDB操作）
function getDatabase() {
    if (!isConnected || !mongoose.connection.db) {
        throw new Error('数据库未连接');
    }
    return mongoose.connection.db;
}

// 健康检查
async function healthCheck() {
    try {
        if (!process.env.MONGODB_URI) {
            return {
                status: 'healthy',
                message: '使用内存存储（未配置数据库）',
                type: 'memory'
            };
        }
        
        if (!isConnected) {
            return {
                status: 'unhealthy',
                message: 'MongoDB未连接',
                type: 'mongodb'
            };
        }
        
        // 执行简单的ping操作
        await mongoose.connection.db.admin().ping();
        
        return {
            status: 'healthy',
            message: 'MongoDB连接正常',
            type: 'mongodb',
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            message: `数据库健康检查失败: ${error.message}`,
            type: 'mongodb',
            error: error.message
        };
    }
}

module.exports = {
    config,
    getDatabaseConfig,
    connectMongoDB,
    disconnectMongoDB,
    getConnectionStatus,
    initializeDatabase,
    getDatabase,
    healthCheck,
    isConnected: () => isConnected
};