from flask import Flask, request, jsonify
from flask_cors import CORS
from neo4j import GraphDatabase, exceptions
import json

app = Flask(__name__)
CORS(app)

# Global Neo4j driver instance
neo4j_driver = None

@app.route('/api/connect', methods=['POST'])
def connect_to_neo4j():
    """Connect to Neo4j database"""
    global neo4j_driver
    
    data = request.get_json()
    uri = data.get('uri')
    user = data.get('user')
    password = data.get('password')
    
    try:
        # Close existing connection if any
        if neo4j_driver:
            neo4j_driver.close()
        
        # Create new driver
        neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
        
        # Verify connection
        with neo4j_driver.session() as session:
            session.run("MATCH (n) RETURN count(n) LIMIT 1")
        
        return jsonify({'status': 'success', 'message': 'Connected to Neo4j successfully'})
    
    except exceptions.AuthError:
        return jsonify({'status': 'error', 'message': 'Authentication failed'}), 401
    except exceptions.ServiceUnavailable:
        return jsonify({'status': 'error', 'message': 'Could not connect to Neo4j'}), 503
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/disconnect', methods=['POST'])
def disconnect_from_neo4j():
    """Disconnect from Neo4j database"""
    global neo4j_driver
    
    try:
        if neo4j_driver:
            neo4j_driver.close()
            neo4j_driver = None
        
        return jsonify({'status': 'success', 'message': 'Disconnected from Neo4j successfully'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/graph', methods=['GET'])
def get_graph():
    """Get the entire graph from Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    try:
        with neo4j_driver.session() as session:
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
                
                nodes.append({
                    'group': 'nodes',
                    'data': {
                        'id': str(node_id),
                        'label': label,
                        'properties': properties
                    }
                })
            
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
                        'properties': properties
                    }
                })
            
            return jsonify({
                'status': 'success',
                'nodes': nodes,
                'edges': edges
            })
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    """Get all nodes from Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    try:
        with neo4j_driver.session() as session:
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
            
            return jsonify({
                'status': 'success',
                'nodes': nodes
            })
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodes/<node_id>', methods=['GET'])
def get_node(node_id):
    """Get a specific node by ID"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    try:
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (n)
                WHERE id(n) = $node_id
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
            """, node_id=int(node_id))
            
            record = result.single()
            
            if not record:
                return jsonify({'status': 'error', 'message': 'Node not found'}), 404
            
            node_id = record['id']
            labels = record['labels']
            properties = record['properties']
            
            # Use the first label as the main label
            label = labels[0] if labels else 'Node'
            
            # Add id to properties
            properties['id'] = str(node_id)
            
            return jsonify({
                'status': 'success',
                'node': {
                    'id': str(node_id),
                    'label': label,
                    'labels': labels,
                    'properties': properties
                }
            })
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid node ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodes', methods=['POST'])
def create_node():
    """Create a new node in Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    data = request.get_json()
    label = data.get('label')
    properties = data.get('properties', {})
    
    if not label:
        return jsonify({'status': 'error', 'message': 'Label is required'}), 400
    
    try:
        with neo4j_driver.session() as session:
            # Create node with label and properties
            result = session.run(f"""
                CREATE (n:{label})
                SET n = $properties
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
            """, properties=properties)
            
            record = result.single()
            
            node_id = record['id']
            labels = record['labels']
            properties = record['properties']
            
            # Use the first label as the main label
            label = labels[0] if labels else 'Node'
            
            # Add id to properties
            properties['id'] = str(node_id)
            
            return jsonify({
                'status': 'success',
                'node': {
                    'id': str(node_id),
                    'label': label,
                    'labels': labels,
                    'properties': properties
                }
            })
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodes/<node_id>', methods=['PUT'])
def update_node(node_id):
    """Update a node in Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    data = request.get_json()
    label = data.get('label')
    new_labels = data.get('labels', [])
    properties = data.get('properties', {})
    
    try:
        with neo4j_driver.session() as session:
            # First, remove all existing labels
            session.run("""
                MATCH (n)
                WHERE id(n) = $node_id
                REMOVE n:*
            """, node_id=int(node_id))
            
            # Add new labels and set properties
            labels_str = ':'.join(new_labels) if new_labels else label
            result = session.run(f"""
                MATCH (n)
                WHERE id(n) = $node_id
                SET n:{labels_str}, n = $properties
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
            """, node_id=int(node_id), properties=properties)
            
            record = result.single()
            
            if not record:
                return jsonify({'status': 'error', 'message': 'Node not found'}), 404
            
            node_id = record['id']
            labels = record['labels']
            properties = record['properties']
            
            # Use the first label as the main label
            label = labels[0] if labels else 'Node'
            
            # Add id to properties
            properties['id'] = str(node_id)
            
            return jsonify({
                'status': 'success',
                'node': {
                    'id': str(node_id),
                    'label': label,
                    'labels': labels,
                    'properties': properties
                }
            })
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid node ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodes/<node_id>', methods=['DELETE'])
def delete_node(node_id):
    """Delete a node from Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    try:
        with neo4j_driver.session() as session:
            # Delete node and all relationships
            result = session.run("""
                MATCH (n)
                WHERE id(n) = $node_id
                DETACH DELETE n
                RETURN count(n) as count
            """, node_id=int(node_id))
            
            record = result.single()
            
            if record['count'] == 0:
                return jsonify({'status': 'error', 'message': 'Node not found'}), 404
            
            return jsonify({'status': 'success', 'message': 'Node deleted successfully'})
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid node ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodes/batch', methods=['POST'])
def batch_update_nodes():
    """Batch update nodes in Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    data = request.get_json()
    node_ids = data.get('node_ids', [])
    property_key = data.get('property_key')
    property_value = data.get('property_value')
    
    if not node_ids or not property_key:
        return jsonify({'status': 'error', 'message': 'Node IDs and property key are required'}), 400
    
    try:
        with neo4j_driver.session() as session:
            # Convert node IDs to integers
            node_ids_int = [int(id) for id in node_ids]
            
            # Update nodes
            result = session.run("""
                MATCH (n)
                WHERE id(n) IN $node_ids
                SET n[$property_key] = $property_value
                RETURN count(n) as count
            """, node_ids=node_ids_int, property_key=property_key, property_value=property_value)
            
            record = result.single()
            
            return jsonify({
                'status': 'success',
                'message': f'Updated {record["count"]} nodes',
                'count': record['count']
            })
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid node ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/relationships', methods=['GET'])
def get_relationships():
    """Get all relationships from Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    try:
        with neo4j_driver.session() as session:
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
            
            return jsonify({
                'status': 'success',
                'relationships': relationships
            })
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/relationships/<rel_id>', methods=['GET'])
def get_relationship(rel_id):
    """Get a specific relationship by ID"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    try:
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (a)-[r]->(b)
                WHERE id(r) = $rel_id
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """, rel_id=int(rel_id))
            
            record = result.single()
            
            if not record:
                return jsonify({'status': 'error', 'message': 'Relationship not found'}), 404
            
            rel_id = record['id']
            source = record['source']
            target = record['target']
            rel_type = record['type']
            properties = record['properties']
            
            # Add id to properties
            properties['id'] = str(rel_id)
            
            return jsonify({
                'status': 'success',
                'relationship': {
                    'id': str(rel_id),
                    'source': str(source),
                    'target': str(target),
                    'label': rel_type,
                    'type': rel_type,
                    'properties': properties
                }
            })
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid relationship ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/relationships', methods=['POST'])
def create_relationship():
    """Create a new relationship in Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    data = request.get_json()
    source_id = data.get('source')
    target_id = data.get('target')
    rel_type = data.get('type')
    properties = data.get('properties', {})
    
    if not source_id or not target_id or not rel_type:
        return jsonify({'status': 'error', 'message': 'Source, target, and type are required'}), 400
    
    try:
        with neo4j_driver.session() as session:
            # Create relationship
            result = session.run(f"""
                MATCH (a), (b)
                WHERE id(a) = $source_id AND id(b) = $target_id
                CREATE (a)-[r:{rel_type}]->(b)
                SET r = $properties
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """, source_id=int(source_id), target_id=int(target_id), properties=properties)
            
            record = result.single()
            
            if not record:
                return jsonify({'status': 'error', 'message': 'One or both nodes not found'}), 404
            
            rel_id = record['id']
            source = record['source']
            target = record['target']
            rel_type = record['type']
            properties = record['properties']
            
            # Add id to properties
            properties['id'] = str(rel_id)
            
            return jsonify({
                'status': 'success',
                'relationship': {
                    'id': str(rel_id),
                    'source': str(source),
                    'target': str(target),
                    'label': rel_type,
                    'type': rel_type,
                    'properties': properties
                }
            })
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid node ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/relationships/<rel_id>', methods=['PUT'])
def update_relationship(rel_id):
    """Update a relationship in Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    data = request.get_json()
    rel_type = data.get('type')
    properties = data.get('properties', {})
    
    if not rel_type:
        return jsonify({'status': 'error', 'message': 'Type is required'}), 400
    
    try:
        with neo4j_driver.session() as session:
            # First, delete the old relationship
            session.run("""
                MATCH ()-[r]->()
                WHERE id(r) = $rel_id
                DELETE r
            """, rel_id=int(rel_id))
            
            # Create new relationship with updated type and properties
            result = session.run(f"""
                MATCH (a), (b)
                WHERE (a)-[]->(b) AND id(a) = $source_id AND id(b) = $target_id
                CREATE (a)-[r:{rel_type}]->(b)
                SET r = $properties
                RETURN id(r) as id, id(a) as source, id(b) as target, type(r) as type, properties(r) as properties
            """, rel_id=int(rel_id), properties=properties)
            
            record = result.single()
            
            if not record:
                return jsonify({'status': 'error', 'message': 'Relationship not found'}), 404
            
            rel_id = record['id']
            source = record['source']
            target = record['target']
            rel_type = record['type']
            properties = record['properties']
            
            # Add id to properties
            properties['id'] = str(rel_id)
            
            return jsonify({
                'status': 'success',
                'relationship': {
                    'id': str(rel_id),
                    'source': str(source),
                    'target': str(target),
                    'label': rel_type,
                    'type': rel_type,
                    'properties': properties
                }
            })
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid relationship ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/relationships/<rel_id>', methods=['DELETE'])
def delete_relationship(rel_id):
    """Delete a relationship from Neo4j"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    try:
        with neo4j_driver.session() as session:
            # Delete relationship
            result = session.run("""
                MATCH ()-[r]->()
                WHERE id(r) = $rel_id
                DELETE r
                RETURN count(r) as count
            """, rel_id=int(rel_id))
            
            record = result.single()
            
            if record['count'] == 0:
                return jsonify({'status': 'error', 'message': 'Relationship not found'}), 404
            
            return jsonify({'status': 'success', 'message': 'Relationship deleted successfully'})
    
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid relationship ID'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/cypher', methods=['POST'])
def run_cypher():
    """Run a Cypher query"""
    global neo4j_driver
    
    if not neo4j_driver:
        return jsonify({'status': 'error', 'message': 'Not connected to Neo4j'}), 400
    
    data = request.get_json()
    query = data.get('query')
    
    if not query:
        return jsonify({'status': 'error', 'message': 'Cypher query is required'}), 400
    
    try:
        with neo4j_driver.session() as session:
            result = session.run(query)
            
            # Process results
            records = []
            for record in result:
                records.append(record.data())
            
            return jsonify({
                'status': 'success',
                'records': records
            })
    
    except exceptions.CypherSyntaxError as e:
        return jsonify({'status': 'error', 'message': f'Cypher syntax error: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
