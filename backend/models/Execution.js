const mongoose = require('mongoose');

// 执行记录模式定义
const executionSchema = new mongoose.Schema({
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true,
        enum: ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'php', 'ruby', 'typescript', 'c', 'csharp']
    },
    input: {
        type: String,
        default: null
    },
    result: {
        success: {
            type: Boolean,
            required: true,
            index: true
        },
        output: {
            type: String,
            default: null
        },
        error: {
            message: {
                type: String,
                default: null
            },
            stack: {
                type: String,
                default: null
            },
            type: {
                type: String,
                default: null
            }
        },
        exitCode: {
            type: Number,
            default: null
        }
    },
    performance: {
        executionTime: {
            type: Number, // 毫秒
            required: true
        },
        memoryUsage: {
            type: Number, // 字节
            default: null
        },
        cpuUsage: {
            type: Number, // 百分比
            default: null
        }
    },
    environment: {
        runtime: {
            type: String,
            default: null
        },
        version: {
            type: String,
            default: null
        },
        platform: {
            type: String,
            default: null
        },
        nodeVersion: {
            type: String,
            default: process.version
        }
    },
    metadata: {
        source: {
            type: String,
            enum: ['extension', 'web', 'api', 'test'],
            default: 'extension'
        },
        userAgent: {
            type: String,
            default: null
        },
        ipAddress: {
            type: String,
            default: null
        },
        sessionId: {
            type: String,
            default: null
        }
    },
    tags: [{
        type: String,
        trim: true
    }],
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 虚拟字段：执行状态描述
executionSchema.virtual('statusDescription').get(function() {
    if (this.result.success) {
        return '执行成功';
    } else if (this.result.error.type) {
        return `执行失败: ${this.result.error.type}`;
    } else {
        return '执行失败';
    }
});

// 虚拟字段：性能等级
executionSchema.virtual('performanceGrade').get(function() {
    const time = this.performance.executionTime;
    if (time < 100) return 'A'; // 优秀
    if (time < 500) return 'B'; // 良好
    if (time < 1000) return 'C'; // 一般
    if (time < 5000) return 'D'; // 较慢
    return 'F'; // 很慢
});

// 索引
executionSchema.index({ ideaId: 1, createdAt: -1 });
executionSchema.index({ userId: 1, createdAt: -1 });
executionSchema.index({ 'result.success': 1, createdAt: -1 });
executionSchema.index({ language: 1, 'result.success': 1 });
executionSchema.index({ 'performance.executionTime': 1 });
executionSchema.index({ createdAt: -1 });
executionSchema.index({ isPublic: 1, createdAt: -1 });

// 实例方法
executionSchema.methods.getFormattedDuration = function() {
    const ms = this.performance.executionTime;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
};

executionSchema.methods.getFormattedMemory = function() {
    const bytes = this.performance.memoryUsage;
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
};

executionSchema.methods.addTag = function(tag) {
    if (tag && !this.tags.includes(tag)) {
        this.tags.push(tag);
        return this.save();
    }
    return Promise.resolve(this);
};

executionSchema.methods.removeTag = function(tag) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
        this.tags.splice(index, 1);
        return this.save();
    }
    return Promise.resolve(this);
};

// 静态方法
executionSchema.statics.findByIdea = function(ideaId, options = {}) {
    const query = { ideaId };
    if (options.success !== undefined) query['result.success'] = options.success;
    
    return this.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .populate('userId', 'name email')
        .populate('ideaId', 'title description language');
};

executionSchema.statics.findByUser = function(userId, options = {}) {
    const query = { userId };
    if (options.success !== undefined) query['result.success'] = options.success;
    if (options.language) query.language = options.language;
    
    return this.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 100)
        .populate('ideaId', 'title description');
};

executionSchema.statics.getSuccessRate = function(filter = {}) {
    return this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                successful: {
                    $sum: {
                        $cond: ['$result.success', 1, 0]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                successful: 1,
                successRate: {
                    $multiply: [
                        { $divide: ['$successful', '$total'] },
                        100
                    ]
                }
            }
        }
    ]);
};

executionSchema.statics.getPerformanceStats = function(filter = {}) {
    return this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                avgExecutionTime: { $avg: '$performance.executionTime' },
                minExecutionTime: { $min: '$performance.executionTime' },
                maxExecutionTime: { $max: '$performance.executionTime' },
                totalExecutions: { $sum: 1 }
            }
        }
    ]);
};

executionSchema.statics.getLanguageStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$language',
                count: { $sum: 1 },
                successCount: {
                    $sum: {
                        $cond: ['$result.success', 1, 0]
                    }
                },
                avgExecutionTime: { $avg: '$performance.executionTime' }
            }
        },
        {
            $project: {
                language: '$_id',
                count: 1,
                successCount: 1,
                successRate: {
                    $multiply: [
                        { $divide: ['$successCount', '$count'] },
                        100
                    ]
                },
                avgExecutionTime: { $round: ['$avgExecutionTime', 2] }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// 中间件：保存前处理
executionSchema.pre('save', function(next) {
    // 标签去重和清理
    if (this.tags && this.tags.length > 0) {
        this.tags = [...new Set(this.tags.filter(tag => tag && tag.trim()))];
    }
    
    // 设置环境信息
    if (!this.environment.platform) {
        this.environment.platform = process.platform;
    }
    
    next();
});

// 中间件：保存后更新相关统计
executionSchema.post('save', async function(doc) {
    try {
        // 更新想法的执行统计
        const Idea = mongoose.model('Idea');
        const idea = await Idea.findById(doc.ideaId);
        if (idea) {
            await idea.recordExecution(
                doc.result.success,
                doc.result.output,
                doc.result.error.message,
                doc.performance.executionTime
            );
        }
        
        // 更新用户统计
        const User = mongoose.model('User');
        const user = await User.findById(doc.userId);
        if (user) {
            await user.updateStats(doc.result.success);
        }
    } catch (error) {
        console.error('更新执行统计时出错:', error);
    }
});

module.exports = mongoose.model('Execution', executionSchema);