# Neo4j 双视图编辑器

一个功能强大的Neo4j图数据库可视化编辑器，支持双视图（树视图和网络图视图）编辑和管理图数据。

## 功能特性

- **双视图编辑**：同时支持树视图和网络图视图，满足不同场景的需求
- **实时同步**：两个视图之间的数据实时同步，确保一致性
- **属性编辑**：支持节点和关系的属性编辑、添加和删除
- **标签管理**：支持Neo4j节点标签的管理
- **数据导入导出**：支持JSON格式的数据导入导出
- **Neo4j集成**：支持与Neo4j数据库的连接、数据导入和导出
- **上下文菜单**：右键菜单提供快捷操作
- **响应式设计**：适配不同屏幕尺寸

## 项目结构

```
frontend/
├── index.html             # HTML入口文件
├── js/                    # JavaScript源代码目录
│   ├── core/              # 核心模块
│   │   └── init.js        # 初始化模块
│   ├── views/             # 视图相关模块
│   │   ├── viewManager.js # 视图管理器
│   │   ├── viewSync.js    # 视图同步管理器
│   │   └── graphEditor.js # 图编辑器核心功能
│   ├── data/              # 数据管理模块
│   │   └── graphDataManager.js # 图数据管理器
│   ├── ui/                # UI组件模块
│   │   └── contextMenuManager.js # 上下文菜单管理器
│   ├── neo4j/             # Neo4j相关模块
│   │   └── apiManager.js  # Neo4j API管理器
│   ├── components/        # 组件模块
│   │   └── propertyEditor.js # 属性编辑器
│   ├── utils/             # 工具函数
│   │   └── utils.js       # 通用工具函数
│   └── index.js           # 主入口JavaScript文件
└── 双视图功能开发计划.md   # 功能开发计划文档
```

## 核心模块说明

### 1. 核心模块 (core/)

- **init.js**: 负责应用的初始化，模块加载和系统配置

### 2. 视图模块 (views/)

- **viewManager.js**: 管理视图模式切换（双视图/单视图），视图控制等
- **viewSync.js**: 管理两个视图之间的数据同步和事件同步
- **graphEditor.js**: 提供图编辑的核心功能，如节点选择、创建、删除等

### 3. 数据模块 (data/)

- **graphDataManager.js**: 管理图数据的存储、过滤、导出等操作

### 4. UI模块 (ui/)

- **contextMenuManager.js**: 管理右键上下文菜单的显示和操作

### 5. Neo4j模块 (neo4j/)

- **apiManager.js**: 处理与Neo4j数据库的通信，包括连接测试、数据导入导出等

### 6. 组件模块 (components/)

- **propertyEditor.js**: 实现属性编辑面板的功能

### 7. 工具模块 (utils/)

- **utils.js**: 提供通用的工具函数，如数组操作、唯一ID生成、深拷贝等

## 使用说明

### 启动应用

1. 确保您的浏览器支持现代JavaScript特性
2. 在前端目录下启动一个HTTP服务器（如Python的http.server）
3. 在浏览器中访问相应的URL

### 基本操作

- **创建节点**：在空白区域右键点击，选择"创建节点"
- **创建关系**：右键点击源节点，选择"创建关系"，然后点击目标节点
- **编辑属性**：选择节点或关系后，在左侧属性面板中编辑
- **删除元素**：选择元素后，使用右键菜单或删除键删除
- **视图切换**：点击工具栏中的视图模式按钮切换视图模式
- **布局刷新**：点击视图控制区的"刷新布局"按钮重排元素

### Neo4j连接

1. 在左侧面板填写Neo4j连接信息
2. 点击"保存设置"保存配置
3. 点击"连接Neo4j"测试连接
4. 使用"从Neo4j导入"和"导出到Neo4j"进行数据交换

## 技术栈

- **前端框架**：原生JavaScript
- **图形库**：Cytoscape.js (v3.26.0)
- **布局算法**：cose-bilkent
- **样式**：纯CSS
- **API通信**：Fetch API

## 浏览器兼容性

支持所有现代浏览器的最新版本，包括：

- Chrome
- Firefox
- Safari
- Edge

## 许可证

本项目为开源项目，仅供学习和参考使用。

## 注意事项

- 大型图数据可能会影响性能，建议分批加载和处理
- 本地存储的数据可能会受到浏览器存储限制
- 连接Neo4j数据库时，请确保网络连接正常且数据库配置正确

![Neo4j Visual Editor](https://p3-flow-imagex-sign.byteimg.com/tos-cn-i-a9rns2rl98/rc/pc/super_tool/c64217982dd84f32aa6810128ab1fd5c~tplv-a9rns2rl98-image.image?rcl=202510181712324CD9FAC697FBBBFAA366&rk3s=8e244e95&rrcfp=f06b921b&x-expires=1763370809&x-signature=5hTViufMFra61rQu%2BPC1MgPAytY%3D)

## Features

- **Node Operations**: Create, delete, and edit nodes with custom properties
- **Relationship Operations**: Create, delete, and edit relationships between nodes
- **Batch Operations**: Apply properties to multiple selected nodes
- **Cypher Preview**: Real-time Cypher query generation based on user actions
- **Neo4j Integration**: Connect to Neo4j database and load/save graphs
- **Custom Node Types**: Create custom node types with different colors and icons
- **Custom Relationship Types**: Create custom relationship types with different colors

## Tech Stack

- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript, Cytoscape.js
- **Backend**: Python, Flask, neo4j-driver

## Getting Started

### Prerequisites

- Python 3.7 or higher
- Neo4j database (local or remote)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/neo4j-visual-editor.git
cd neo4j-visual-editor
```

2. Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

3. Create a `requirements.txt` file in the backend directory:

```
Flask==2.0.1
Flask-CORS==3.0.10
neo4j==4.4.1
```

4. Run the backend server:

```bash
python app.py
```

5. Open the frontend in a web browser:

```bash
cd ../frontend
open index.html
```

## Usage

### Connecting to Neo4j

1. Click the "Connect" button in the top right corner
2. Enter your Neo4j connection details (URI, username, password)
3. Click "Connect" to establish a connection

### Creating Nodes

1. Select a node type from the left sidebar (Person, Movie, Book, Company, etc.)
2. Click the "Node" button in the top left corner to enter node creation mode
3. Click anywhere on the canvas to create a new node
4. Edit the node properties in the right sidebar and click "Apply"

### Creating Relationships

1. Select a relationship type from the left sidebar (ACTED_IN, DIRECTED, etc.)
2. Click the "Relationship" button in the top left corner to enter relationship creation mode
3. Click on a source node, then click on a target node to create a relationship
4. Edit the relationship properties in the right sidebar and click "Apply"

### Editing Properties

1. Select a node or relationship by clicking on it
2. Edit the properties in the right sidebar
3. Click "Apply" to save the changes

### Batch Operations

1. Select multiple nodes by holding down the Shift key and clicking on nodes
2. Enter a property key and value in the "Batch Operations" panel at the bottom of the right sidebar
3. Click "Apply to Selected" to apply the property to all selected nodes

### Cypher Preview

- The Cypher query corresponding to your current operation is displayed in the bottom panel
- Click "Run" to execute the Cypher query against the connected Neo4j database
- Click "Clear" to clear the Cypher preview panel

### Exporting the Graph

1. Click the "Export" button in the left sidebar
2. The graph will be downloaded as a JSON file

## Customization

### Adding Custom Node Types

1. Click the "Add" button in the "Node Types" panel
2. Enter a name, select an icon, and choose a color
3. Click "Add" to create the new node type

### Adding Custom Relationship Types

1. Click the "Add" button in the "Relationship Types" panel
2. Enter a name and choose a color
3. Click "Add" to create the new relationship type

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
