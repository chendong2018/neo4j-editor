# Neo4j Visual Editor

A visual editor for Neo4j graph database that allows users to create, edit, and manage nodes and relationships without writing Cypher queries manually.

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
