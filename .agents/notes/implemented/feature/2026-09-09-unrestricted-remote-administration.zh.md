# Agent Note: 不受限远程管理的显式开关

Status: implemented

[English](2026-09-09-unrestricted-remote-administration.md) | 中文

## 问题

通过公网 IP 暴露 Web 应用的操作者需要一个设置，同时放行管理请求并启用远程管理控件。仅修改监听地址仍保留请求信任、浏览器认证和 Client loopback 限制。

## 决策

Web 启动时采样一次 `DSH_UNSAFE_ALLOW_REMOTE`，只有 `1` 启用不受限访问。随附 profile 默认监听所有网卡，并将 `unsafeAllowRemote` 传给 Connection。显式指定的主机仍然优先。Connection 在 HTTP 路由和 WebSocket 升级的共享授权操作中跳过 Host/Origin/Fetch-Metadata 与浏览器会话校验。首页请求不需要令牌，启动 URL 不含令牌，Host 注入的布尔值为远程 authority 启用 Client 管理控件。

请求解码、请求体大小限制和工具权限仍各自强制执行。浏览器认证仍初始化其凭据状态，让普通 Connection 重新配置可以恢复默认策略。

## 曾考虑的替代方案

**仅扩展可信主机。** cookie 认证与远程页面管理限制仍然生效，因此无法提供不受限管理。

**从监听地址推断授权。** 可达性不代表允许删除访问控制。精确的显式开关保留默认安全策略。

## 后果

所有能连接的调用者都拥有完整 Host API 权限，包括设置和可使用工具的 Session。这主动放弃浏览器身份、DNS rebinding 防护与跨站请求拒绝。

[浏览器信任](../architecture/2026-07-28-api-browser-trust-boundary.zh.md)与[浏览器认证](../architecture/2026-08-24-browser-token-authentication.zh.md)决策仍对默认策略有效。它们仅被部分替代，安全依据仍有价值。

## 验证

针对性测试覆盖精确启用条件、默认拒绝、管理 HTTP 分发、首页访问、升级授权和远程页面策略。无需密钥的真实 profile 预期输出场景覆盖启动设置、未经认证的远程 authority 请求和页面引导策略。
