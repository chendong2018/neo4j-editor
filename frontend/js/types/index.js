/**
 * 数据结构文档说明
 */

/**
 * 节点数据结构
 * @typedef {
 *   id: string;
 *   labels: string[];
 *   properties: Object;
 * } Node
 */

/**
 * 关系数据结构
 * @typedef {
 *   id: string;
 *   type: string;
 *   startNodeId: string;
 *   endNodeId: string;
 *   properties: Object;
 * } Relationship
 */

/**
 * 图索引数据结构
 * @typedef {
 *   // 按节点 ID 快速获取其所有关联关系 ID 列表
 *   nodeToRelationships: Object;
 *   // 按关系类型分组的关系 ID 列表
 *   relationshipsByType: Object;
 * }
 */

/**
 * 双视图配置选项
 * @typedef {
 *   // 层级树创建时是否自动连同父兄弟
 *   autoConnectInTreeCreation: boolean;
 *   // 移动到新父时是否自动连接
 *   autoConnectOnMove: boolean;
 * }
 */

/**
 * 节点创建上下文类型
 * @typedef {'tree' | 'network'}
 */

/**
 * 层级树节点结构
 * @typedef {
 *   node: Node;
 *   children: HierarchyTreeNode[];
 * }
 */

/**
 * 关系网数据结构
 * @typedef {
 *   nodes: Node[];
 *   relationships: Relationship[];
 *   parentId: string | null;
 * }
 */