const mongoose = require('mongoose');

// 想法模式定义
const ideaSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, '标题不能超过100个字符']
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: [1000, '描述不能超过1000个字符']
    },
    language: {
        type: String,
        required: true,
        enum: ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'php', 'ruby', 'typescript', 'c', 'csharp'],
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    complexity: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'expert'],
        default: 'medium'
    },
    estimatedTime: {
        type: String,
        default: null
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [20, '标签不能超过20个字符']
    }],
    validation: {
        isValid: {
            type: Boolean,
            default: null
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        feedback: {
            type: String,
            default: null
        },
        validatedAt: {
            type: Date,
            default: null
        }
    },
    generation: {
        generatedCode: {
            type: String,
            default: null
        },
        explanation: {
            type: String,
            default: null
        },
        generatedAt: {
            type: Date,
            default: null
        },
        model: {
            type: String,
            default: null
        }
    },
    execution: {
        lastExecutedAt: {
            type: Date,
            default: null
        },
        executionCount: {
            type: Number,
            default: 0
        },
        successCount: {
            type: Number,
            default: 0
        },
        lastResult: {
            success: {
                type: Boolean,
                default: null
            },
            output: {
                type: String,
                default: null
            },
            error: {
                type: String,
                default: null
            },
            executionTime: {
                type: Number,
                default: null
            }
        }
    },
    metadata: {
        source: {
            type: String,
            enum: ['extension', 'web', 'api'],
            default: 'extension'
        },
        userAgent: {
            type: String,
            default: null
        },
        ipAddress: {
            type: String,
            default: null
        }
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    isFavorite: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 虚拟字段：成功率
ideaSchema.virtual('successRate').get(function() {
    if (this.execution.executionCount === 0) return 0;
    return Math.round((this.execution.successCount / this.execution.executionCount) * 100);
});

// 虚拟字段：处理时间
ideaSchema.virtual('processingTime').get(function() {
    if (!this.generation.generatedAt || !this.validation.validatedAt) return null;
    return this.generation.generatedAt - this.validation.validatedAt;
});

// 索引
ideaSchema.index({ userId: 1, createdAt: -1 });
ideaSchema.index({ language: 1, status: 1 });
ideaSchema.index({ status: 1, createdAt: -1 });
ideaSchema.index({ tags: 1 });
ideaSchema.index({ isPublic: 1, createdAt: -1 });
ideaSchema.index({ 'validation.isValid': 1 });

// 实例方法
ideaSchema.methods.updateValidation = function(isValid, confidence, feedback) {
    this.validation.isValid = isValid;
    this.validation.confidence = confidence;
    this.validation.feedback = feedback;
    this.validation.validatedAt = new Date();
    return this.save();
};

ideaSchema.methods.updateGeneration = function(code, explanation, model) {
    this.generation.generatedCode = code;
    this.generation.explanation = explanation;
    this.generation.generatedAt = new Date();
    this.generation.model = model;
    this.status = 'completed';
    return this.save();
};

ideaSchema.methods.recordExecution = function(success, output, error, executionTime) {
    this.execution.lastExecutedAt = new Date();
    this.execution.executionCount += 1;
    if (success) {
        this.execution.successCount += 1;
    }
    this.execution.lastResult = {
        success,
        output,
        error,
        executionTime
    };
    return this.save();
};

ideaSchema.methods.toggleFavorite = function() {
    this.isFavorite = !this.isFavorite;
    return this.save();
};

// 静态方法
ideaSchema.statics.findByUser = function(userId, options = {}) {
    const query = { userId };
    if (options.status) query.status = options.status;
    if (options.language) query.language = options.language;
    if (options.isPublic !== undefined) query.isPublic = options.isPublic;
    
    return this.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .populate('userId', 'name email');
};

ideaSchema.statics.getPopularIdeas = function(limit = 10) {
    return this.find({ isPublic: true })
        .sort({ 'execution.executionCount': -1, createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name');
};

ideaSchema.statics.getStatsByLanguage = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$language',
                count: { $sum: 1 },
                avgSuccessRate: { 
                    $avg: {
                        $cond: [
                            { $eq: ['$execution.executionCount', 0] },
                            0,
                            { $multiply: [
                                { $divide: ['$execution.successCount', '$execution.executionCount'] },
                                100
                            ]}
                        ]
                    }
                }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// 中间件：保存前处理
ideaSchema.pre('save', function(next) {
    // 自动生成标题（如果为空）
    if (!this.title && this.description) {
        this.title = this.description.substring(0, 50) + (this.description.length > 50 ? '...' : '');
    }
    
    // 标签去重和清理
    if (this.tags && this.tags.length > 0) {
        this.tags = [...new Set(this.tags.filter(tag => tag && tag.trim()))];
    }
    
    next();
});

// 中间件：删除后清理
ideaSchema.post('remove', async function(doc) {
    try {
        // 删除相关的执行记录
        await mongoose.model('Execution').deleteMany({ ideaId: doc._id });
    } catch (error) {
        console.error('清理想法相关数据时出错:', error);
    }
});

module.exports = mongoose.model('Idea', ideaSchema);