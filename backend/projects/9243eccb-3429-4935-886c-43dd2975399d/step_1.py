import time
from datetime import datetime


def display_current_time():
    """
    显示当前时间的函数
    
    功能:
    - 获取当前系统时间
    - 以可读格式显示时间
    - 每秒更新一次时间显示
    """
    try:
        while True:
            # 获取当前时间
            current_time = datetime.now()
            
            # 格式化时间显示
            formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
            
            # 清屏并显示当前时间
            print("\033c", end="")  # 清屏转义序列
            print(f"当前时间: {formatted_time}")
            print("按 Ctrl+C 退出程序")
            
            # 等待1秒
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n程序已退出")


if __name__ == "__main__":
    display_current_time()