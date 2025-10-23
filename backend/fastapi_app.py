from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from neo4j import GraphDatabase, exceptions
import os

# 创建FastAPI应用实例
app = FastAPI(title="Neo4j Editor API", description="API for interacting with Neo4j database")

# 配置静态文件服务，指向frontend目录
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

# 根路径路由，返回index.html
@app.get("/")
def read_root():
    """返回Neo4j编辑器的主页面"""
    index_path = os.path.join(frontend_dir, "index.html")
    return FileResponse(index_path)

# Health check endpoint
@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend service is running"""
    return {"status": "healthy", "service": "Neo4j Editor API"}

# Add CORS middleware\n
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Global Neo4j driver instance
neo4j_driver = None

# Pydantic models for request validation
class ConnectRequest(BaseModel):
    uri: str
    user: str
    password: str

class NodeIdRequest(BaseModel):
    node_ids: List[str]
    property_key: str
    property_value: Any

class RelationshipCreateRequest(BaseModel):
    source: str
    target: str
    type: str
    properties: Optional[Dict[str, Any]] = {}

class RelationshipUpdateRequest(BaseModel):
    type: str
    properties: Optional[Dict[str, Any]] = {}

class CypherRequest(BaseModel):
    query: str

# Dependency to check Neo4j connection
def get_neo4j_driver():
    if not neo4j_driver:
        raise HTTPException(status_code=400, detail="Not connected to Neo4j")
    return neo4j_driver

@app.post("/api/connect", response_model=Dict[str, str])
@app.post("/connect", response_model=Dict[str, str])  # 添加别名端点以兼容前端
async def connect_to_neo4j(connect_data: ConnectRequest):
    """Connect to Neo4j database"""
    print(f"=== Starting POST /api/connect request handling ===")
    print(f"Connection data received: URI={connect_data.uri}, User={connect_data.user}")
    global neo4j_driver
    
    try:
        # Close existing connection if any
        print("Step 1: Checking for existing Neo4j connection")
        try:
            if neo4j_driver:
                print("Closing existing Neo4j connection")
                neo4j_driver.close()
                print("Existing connection closed successfully")
            else:
                print("No existing Neo4j connection found")
        except Exception as e:
            print(f"ERROR: Failed to close existing connection: {type(e).__name__}: {str(e)}")
        
        # Create new driver
        print("Step 2: Creating new Neo4j driver")
        print(f"Creating driver with URI: {connect_data.uri} and user: {connect_data.user}")
        try:
            neo4j_driver = GraphDatabase.driver(connect_data.uri, auth=(connect_data.user, connect_data.password))
            print(f"SUCCESS: Neo4j driver created successfully: {type(neo4j_driver).__name__}")
        except Exception as driver_error:
            error_type = type(driver_error).__name__
            print(f"ERROR: Error creating Neo4j driver: {error_type}: {str(driver_error)}")
            raise HTTPException(status_code=500, detail=f'Failed to create Neo4j driver: {error_type}: {str(driver_error)}')
        
        # Verify connection
        print("Step 3: Verifying Neo4j connection")
        try:
            print("Opening Neo4j session for verification")
            with neo4j_driver.session() as session:
                print("Session created, executing test query: MATCH (n) RETURN count(n) LIMIT 1")
                result = session.run("MATCH (n) RETURN count(n) LIMIT 1")
                count = result.single()[0]
                print(f"SUCCESS: Connection verified! Database has {count} nodes")
            
            return {'status': 'success', 'message': f'Connected to Neo4j successfully, database has {count} nodes'}
        except exceptions.ServiceUnavailable as e:
            error_type = type(e).__name__
            print(f"ERROR: Neo4j {error_type}: {str(e)}")
            raise HTTPException(status_code=503, detail=f'Neo4j service unavailable: {error_type}: {str(e)}. Please check if Neo4j database is running and the connection URI is correct.')
        except exceptions.AuthError as e:
            error_type = type(e).__name__
            print(f"ERROR: Neo4j {error_type}: {str(e)}")
            raise HTTPException(status_code=401, detail=f'Authentication failed: {error_type}: {str(e)}')
        except Exception as verify_error:
            error_type = type(verify_error).__name__
            print(f"ERROR: Error verifying connection: {error_type}: {str(verify_error)}")
            raise HTTPException(status_code=500, detail=f'Failed to verify connection: {error_type}: {str(verify_error)}')
    except HTTPException as http_exc:
        print(f"HTTPException raised: Status {http_exc.status_code}, Detail: {http_exc.detail}")
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        error_type = type(e).__name__
        print(f"CRITICAL: Unexpected error in connect_to_neo4j: {error_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f'Unexpected error: {error_type}: {str(e)}')
    finally:
        print("=== POST /api/connect request handling completed ===")
    

@app.post("/api/disconnect", response_model=Dict[str, str])
@app.post("/disconnect", response_model=Dict[str, str])  # 添加别名端点以兼容前端
async def disconnect_from_neo4j():
    """Disconnect from Neo4j database"""
    global neo4j_driver
    
    try:
        if neo4j_driver:
            neo4j_driver.close()
            neo4j_driver = None
        
        return {'status': 'success', 'message': 'Disconnected from Neo4j successfully'}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph", response_model=Dict[str, Any])
def get_graph(driver: Any = Depends(get_neo4j_driver)):
    """Get the entire graph from Neo4j with support for node level properties"""
    try:
        with driver.session() as session:
            # Get nodes
            nodes_result = session.run("""
                MATCH (n)
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
            """)
            
            nodes = []
            for record in nodes_result:
                node_id = record['id']
                labels = record['labels']
                properties = record['properties']
                
                # Use the first label as the main label
                label = labels[0] if labels else 'Node'
                
                # Add id to properties
                properties['id'] = str(node_id)
                
                # Create node data structure
                node_data = {
                    'group': 'nodes',
                    'data': {
                        'id': str(node_id),
                        'label': label,
                        'type': label,  # Add type field for styling
                        'properties': properties
                    }
                }
                
                # Extract level property if it exists and add it directly to node data
                if 'level' in properties:
                    node_data['data']['level'] = properties['level']
                
                nodes.append(node_data)
            
            # Get relationships
            relationships_result = session.run("""
                MATCH (a)-[r]->(b)
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """)
            
            edges = []
            for record in relationships_result:
                rel_id = record['id']
                source = record['source']
                target = record['target']
                rel_type = record['type']
                properties = record['properties']
                
                # Add id to properties
                properties['id'] = str(rel_id)
                
                edges.append({
                    'group': 'edges',
                    'data': {
                        'id': str(rel_id),
                        'source': str(source),
                        'target': str(target),
                        'label': rel_type,
                        'type': rel_type,  # Add type field for styling
                        'properties': properties
                    }
                })
            
            return {
                'status': 'success',
                'nodes': nodes,
                'edges': edges
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/nodes", response_model=Dict[str, Any])
def get_nodes(driver: Any = Depends(get_neo4j_driver)):
    """Get all nodes from Neo4j"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (n)
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
            """)
            
            nodes = []
            for record in result:
                node_id = record['id']
                labels = record['labels']
                properties = record['properties']
                
                # Use the first label as the main label
                label = labels[0] if labels else 'Node'
                
                # Add id to properties
                properties['id'] = str(node_id)
                
                nodes.append({
                    'id': str(node_id),
                    'label': label,
                    'labels': labels,
                    'properties': properties
                })
            
            return {
                'status': 'success',
                'nodes': nodes
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/nodes/{node_id}", response_model=Dict[str, Any])
def get_node(node_id: str, driver: Any = Depends(get_neo4j_driver)):
    """Get a specific node by ID"""
    try:
        node_id_int = int(node_id)
        
        with driver.session() as session:
            result = session.run("""
                MATCH (n)
                WHERE id(n) = $node_id
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
            """, node_id=node_id_int)
            
            record = result.single()
            
            if not record:
                raise HTTPException(status_code=404, detail='Node not found')
            
            node_id = record['id']
            labels = record['labels']
            properties = record['properties']
            
            # Use the first label as the main label
            label = labels[0] if labels else 'Node'
            
            # Add id to properties
            properties['id'] = str(node_id)
            
            return {
                'status': 'success',
                'node': {
                    'id': str(node_id),
                    'label': label,
                    'labels': labels,
                    'properties': properties
                }
            }
    
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid node ID')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/nodes/{node_id}", response_model=Dict[str, str])
def delete_node(node_id: str, driver: Any = Depends(get_neo4j_driver)):
    """Delete a node from Neo4j"""
    try:
        node_id_int = int(node_id)
        
        with driver.session() as session:
            # Delete node and all relationships
            result = session.run("""
                MATCH (n)
                WHERE id(n) = $node_id
                DETACH DELETE n
                RETURN count(n) as count
            """, node_id=node_id_int)
            
            record = result.single()
            
            if record['count'] == 0:
                raise HTTPException(status_code=404, detail='Node not found')
            
            return {'status': 'success', 'message': 'Node deleted successfully'}
    
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid node ID')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/nodes/batch", response_model=Dict[str, Any])
def batch_update_nodes(node_data: NodeIdRequest, driver: Any = Depends(get_neo4j_driver)):
    """Batch update nodes in Neo4j"""
    if not node_data.node_ids or not node_data.property_key:
        raise HTTPException(status_code=400, detail='Node IDs and property key are required')
    
    try:
        with driver.session() as session:
            # Convert node IDs to integers
            node_ids_int = [int(id) for id in node_data.node_ids]
            
            # Update nodes
            result = session.run("""
                MATCH (n)
                WHERE id(n) IN $node_ids
                SET n[$property_key] = $property_value
                RETURN count(n) as count
            """, node_ids=node_ids_int, property_key=node_data.property_key, property_value=node_data.property_value)
            
            record = result.single()
            
            return {
                'status': 'success',
                'message': f'Updated {record["count"]} nodes',
                'count': record['count']
            }
    
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid node ID')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/relationships", response_model=Dict[str, Any])
def get_relationships(driver: Any = Depends(get_neo4j_driver)):
    """Get all relationships from Neo4j"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (a)-[r]->(b)
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """)
            
            relationships = []
            for record in result:
                rel_id = record['id']
                source = record['source']
                target = record['target']
                rel_type = record['type']
                properties = record['properties']
                
                # Add id to properties
                properties['id'] = str(rel_id)
                
                relationships.append({
                    'id': str(rel_id),
                    'source': str(source),
                    'target': str(target),
                    'label': rel_type,
                    'type': rel_type,
                    'properties': properties
                })
            
            return {
                'status': 'success',
                'relationships': relationships
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/relationships/{rel_id}", response_model=Dict[str, Any])
def get_relationship(rel_id: str, driver: Any = Depends(get_neo4j_driver)):
    """Get a specific relationship by ID"""
    try:
        rel_id_int = int(rel_id)
        
        with driver.session() as session:
            result = session.run("""
                MATCH (a)-[r]->(b)
                WHERE id(r) = $rel_id
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """, rel_id=rel_id_int)
            
            record = result.single()
            
            if not record:
                raise HTTPException(status_code=404, detail='Relationship not found')
            
            rel_id = record['id']
            source = record['source']
            target = record['target']
            rel_type = record['type']
            properties = record['properties']
            
            # Add id to properties
            properties['id'] = str(rel_id)
            
            return {
                'status': 'success',
                'relationship': {
                    'id': str(rel_id),
                    'source': str(source),
                    'target': str(target),
                    'label': rel_type,
                    'type': rel_type,
                    'properties': properties
                }
            }
    
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid relationship ID')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/relationships", response_model=Dict[str, Any])
def create_relationship(rel_data: RelationshipCreateRequest, driver: Any = Depends(get_neo4j_driver)):
    """Create a new relationship in Neo4j"""
    if not rel_data.source or not rel_data.target or not rel_data.type:
        raise HTTPException(status_code=400, detail='Source, target, and type are required')
    
    try:
        source_id = int(rel_data.source)
        target_id = int(rel_data.target)
        
        with driver.session() as session:
            # Create relationship
            result = session.run(f"""
                MATCH (a), (b)
                WHERE id(a) = $source_id AND id(b) = $target_id
                CREATE (a)-[r:{rel_data.type}]->(b)
                SET r = $properties
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """, source_id=source_id, target_id=target_id, properties=rel_data.properties)
            
            record = result.single()
            
            if not record:
                raise HTTPException(status_code=404, detail='One or both nodes not found')
            
            rel_id = record['id']
            source = record['source']
            target = record['target']
            rel_type = record['type']
            properties = record['properties']
            
            # Add id to properties
            properties['id'] = str(rel_id)
            
            return {
                'status': 'success',
                'relationship': {
                    'id': str(rel_id),
                    'source': str(source),
                    'target': str(target),
                    'label': rel_type,
                    'type': rel_type,
                    'properties': properties
                }
            }
    
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid node ID')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/relationships/{rel_id}", response_model=Dict[str, Any])
def update_relationship(rel_id: str, rel_data: RelationshipUpdateRequest, driver: Any = Depends(get_neo4j_driver)):
    """Update a relationship in Neo4j"""
    if not rel_data.type:
        raise HTTPException(status_code=400, detail='Type is required')
    
    try:
        rel_id_int = int(rel_id)
        
        with driver.session() as session:
            # First, get the source and target nodes of the existing relationship
            rel_info = session.run("""
                MATCH (a)-[r]->(b)
                WHERE id(r) = $rel_id
                RETURN id(a) as source_id, id(b) as target_id
            """, rel_id=rel_id_int).single()
            
            if not rel_info:
                raise HTTPException(status_code=404, detail='Relationship not found')
            
            source_id = rel_info['source_id']
            target_id = rel_info['target_id']
            
            # Delete the old relationship
            session.run("""
                MATCH ()-[r]->()
                WHERE id(r) = $rel_id
                DELETE r
            """, rel_id=rel_id_int)
            
            # Create new relationship with updated type and properties
            result = session.run(f"""
                MATCH (a), (b)
                WHERE id(a) = $source_id AND id(b) = $target_id
                CREATE (a)-[r:{rel_data.type}]->(b)
                SET r = $properties
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """, source_id=source_id, target_id=target_id, properties=rel_data.properties)
            
            record = result.single()
            
            rel_id_new = record['id']
            source = record['source']
            target = record['target']
            rel_type = record['type']
            properties = record['properties']
            
            # Add id to properties
            properties['id'] = str(rel_id_new)
            
            return {
                'status': 'success',
                'relationship': {
                    'id': str(rel_id_new),
                    'source': str(source),
                    'target': str(target),
                    'label': rel_type,
                    'type': rel_type,
                    'properties': properties
                }
            }
    
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid relationship ID')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/relationships/{rel_id}", response_model=Dict[str, str])
def delete_relationship(rel_id: str, driver: Any = Depends(get_neo4j_driver)):
    """Delete a relationship from Neo4j"""
    try:
        rel_id_int = int(rel_id)
        
        with driver.session() as session:
            # Delete relationship
            result = session.run("""
                MATCH ()-[r]->()
                WHERE id(r) = $rel_id
                DELETE r
                RETURN count(r) as count
            """, rel_id=rel_id_int)
            
            record = result.single()
            
            if record['count'] == 0:
                raise HTTPException(status_code=404, detail='Relationship not found')
            
            return {'status': 'success', 'message': 'Relationship deleted successfully'}
    
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid relationship ID')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cypher", response_model=Dict[str, Any])
def run_cypher(cypher_data: CypherRequest, driver: Any = Depends(get_neo4j_driver)):
    """Run a Cypher query"""
    if not cypher_data.query:
        raise HTTPException(status_code=400, detail='Cypher query is required')
    
    try:
        with driver.session() as session:
            result = session.run(cypher_data.query)
            
            # Process results
            records = []
            for record in result:
                records.append(record.data())
            
            return {
                'status': 'success',
                'records': records
            }
    
    except exceptions.CypherSyntaxError as e:
        raise HTTPException(status_code=400, detail=f'Cypher syntax error: {str(e)}')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=5000, reload=True)