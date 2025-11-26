#!/bin/bash

# Sora2 Video Maker Docker 启动脚本

set -e

echo "======================================"
echo "  Sora2 Video Maker Docker 启动"
echo "======================================"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

# 停止旧容器
echo "📦 停止旧容器..."
docker-compose down 2>/dev/null || true

# 构建并启动
echo "🔨 构建镜像并启动服务..."
docker-compose up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose ps

# 检查 API 健康状态
echo ""
echo "🔍 检查 API 服务..."
for i in {1..10}; do
    if curl -s http://localhost:5050/api/admin/db-status | grep -q "ok"; then
        echo "✅ API 服务正常运行"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "⚠️  API 服务可能还在启动中，请稍后检查"
    fi
    sleep 2
done

echo ""
echo "======================================"
echo "  启动完成！"
echo "======================================"
echo ""
echo "🌐 前端地址: http://localhost:3010"
echo "🔌 后端地址: http://localhost:5050"
echo "🗄️  数据库: localhost:3306 (root/Happy@2025)"
echo ""
echo "📝 常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  重建服务: docker-compose up --build -d"
echo ""
