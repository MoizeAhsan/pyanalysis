"""
Dependency Graph Builder using NetworkX for analyzing code relationships
"""

import logging
from typing import List, Dict, Optional, Any
import networkx as nx  # type: ignore

from models.core import (
    CodeElement,
    ElementType,
    DependencyGraph,
    GraphNode,
    GraphEdge,
    GraphMetrics,
)

logger = logging.getLogger(__name__)


class DependencyGraphBuilder:
    """
    Builds dependency graphs from code elements using NetworkX
    """

    def __init__(self) -> None:
        self.graph: nx.DiGraph = nx.DiGraph()
        self.element_map: Dict[str, CodeElement] = {}

    def build_graph(self, code_elements: List[CodeElement]) -> DependencyGraph:
        """
        Build dependency graph from code elements

        Args:
            code_elements: List of code elements to analyze

        Returns:
            DependencyGraph with nodes, edges, and metrics
        """
        logger.info("Building dependency graph from %d code elements", len(code_elements))

        # Reset graph for new analysis
        self.graph.clear()
        self.element_map.clear()

        # Index elements by ID for quick lookup
        for element in code_elements:
            self.element_map[element.id] = element

        # Add nodes to graph
        self._add_nodes(code_elements)

        # Add edges based on import relationships
        self._add_import_edges(code_elements)

        # Build the dependency graph structure
        dependency_graph = self._build_dependency_graph_structure()

        # Calculate metrics
        dependency_graph.metrics = self._calculate_metrics()

        logger.info(
            "Dependency graph built: %d nodes, %d edges",
            len(dependency_graph.nodes),
            len(dependency_graph.edges),
        )

        return dependency_graph

    def _add_nodes(self, code_elements: List[CodeElement]) -> None:
        """Add nodes to the NetworkX graph"""
        for element in code_elements:
            # Add node with element metadata
            self.graph.add_node(
                element.id,
                name=element.name,
                type=element.type.value,
                file_path=element.location.file_path,
                line_number=element.location.line_number,
                element_type=element.type,
            )

    def _add_import_edges(self, code_elements: List[CodeElement]) -> None:
        """Add edges based on import relationships"""
        for element in code_elements:
            if element.type == ElementType.IMPORT:
                self._process_import_element(element)

    def _process_import_element(self, import_element: CodeElement) -> None:
        """Process a single import element and create edges"""
        source_file = import_element.location.file_path

        # Find the module that contains this import
        source_module_id = self._find_module_for_file(source_file)
        if not source_module_id:
            return

        # Process each dependency
        for dependency in import_element.dependencies:
            # Try to find the target module/element
            target_ids = self._find_dependency_targets(dependency)

            for target_id in target_ids:
                if target_id != source_module_id:  # Don't create self-loops
                    self.graph.add_edge(
                        source_module_id,
                        target_id,
                        relationship_type="import",
                        import_name=dependency,
                        line_number=import_element.location.line_number,
                    )

    def _find_module_for_file(self, file_path: str) -> Optional[str]:
        """Find the module ID for a given file path"""
        for element_id, element in self.element_map.items():
            if (element.type == ElementType.MODULE and
                element.location.file_path == file_path):
                return element_id
        return None

    def _find_dependency_targets(self, dependency: str) -> List[str]:
        """Find target elements for a dependency string"""
        targets = []

        # Look for exact matches in modules first
        for element_id, element in self.element_map.items():
            if element.type == ElementType.MODULE:
                # Check if module name matches dependency
                if self._module_matches_dependency(element, dependency):
                    targets.append(element_id)

        # If no module matches, look for classes/functions
        if not targets:
            for element_id, element in self.element_map.items():
                if element.type in [ElementType.CLASS, ElementType.FUNCTION]:
                    if element.name == dependency or dependency.endswith(f".{element.name}"):
                        targets.append(element_id)

        return targets

    def _module_matches_dependency(self, module_element: CodeElement, dependency: str) -> bool:
        """Check if a module element matches a dependency string"""
        module_name = module_element.name
        file_path = module_element.location.file_path

        # Direct name match
        if module_name == dependency:
            return True

        # Check if dependency matches the module path structure
        if dependency in file_path:
            return True

        # Check for package.module patterns
        if "." in dependency:
            parts = dependency.split(".")
            if module_name == parts[-1]:  # Last part matches module name
                return True

        return False

    def _build_dependency_graph_structure(self) -> DependencyGraph:
        """Build the DependencyGraph structure from NetworkX graph"""
        nodes = {}
        edges = []

        # Convert NetworkX nodes to GraphNode objects
        for node_id in self.graph.nodes():
            node_data = self.graph.nodes[node_id]
            graph_node = GraphNode(
                id=node_id,
                name=node_data.get("name", ""),
                type=ElementType(node_data.get("type", "module")),
                metadata={
                    "file_path": node_data.get("file_path", ""),
                    "line_number": node_data.get("line_number", 0),
                    "degree": self.graph.degree(node_id),
                    "in_degree": self.graph.in_degree(node_id),
                    "out_degree": self.graph.out_degree(node_id),
                }
            )
            nodes[node_id] = graph_node

        # Convert NetworkX edges to GraphEdge objects
        for source, target in self.graph.edges():
            edge_data = self.graph.edges[source, target]
            graph_edge = GraphEdge(
                source=source,
                target=target,
                relationship_type=edge_data.get("relationship_type", "import"),
                weight=1.0,
            )
            edges.append(graph_edge)

        return DependencyGraph(nodes=nodes, edges=edges)

    def _calculate_metrics(self) -> GraphMetrics:
        """Calculate basic graph metrics"""
        node_count = self.graph.number_of_nodes()
        edge_count = self.graph.number_of_edges()

        # Calculate density (ratio of actual edges to possible edges)
        density = 0.0
        if node_count > 1:
            max_edges = node_count * (node_count - 1)  # Directed graph
            density = edge_count / max_edges if max_edges > 0 else 0.0

        # Calculate average degree
        avg_degree = 0.0
        if node_count > 0:
            total_degree = sum(dict(self.graph.degree()).values())
            avg_degree = total_degree / node_count

        return GraphMetrics(
            node_count=node_count,
            edge_count=edge_count,
            density=density,
            avg_degree=avg_degree,
        )

    def detect_cycles(self) -> List[List[str]]:
        """
        Detect circular dependencies in the graph

        Returns:
            List of cycles, where each cycle is a list of node IDs
        """
        try:
            cycles = list(nx.simple_cycles(self.graph))
            logger.info("Found %d circular dependencies", len(cycles))
            return cycles
        except nx.NetworkXError as e:
            logger.error("NetworkX error detecting cycles: %s", e)
            return []
        except Exception as e:
            logger.error("Unexpected error detecting cycles: %s", e)
            return []

    def get_strongly_connected_components(self) -> List[List[str]]:
        """
        Get strongly connected components (groups of mutually dependent modules)

        Returns:
            List of strongly connected components
        """
        try:
            components = list(nx.strongly_connected_components(self.graph))
            # Filter out single-node components (not interesting for dependencies)
            multi_node_components = [list(comp) for comp in components if len(comp) > 1]
            logger.info("Found %d strongly connected components", len(multi_node_components))
            return multi_node_components
        except nx.NetworkXError as e:
            logger.error("NetworkX error finding strongly connected components: %s", e)
            return []
        except Exception as e:
            logger.error("Unexpected error finding strongly connected components: %s", e)
            return []

    def get_node_centrality(self) -> Dict[str, float]:
        """
        Calculate node centrality measures

        Returns:
            Dictionary mapping node IDs to centrality scores
        """
        try:
            # Use PageRank as a measure of node importance
            centrality: Dict[str, float] = nx.pagerank(self.graph)
            return centrality
        except nx.NetworkXError as e:
            logger.error("NetworkX error calculating centrality: %s", e)
            return {}
        except Exception as e:
            logger.error("Unexpected error calculating centrality: %s", e)
            return {}

    def get_graph_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the dependency graph

        Returns:
            Dictionary with graph summary statistics
        """
        metrics = self._calculate_metrics()
        cycles = self.detect_cycles()
        components = self.get_strongly_connected_components()

        # Count elements by type
        type_counts: Dict[str, int] = {}
        for node_id in self.graph.nodes():
            node_type = self.graph.nodes[node_id].get("type", "unknown")
            type_counts[node_type] = type_counts.get(node_type, 0) + 1

        return {
            "total_nodes": metrics.node_count,
            "total_edges": metrics.edge_count,
            "density": metrics.density,
            "average_degree": metrics.avg_degree,
            "circular_dependencies": len(cycles),
            "strongly_connected_components": len(components),
            "element_type_counts": type_counts,
            "has_cycles": len(cycles) > 0,
        }
