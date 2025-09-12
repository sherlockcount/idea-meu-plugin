#!/bin/bash

# Idea → MEU AI服务配置脚本
# 此脚本帮助您快速配置DeepSeek API

echo "🤖 Idea → MEU AI服务配置向导"
echo "================================="
echo ""

# 检查.env文件是否存在
if [ ! -f "backend/.env" ]; then
    echo "❌ 错误: backend/.env 文件不存在"
    echo "请先运行项目初始化脚本"
    exit 1
fi

# 获取用户输入
echo "请输入您的DeepSeek API密钥:"
echo "(您可以在 https://www.deepseek.com/ 获取API密钥)"
read -p "API密钥: " api_key

if [ -z "$api_key" ]; then
    echo "❌ API密钥不能为空"
    exit 1
fi

# 询问API URL (可选)
echo ""
echo "请输入DeepSeek API URL (按回车使用默认值):"
read -p "API URL [https://api.deepseek.com]: " api_url
api_url=${api_url:-"https://api.deepseek.com"}

# 询问模型 (可选)
echo ""
echo "请选择要使用的模型 (按回车使用默认值):"
echo "1. deepseek-coder (推荐，专门用于代码生成)"
echo "2. deepseek-chat (通用对话模型)"
read -p "选择 [1]: " model_choice
model_choice=${model_choice:-1}

if [ "$model_choice" = "2" ]; then
    model="deepseek-chat"
else
    model="deepseek-coder"
fi

echo ""
echo "📝 正在更新配置文件..."

# 备份原始文件
cp backend/.env backend/.env.backup

# 更新.env文件
sed -i '' "s/# DEEPSEEK_API_KEY=your_deepseek_api_key_here/DEEPSEEK_API_KEY=$api_key/" backend/.env
sed -i '' "s|# DEEPSEEK_API_URL=https://api.deepseek.com|DEEPSEEK_API_URL=$api_url|" backend/.env
sed -i '' "s/# DEEPSEEK_MODEL=deepseek-coder/DEEPSEEK_MODEL=$model/" backend/.env

echo "✅ 配置已更新!"
echo ""
echo "📋 配置摘要:"
echo "  API密钥: ${api_key:0:8}..."
echo "  API URL: $api_url"
echo "  模型: $model"
echo ""
echo "🚀 下一步:"
echo "1. 重启后端服务器: cd backend && npm start"
echo "2. 打开 test.html 测试AI功能"
echo "3. 查看 AI_SETUP.md 获取更多配置选项"
echo ""
echo "💡 提示: 原始配置文件已备份为 backend/.env.backup"
echo ""
echo "🎉 配置完成! 享受AI驱动的代码生成吧!"