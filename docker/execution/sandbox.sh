#!/bin/bash

# MEU安全沙箱执行脚本
# 用于在受限环境中安全执行用户代码

set -euo pipefail

# 配置变量
MAX_EXECUTION_TIME=300  # 5分钟超时
MAX_OUTPUT_SIZE=10485760  # 10MB输出限制
WORKSPACE_DIR="/workspace"
OUTPUT_DIR="/workspace/output"
TEMP_DIR="/tmp/meu_execution"

# 创建临时执行目录
mkdir -p "$TEMP_DIR" "$OUTPUT_DIR"
cd "$TEMP_DIR"

# 解析参数
LANGUAGE="$1"
PROJECT_ID="$2"
STEP_ID="$3"
CODE_FILE="$4"

# 验证输入参数
if [[ ! "$LANGUAGE" =~ ^(python|javascript|java|go|cpp|c)$ ]]; then
    echo "ERROR: Unsupported language: $LANGUAGE" >&2
    exit 1
fi

if [[ ! -f "$WORKSPACE_DIR/projects/$PROJECT_ID/$CODE_FILE" ]]; then
    echo "ERROR: Code file not found: $CODE_FILE" >&2
    exit 2
fi

# 复制代码文件到临时目录
cp "$WORKSPACE_DIR/projects/$PROJECT_ID/$CODE_FILE" "./"

# 设置资源限制
ulimit -t $MAX_EXECUTION_TIME  # CPU时间限制
ulimit -v 524288000  # 虚拟内存限制 (500MB)
ulimit -f 10240  # 文件大小限制 (10MB)
ulimit -n 100  # 文件描述符限制

# 执行函数
execute_code() {
    local start_time=$(date +%s)
    local output_file="$OUTPUT_DIR/${PROJECT_ID}_${STEP_ID}_output.txt"
    local error_file="$OUTPUT_DIR/${PROJECT_ID}_${STEP_ID}_error.txt"
    local status_file="$OUTPUT_DIR/${PROJECT_ID}_${STEP_ID}_status.json"
    echo "[DEBUG] OUTPUT_DIR content before execution:" >> "$error_file"
    ls -la "$OUTPUT_DIR" >> "$error_file"
    
    # 根据语言执行代码
    case "$LANGUAGE" in
        "python")
            timeout $MAX_EXECUTION_TIME python3 "$CODE_FILE" > "$output_file" 2> "$error_file"
            ;;
        "javascript")
            timeout $MAX_EXECUTION_TIME node "$CODE_FILE" > "$output_file" 2> "$error_file"
            ;;
        "java")
            # 编译Java代码
            javac "$CODE_FILE" 2> "$error_file"
            if [ $? -eq 0 ]; then
                local class_name=$(basename "$CODE_FILE" .java)
                timeout $MAX_EXECUTION_TIME java "$class_name" > "$output_file" 2>> "$error_file"
            fi
            ;;
        "go")
            timeout $MAX_EXECUTION_TIME go run "$CODE_FILE" > "$output_file" 2> "$error_file"
            ;;

        "c")
            gcc -o program "$CODE_FILE" 2> "$error_file"
            if [ $? -eq 0 ]; then
                chmod +x program
                timeout $MAX_EXECUTION_TIME ./program > "$output_file" 2>> "$error_file"
            fi
            ;;
    esac
    
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 限制输出文件大小
    if [ -f "$output_file" ] && [ $(stat -c%s "$output_file") -gt $MAX_OUTPUT_SIZE ]; then
        truncate -s $MAX_OUTPUT_SIZE "$output_file"
        echo "\n[OUTPUT TRUNCATED - EXCEEDED SIZE LIMIT]" >> "$output_file"
    fi
    
    # 生成执行状态报告
    cat > "$status_file" << EOF
{
    "projectId": "$PROJECT_ID",
    "stepId": "$STEP_ID",
    "language": "$LANGUAGE",
    "exitCode": $exit_code,
    "duration": $duration,
    "timestamp": "$(date -Iseconds)",
    "outputSize": $([ -f "$output_file" ] && stat -c%s "$output_file" || echo 0),
    "errorSize": $([ -f "$error_file" ] && stat -c%s "$error_file" || echo 0)
}
EOF
    
    return $exit_code
}

# 清理函数
cleanup() {
    cd /
    rm -rf "$TEMP_DIR"
}

# 设置清理陷阱
trap cleanup EXIT

# 执行代码
echo "Starting execution: $LANGUAGE code for project $PROJECT_ID, step $STEP_ID"
execute_code
exit_code=$?

echo "Execution completed with exit code: $exit_code"
exit $exit_code