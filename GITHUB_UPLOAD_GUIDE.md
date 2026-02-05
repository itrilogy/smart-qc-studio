# Smart QC Studio - GitHub 上传指南

项目已完成品牌化配置与安全加固。请按照以下步骤将代码上传至 GitHub：

## 1. 创建 GitHub 仓库
1. 登录您的 [GitHub](https://github.com/) 账号。
2. 点击右上角的 **"+"** -> **"New repository"**。
3. Repository name 填入：`smart-qc-studio`。
4. 选择 **Public** 或 **Private**（视您的隐私需求而定）。
5. **不要** 勾选 "Initialize this repository with a README/license/gitignore"（因为本地已经创建完成）。
6. 点击 **"Create repository"**。

## 2. 本地执行 Git 指令
在您的终端（Terminal）进入项目根目录 `/Users/kwangwah/Code/qctools/smart-qc-studio`，依次执行：

```bash
# 1. 如果尚未初始化 git
git init

# 2. 将所有工作区文件加入缓存
git add .

# 3. 提交至本地仓库
git commit -m "chore: initial industrial branding and manuals sync"

# 4. 设置远程仓库地址 (请将 <your-username> 替换为您的 GitHub 用户名)
git remote add origin https://github.com/<your-username>/smart-qc-studio.git

# 5. 修改主分支名称为 main (可选，推荐)
git branch -M main

# 6. 推送到 GitHub
git push -u origin main
```

## 3. 注意事项 (IMPORTANT)
- **API Key 安全**：如果您本地有 `.env` 文件，我已经将其设为 Git 忽略。上传后 GitHub 仓库不会包含您的私密 API Key。
- **项目结构**：上传后，所有的专业手册均位于 `docs/` 目录下，`README.md` 已自动链接这些文档。

---
*完成此步骤后，您的 Smart QC Studio 即可作为正式仓库在 GitHub 展示。*
