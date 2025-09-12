const mongoose = require('mongoose');

// API使用统计模式定义
const apiUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    statusCode: {
        type: Number,
        required: true,
        index: true
    },
    responseTime: {
        type: Number, // 毫秒
        required: true
    },
    requestSize: {
        type: Number, // 字节
        default: 0
    },
    responseSize: {
        type: Number, // 字节
        default: 0
    },
    userAgent: {
        type: String,
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    referer: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    error: {
        message: {
            type: String,
            default: null
        },
        stack: {
            type: String,
            default: null
        }
    },
    metadata: {
        sessionId: {
            type: String,
            default: null
        },
        source: {
            type: String,
            enum: ['extension', 'web', 'api', 'test'],
            default: 'extension'
        },
        version: {
            type: String,
            default: null
        }
    }
}, {
    timestamps: false, // 使用自定义的 timestamp 字段
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 虚拟字段：是否成功
apiUsageSchema.virtual('isSuccess').get(function() {
    return this.statusCode >= 200 && this.statusCode < 300;
});

// 虚拟字段：响应时间等级
apiUsageSchema.virtual('performanceGrade').get(function() {
    const time = this.responseTime;
    if (time < 100) return 'A'; // 优秀
    if (time < 300) return 'B'; // 良好
    if (time < 500) return 'C'; // 一般
    if (time < 1000) return 'D'; // 较慢
    return 'F'; // 很慢
});

// 索引
apiUsageSchema.index({ userId: 1, timestamp: -1 });
apiUsageSchema.index({ endpoint: 1, timestamp: -1 });
apiUsageSchema.index({ statusCode: 1, timestamp: -1 });
apiUsageSchema.index({ timestamp: -1 });
apiUsageSchema.index({ 'metadata.source': 1, timestamp: -1 });

// 实例方法
apiUsageSchema.methods.getFormattedResponseTime = function() {
    const ms = this.responseTime;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

apiUsageSchema.methods.getFormattedSize = function(sizeType = 'response') {
    const bytes = sizeType === 'request' ? this.requestSize : this.responseSize;
    if (!bytes) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// 静态方法
apiUsageSchema.statics.recordUsage = function(data) {
    return this.create({
        userId: data.userId,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        requestSize: data.requestSize || 0,
        responseSize: data.responseSize || 0,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        referer: data.referer,
        error: data.error,
        metadata: data.metadata || {}
    });
};

apiUsageSchema.statics.getUsageStats = function(filter = {}, timeRange = '24h') {
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
        case '1h':
            startTime = new Date(now - 60 * 60 * 1000);
            break;
        case '24h':
            startTime = new Date(now - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = new Date(now - 24 * 60 * 60 * 1000);
    }
    
    const matchFilter = {
        ...filter,
        timestamp: { $gte: startTime }
    };
    
    return this.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                successfulRequests: {
                    $sum: {
                        $cond: [
                            { $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 300] }] },
                            1,
                            0
                        ]
                    }
                },
                avgResponseTime: { $avg: '$responseTime' },
                minResponseTime: { $min: '$responseTime' },
                maxResponseTime: { $max: '$responseTime' },
                totalDataTransfer: { $sum: { $add: ['$requestSize', '$responseSize'] } }
            }
        },
        {
            $project: {
                _id: 0,
                totalRequests: 1,
                successfulRequests: 1,
                successRate: {
                    $multiply: [
                        { $divide: ['$successfulRequests', '$totalRequests'] },
                        100
                    ]
                },
                avgResponseTime: { $round: ['$avgResponseTime', 2] },
                minResponseTime: 1,
                maxResponseTime: 1,
                totalDataTransfer: 1
            }
        }
    ]);
};

apiUsageSchema.statics.getEndpointStats = function(timeRange = '24h') {
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
        case '1h':
            startTime = new Date(now - 60 * 60 * 1000);
            break;
        case '24h':
            startTime = new Date(now - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = new Date(now - 24 * 60 * 60 * 1000);
    }
    
    return this.aggregate([
        { $match: { timestamp: { $gte: startTime } } },
        {
            $group: {
                _id: '$endpoint',
                count: { $sum: 1 },
                successCount: {
                    $sum: {
                        $cond: [
                            { $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 300] }] },
                            1,
                            0
                        ]
                    }
                },
                avgResponseTime: { $avg: '$responseTime' },
                totalDataTransfer: { $sum: { $add: ['$requestSize', '$responseSize'] } }
            }
        },
        {
            $project: {
                endpoint: '$_id',
                count: 1,
                successCount: 1,
                successRate: {
                    $multiply: [
                        { $divide: ['$successCount', '$count'] },
                        100
                    ]
                },
                avgResponseTime: { $round: ['$avgResponseTime', 2] },
                totalDataTransfer: 1
            }
        },
        { $sort: { count: -1 } }
    ]);
};

apiUsageSchema.statics.getUserStats = function(userId, timeRange = '24h') {
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
        case '1h':
            startTime = new Date(now - 60 * 60 * 1000);
            break;
        case '24h':
            startTime = new Date(now - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = new Date(now - 24 * 60 * 60 * 1000);
    }
    
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), timestamp: { $gte: startTime } } },
        {
            $group: {
                _id: '$endpoint',
                count: { $sum: 1 },
                avgResponseTime: { $avg: '$responseTime' },
                lastUsed: { $max: '$timestamp' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// 中间件：定期清理旧数据
apiUsageSchema.statics.cleanupOldData = function(daysToKeep = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    return this.deleteMany({ timestamp: { $lt: cutoffDate } });
};

module.exports = mongoose.model('ApiUsage', apiUsageSchema);