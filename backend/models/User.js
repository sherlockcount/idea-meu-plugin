const mongoose = require('mongoose');

// 用户模式定义
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, '姓名不能超过50个字符']
    },
    avatar: {
        type: String,
        default: null
    },
    preferences: {
        defaultLanguage: {
            type: String,
            enum: ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'php', 'ruby'],
            default: 'python'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            browser: {
                type: Boolean,
                default: true
            }
        }
    },
    stats: {
        totalIdeas: {
            type: Number,
            default: 0
        },
        successfulExecutions: {
            type: Number,
            default: 0
        },
        totalExecutions: {
            type: Number,
            default: 0
        },
        favoriteLanguage: {
            type: String,
            default: null
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 虚拟字段：成功率
userSchema.virtual('successRate').get(function() {
    if (this.stats.totalExecutions === 0) return 0;
    return Math.round((this.stats.successfulExecutions / this.stats.totalExecutions) * 100);
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

// 实例方法
userSchema.methods.updateStats = function(executionSuccess = false) {
    if (executionSuccess) {
        this.stats.successfulExecutions += 1;
    }
    this.stats.totalExecutions += 1;
    return this.save();
};

userSchema.methods.updateLastLogin = function() {
    this.lastLoginAt = new Date();
    return this.save();
};

// 静态方法
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.getActiveUsers = function() {
    return this.find({ isActive: true }).sort({ createdAt: -1 });
};

// 中间件：保存前处理
userSchema.pre('save', function(next) {
    // 确保邮箱小写
    if (this.email) {
        this.email = this.email.toLowerCase();
    }
    next();
});

// 中间件：删除前清理相关数据
userSchema.pre('remove', async function(next) {
    try {
        // 删除用户相关的想法和执行记录
        await mongoose.model('Idea').deleteMany({ userId: this._id });
        await mongoose.model('Execution').deleteMany({ userId: this._id });
        await mongoose.model('ApiUsage').deleteMany({ userId: this._id });
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('User', userSchema);